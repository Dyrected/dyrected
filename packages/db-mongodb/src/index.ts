import {
  DatabaseAdapter,
  PaginatedResult,
  CollectionConfig,
  DuplicateKeyError,
  generateDocumentId,
  normalizeGroupKey,
  coerceBooleanWhere,
  parseMongoWhere,
  parseSort,
} from "@dyrected/core";
import {
  MongoClient,
  Db,
  type ClientSession,
  type SortDirection,
} from "mongodb";

export interface MongoAdapterConfig {
  url: string;
  dbName: string;
}

function normalizeMongoSort(
  sort: string | undefined,
): Record<string, SortDirection> {
  return Object.fromEntries(
    parseSort(sort).map(({ field, direction }) => {
      const mongoDirection: SortDirection = direction === "DESC" ? -1 : 1;
      return [field, mongoDirection];
    }),
  ) as Record<string, SortDirection>;
}

function isNumericOp(val: unknown): val is { increment?: number; decrement?: number } {
  return (
    typeof val === "object" &&
    val !== null &&
    !Array.isArray(val) &&
    ("increment" in val || "decrement" in val)
  );
}

/** Translate a native MongoDB duplicate key error (code 11000) into a DuplicateKeyError. */
function rethrowDuplicateKey(err: any): never {
  if (err && err.code === 11000) {
    const keyValue = err.keyValue as Record<string, unknown> | undefined;
    const field = keyValue ? Object.keys(keyValue).join(", ") : undefined;
    const value = keyValue && field ? (Object.keys(keyValue).length === 1 ? keyValue[field] : keyValue) : undefined;
    throw new DuplicateKeyError(err.message, { field, value });
  }
  throw err;
}

export class MongoAdapter implements DatabaseAdapter {
  private client: MongoClient;
  private db!: Db;
  private session?: ClientSession;
  private initPromise: Promise<void> | null = null;
  private config: MongoAdapterConfig;
  private collectionConfigs = new Map<string, CollectionConfig>();

  constructor(config: MongoAdapterConfig) {
    this.config = config;
    this.client = new MongoClient(config.url);
  }

  private async init(dbName: string) {
    await this.client.connect();
    this.db = this.client.db(dbName);
  }

  private async ensureInitialized() {
    if (!this.initPromise) {
      this.initPromise = this.init(this.config.dbName);
    }
    await this.initPromise;
  }

  private getCollectionName(slug: string) {
    return `collection_${slug}`;
  }

  private getGlobalCollection() {
    return this.db.collection("dyrected_globals");
  }

  async find(args: {
    collection: string;
    where?: any;
    limit?: number;
    page?: number;
    sort?: string;
  }): Promise<PaginatedResult> {
    await this.ensureInitialized();
    const col = this.db.collection(this.getCollectionName(args.collection));
    const limit = args.limit || 10;
    const page = args.page || 1;
    const skip = (page - 1) * limit;

    const query = args.where ? this.buildFilter(args.collection, args.where) : {};
    const total = await col.countDocuments(query, { session: this.session });

    const sortObj = normalizeMongoSort(args.sort);

    const cursor = col
      .find(query, { session: this.session })
      .sort(sortObj)
      .skip(skip)
      .limit(limit);
    const docs = await cursor.toArray();

    const totalPages = Math.ceil(total / limit);

    return {
      docs: docs.map((doc) => {
        const { _id, ...rest } = doc;
        return { id: _id.toString(), ...rest };
      }),
      total,
      limit,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findOne(params: {
    collection: string;
    id?: string;
    where?: Record<string, unknown>;
    lock?: "for-update";
  }) {
    await this.ensureInitialized();
    const col = this.db.collection(this.getCollectionName(params.collection));
    // `lock` is a no-op: MongoDB takes document-level write locks inside transactions,
    // and a conflicting concurrent write aborts and retries the transaction.
    if (params.id === undefined && !params.where) {
      throw new Error("findOne requires either id or where");
    }
    const query: Record<string, any> = params.where ? this.buildFilter(params.collection, params.where) : {};
    if (params.id !== undefined) query._id = params.id;
    const doc = await col.findOne(query, { session: this.session });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: _id.toString(), ...rest };
  }

  async create(params: { collection: string; data: any }) {
    await this.ensureInitialized();
    const col = this.db.collection(this.getCollectionName(params.collection));
    const { id, ...data } = params.data;
    // IDs are always strings, generated the same way as the SQL adapters.
    const generatedId =
      (id as string | undefined) ?? generateDocumentId(this.collectionConfigs.get(params.collection) ?? params.collection);
    const document = { _id: generatedId as any, ...data };
    const res = await col
      .insertOne(document, { session: this.session })
      .catch(rethrowDuplicateKey);
    return { id: generatedId, ...data };
  }

  async update(params: {
    collection: string;
    id?: string;
    where?: Record<string, unknown>;
    data: any;
  }) {
    await this.ensureInitialized();
    const col = this.db.collection(this.getCollectionName(params.collection));
    if (params.id === undefined && !params.where) {
      throw new Error("update requires either id or where clause");
    }

    const filter: Record<string, any> = params.where ? this.buildFilter(params.collection, params.where) : {};
    if (params.id !== undefined) filter._id = params.id;

    const { id, createdAt, updatedAt, ...updateData } = params.data;
    const $set: Record<string, any> = {};
    const $inc: Record<string, number> = {};
    for (const [key, val] of Object.entries(updateData)) {
      if (isNumericOp(val)) {
        $inc[key] = Number((val.increment ?? 0) - (val.decrement ?? 0));
      } else {
        $set[key] = val;
      }
    }

    const update: Record<string, any> = {};
    if (Object.keys($set).length > 0) update.$set = $set;
    if (Object.keys($inc).length > 0) update.$inc = $inc;

    // Single atomic findOneAndUpdate: the filter and the modification are applied together,
    // so conditional updates (e.g. balance >= amount) cannot race.
    const updated =
      Object.keys(update).length > 0
        ? await col
            .findOneAndUpdate(filter, update, { session: this.session, returnDocument: "after" })
            .catch(rethrowDuplicateKey)
        : await col.findOne(filter, { session: this.session });

    if (!updated) {
      return { id: params.id, ...$set, affectedRows: 0 } as any;
    }
    const { _id, ...rest } = updated;
    return { id: _id.toString(), ...rest, affectedRows: 1 };
  }

  async delete(params: { collection: string; id: string }) {
    await this.ensureInitialized();
    const col = this.db.collection(this.getCollectionName(params.collection));
    await col.deleteOne(
      { _id: params.id as any },
      { session: this.session },
    );
  }

  async getGlobal(params: { slug: string }) {
    await this.ensureInitialized();
    const col = this.getGlobalCollection();
    const doc = await col.findOne(
      { slug: params.slug },
      { session: this.session },
    );
    if (!doc) return {};
    const { _id, slug, ...data } = doc;
    return data;
  }

  async updateGlobal(params: { slug: string; data: any }) {
    await this.ensureInitialized();
    const col = this.getGlobalCollection();
    await col.updateOne(
      { slug: params.slug },
      { $set: params.data },
      { upsert: true, session: this.session },
    );
    return params.data;
  }

  async sync(collections: CollectionConfig[]): Promise<void> {
    await this.ensureInitialized();
    for (const config of collections) {
      this.collectionConfigs.set(config.slug, config);
      const col = this.db.collection(this.getCollectionName(config.slug));

      for (const field of config.fields ?? []) {
        if (!(field as any).unique) continue;
        await col.createIndex(
          { [field.name as string]: 1 },
          { unique: true, sparse: true, name: `uniq_${config.slug}_${field.name}` },
        );
      }

      for (const idx of config.indexes ?? []) {
        if (!Array.isArray(idx.fields) || idx.fields.length === 0) continue;
        const isUnique = Boolean(idx.unique);
        await col.createIndex(
          Object.fromEntries(idx.fields.map((f: string) => [f, 1 as const])),
          {
            unique: isUnique,
            // The driver sends an explicit `sparse: undefined` as null, which the server rejects.
            ...(idx.sparse !== undefined ? { sparse: idx.sparse } : {}),
            name: idx.name || `${isUnique ? "uniq" : "idx"}_${config.slug}_${idx.fields.join("_")}`,
          },
        );
      }
    }
  }

  async transaction<T>(
    callback: (db: DatabaseAdapter) => Promise<T>,
  ): Promise<T> {
    await this.ensureInitialized();
    const session = this.client.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        const scoped = Object.create(this) as MongoAdapter;
        scoped.session = session;
        result = await callback(scoped);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  /** Translate a where clause to a Mongo filter, mapping the public `id` field to `_id`. */
  private buildFilter(collection: string, where: Record<string, unknown>): Record<string, any> {
    const filter = parseMongoWhere(
      coerceBooleanWhere(where, this.collectionConfigs.get(collection)?.fields),
    );
    const mapId = (node: any): any => {
      if (Array.isArray(node)) return node.map(mapId);
      if (!node || typeof node !== "object") return node;
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(node)) {
        if (k === "id") {
          out._id = v;
        } else {
          out[k] = mapId(v);
        }
      }
      return out;
    };
    return mapId(filter);
  }

  async aggregate(args: {
    collection: string;
    aggregates: Record<string, any>;
    groupBy?: string;
  }): Promise<Record<string, any>> {
    if (Object.keys(args.aggregates).length === 0) {
      return {};
    }

    await this.ensureInitialized();
    const col = this.db.collection(this.getCollectionName(args.collection));

    /** Map a Dyrected cast type to the MongoDB $convert target type name. */
    const castToMongoType: Record<string, string> = {
      number: "double",
      float: "double",
      integer: "int",
      string: "string",
      boolean: "bool",
      date: "date",
    };

    const wrapCast = (fieldExpr: string, cast?: string) => {
      const castType = cast ? castToMongoType[cast] : null;
      if (!castType) return `$${fieldExpr}`;
      return {
        $convert: {
          input: `$${fieldExpr}`,
          to: castType,
          onError: null,
          onNull: null,
        },
      };
    };

    /** Build the $group accumulator expression for one named aggregate. */
    const buildGroupAccumulator = (op: Record<string, any>) => {
      if ("countDistinct" in op && typeof op.countDistinct === "string") {
        return { result: { $addToSet: `$${op.countDistinct}` } };
      }
      if ("distinct" in op && typeof op.distinct === "string") {
        return { result: { $addToSet: `$${op.distinct}` } };
      }
      if ("count" in op) return { result: { $sum: 1 } };
      if (op.sum) {
        const val = wrapCast(op.sum, op.cast);
        return {
          result: { $sum: val },
          hasValid: {
            $sum: {
              $cond: [{ $isNumber: val }, 1, 0],
            },
          },
        };
      }
      if (op.avg) return { result: { $avg: wrapCast(op.avg, op.cast) } };
      if (op.min) return { result: { $min: wrapCast(op.min, op.cast) } };
      if (op.max) return { result: { $max: wrapCast(op.max, op.cast) } };
      return { result: { $sum: 1 } };
    };

    if (args.groupBy) {
      const groupField = args.groupBy;
      const groupFieldType = (this.collectionConfigs.get(args.collection)?.fields ?? []).find(
        (f) => f.name === groupField,
      )?.type;
      const keyOf = (id: unknown) => normalizeGroupKey(id, groupFieldType);

      // Each aggregate can carry its own `where`, so it gets its own pipeline; the results are
      // merged by group key. A separate unfiltered pass supplies the full set of groups, so a
      // group with no matching rows for some aggregate still appears (as 0, [] or null).
      const universe = await col
        .aggregate([{ $group: { _id: `$${groupField}` } }], { session: this.session })
        .toArray();

      const perAggregate = new Map<string, Map<string, any>>();
      for (const [name, op] of Object.entries(args.aggregates)) {
        const match =
          op.where && Object.keys(op.where).length > 0 ? [{ $match: this.buildFilter(args.collection, op.where) }] : [];
        const docs = await col
          .aggregate(
            [...match, { $group: { _id: `$${groupField}`, ...buildGroupAccumulator(op) } }],
            { session: this.session },
          )
          .toArray();
        perAggregate.set(name, new Map(docs.map((d) => [keyOf(d._id), d])));
      }

      const groups: Record<string, Record<string, any>> = {};
      for (const g of universe) {
        const key = keyOf(g._id);
        const groupResult: Record<string, any> = {};
        for (const [name, op] of Object.entries(args.aggregates)) {
          const doc = perAggregate.get(name)?.get(key);
          if ("countDistinct" in op) {
            const rawSet = (doc?.result ?? []) as any[];
            groupResult[name] = rawSet.filter((v) => v !== null && v !== undefined).length;
          } else if ("distinct" in op) {
            const rawSet = (doc?.result ?? []) as any[];
            groupResult[name] = rawSet.filter((v) => v !== null && v !== undefined);
          } else if (!doc) {
            groupResult[name] = "count" in op ? 0 : null;
          } else if (op.sum && doc.hasValid === 0) {
            groupResult[name] = null;
          } else {
            groupResult[name] = doc.result ?? ("count" in op ? 0 : null);
          }
        }
        groups[key] = groupResult;
      }
      return { groups };
    }

    // Build a $facet stage where every named aggregate runs in its own sub-pipeline.
    const facets: Record<string, any[]> = {};
    for (const [name, op] of Object.entries(args.aggregates)) {
      const matchStage =
        op.where && Object.keys(op.where).length > 0
          ? [{ $match: this.buildFilter(args.collection, op.where) }]
          : [];

      facets[name] = [
        ...matchStage,
        { $group: { _id: null, ...buildGroupAccumulator(op) } },
      ];
    }

    const [raw] = await col.aggregate(
      [{ $facet: facets }],
      { session: this.session },
    ).toArray();

    // Flatten: $facet returns { name: [{ _id: null, result: value, hasValid?: number }] | [] }
    const result: Record<string, any> = {};
    for (const name of Object.keys(args.aggregates)) {
      const op = args.aggregates[name];
      const facetDocs: any[] = raw?.[name] ?? [];
      const doc = facetDocs[0];
      if (!doc) {
        if ("distinct" in op) {
          result[name] = [];
        } else {
          result[name] = ("count" in op || "countDistinct" in op) ? 0 : null;
        }
      } else if ("countDistinct" in op) {
        const rawSet = (doc.result ?? []) as any[];
        result[name] = Array.isArray(rawSet) ? rawSet.filter((v) => v !== null && v !== undefined).length : 0;
      } else if ("distinct" in op) {
        const rawSet = (doc.result ?? []) as any[];
        result[name] = Array.isArray(rawSet) ? rawSet.filter((v) => v !== null && v !== undefined) : [];
      } else if (op.sum && doc.hasValid === 0) {
        result[name] = null;
      } else {
        result[name] = doc.result ?? ("count" in op ? 0 : null);
      }
    }

    return result;
  }

  async disconnect(): Promise<void> {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // Ignore initialization failure during disconnect
      }
    }
    if (this.client) {
      await this.client.close().catch(() => {});
    }
    this.initPromise = null;
  }
}

export const mongodbAdapter = (config: MongoAdapterConfig) =>
  new MongoAdapter(config);
