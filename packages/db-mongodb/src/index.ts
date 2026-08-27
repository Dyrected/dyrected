import {
  DatabaseAdapter,
  PaginatedResult,
  parseMongoWhere,
  parseSort,
} from "@dyrected/core";
import {
  MongoClient,
  Db,
  ObjectId,
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

export class MongoAdapter implements DatabaseAdapter {
  private client: MongoClient;
  private db!: Db;
  private session?: ClientSession;
  private initPromise: Promise<void> | null = null;
  private config: MongoAdapterConfig;

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

    const query = args.where ? parseMongoWhere(args.where) : {};
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

  async findOne(params: { collection: string; id: string }) {
    await this.ensureInitialized();
    const col = this.db.collection(this.getCollectionName(params.collection));
    const query = { _id: this.toObjectId(params.id) as any };
    const doc = await col.findOne(query, { session: this.session });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: _id.toString(), ...rest };
  }

  async create(params: { collection: string; data: any }) {
    await this.ensureInitialized();
    const col = this.db.collection(this.getCollectionName(params.collection));
    const { id, ...data } = params.data;
    const document = id ? { _id: this.toObjectId(id), ...data } : data;
    const res = await col.insertOne(document, { session: this.session });
    return { id: res.insertedId.toString(), ...data };
  }

  async update(params: { collection: string; id: string; data: any }) {
    await this.ensureInitialized();
    const col = this.db.collection(this.getCollectionName(params.collection));
    const { id, ...updateData } = params.data;
    await col.updateOne(
      { _id: this.toObjectId(params.id) as any },
      { $set: updateData },
      { session: this.session },
    );
    const updated = await col.findOne(
      { _id: this.toObjectId(params.id) as any },
      { session: this.session },
    );
    if (!updated) return { id: params.id, ...updateData };
    const { _id, ...rest } = updated;
    return { id: _id.toString(), ...rest };
  }

  async delete(params: { collection: string; id: string }) {
    await this.ensureInitialized();
    const col = this.db.collection(this.getCollectionName(params.collection));
    await col.deleteOne(
      { _id: this.toObjectId(params.id) as any },
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

  private toObjectId(id: string) {
    try {
      return new ObjectId(id);
    } catch {
      return id; // Fallback for custom string IDs
    }
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
      const groupAccumulators: Record<string, any> = {};
      const distinctKeys = new Set<string>();
      const countDistinctKeys = new Set<string>();

      for (const [name, op] of Object.entries(args.aggregates)) {
        if ("countDistinct" in op && typeof op.countDistinct === "string") {
          countDistinctKeys.add(name);
          groupAccumulators[`${name}_set`] = { $addToSet: `$${op.countDistinct}` };
        } else if ("distinct" in op && typeof op.distinct === "string") {
          distinctKeys.add(name);
          groupAccumulators[name] = { $addToSet: `$${op.distinct}` };
        } else if ("count" in op) {
          groupAccumulators[name] = { $sum: 1 };
        } else if (op.sum) {
          const val = wrapCast(op.sum, op.cast);
          groupAccumulators[name] = { $sum: val };
          groupAccumulators[`${name}_hasValid`] = {
            $sum: { $cond: [{ $isNumber: val }, 1, 0] },
          };
        } else if (op.avg) {
          groupAccumulators[name] = { $avg: wrapCast(op.avg, op.cast) };
        } else if (op.min) {
          groupAccumulators[name] = { $min: wrapCast(op.min, op.cast) };
        } else if (op.max) {
          groupAccumulators[name] = { $max: wrapCast(op.max, op.cast) };
        } else {
          groupAccumulators[name] = { $sum: 1 };
        }
      }

      const pipeline: any[] = [
        {
          $group: {
            _id: `$${groupField}`,
            ...groupAccumulators,
          },
        },
      ];

      const rawGroups = await col.aggregate(pipeline, { session: this.session }).toArray();
      const groups: Record<string, Record<string, any>> = {};

      for (const g of rawGroups) {
        const key = g._id === null || g._id === undefined ? "__unassigned__" : String(g._id);
        const groupResult: Record<string, any> = {};
        for (const name of Object.keys(args.aggregates)) {
          const op = args.aggregates[name];
          if (countDistinctKeys.has(name)) {
            const rawSet = (g[`${name}_set`] ?? []) as any[];
            groupResult[name] = rawSet.filter((v) => v !== null && v !== undefined).length;
          } else if (distinctKeys.has(name)) {
            const rawSet = (g[name] ?? []) as any[];
            groupResult[name] = rawSet.filter((v) => v !== null && v !== undefined);
          } else if (op.sum && g[`${name}_hasValid`] === 0) {
            groupResult[name] = null;
          } else {
            groupResult[name] = g[name] ?? ("count" in op ? 0 : null);
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
          ? [{ $match: parseMongoWhere(op.where) }]
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
