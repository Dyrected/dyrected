import { DatabaseAdapter, PaginatedResult, parseSort } from '@dyrected/core';
import { MongoClient, Db, ObjectId, type SortDirection } from 'mongodb';

export interface MongoAdapterConfig {
  url: string;
  dbName: string;
}

function normalizeMongoSort(sort: string | undefined): Record<string, SortDirection> {
  return Object.fromEntries(
    parseSort(sort).map(({ field, direction }) => {
      const mongoDirection: SortDirection = direction === 'DESC' ? -1 : 1;
      return [field, mongoDirection];
    }),
  ) as Record<string, SortDirection>;
}

export class MongoAdapter implements DatabaseAdapter {
  private client: MongoClient;
  private db!: Db;

  constructor(config: MongoAdapterConfig) {
    this.client = new MongoClient(config.url);
    this.init(config.dbName);
  }

  private async init(dbName: string) {
    await this.client.connect();
    this.db = this.client.db(dbName);
  }

  private getCollectionName(slug: string) {
    return `collection_${slug}`;
  }

  private getGlobalCollection() {
    return this.db.collection('dyrected_globals');
  }

  async find(args: { collection: string; where?: any; limit?: number; page?: number; sort?: string }): Promise<PaginatedResult> {
    const col = this.db.collection(this.getCollectionName(args.collection));
    const limit = args.limit || 10;
    const page = args.page || 1;
    const skip = (page - 1) * limit;

    const query = args.where || {};
    const total = await col.countDocuments(query);
    
    const sortObj = normalizeMongoSort(args.sort);

    const cursor = col.find(query).sort(sortObj).skip(skip).limit(limit);
    const docs = await cursor.toArray();

    const totalPages = Math.ceil(total / limit);

    return {
      docs: docs.map(doc => {
        const { _id, ...rest } = doc;
        return { id: _id.toString(), ...rest };
      }),
      total,
      limit,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  async findOne(params: { collection: string; id: string }) {
    const col = this.db.collection(this.getCollectionName(params.collection));
    const query = { _id: this.toObjectId(params.id) as any };
    const doc = await col.findOne(query);
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: _id.toString(), ...rest };
  }

  async create(params: { collection: string; data: any }) {
    const col = this.db.collection(this.getCollectionName(params.collection));
    const res = await col.insertOne(params.data);
    return { id: res.insertedId.toString(), ...params.data };
  }

  async update(params: { collection: string; id: string; data: any }) {
    const col = this.db.collection(this.getCollectionName(params.collection));
    const { id, ...updateData } = params.data;
    await col.updateOne(
      { _id: this.toObjectId(params.id) as any },
      { $set: updateData }
    );
    return { id: params.id, ...updateData };
  }

  async delete(params: { collection: string; id: string }) {
    const col = this.db.collection(this.getCollectionName(params.collection));
    await col.deleteOne({ _id: this.toObjectId(params.id) as any });
  }

  async getGlobal(params: { slug: string }) {
    const col = this.getGlobalCollection();
    const doc = await col.findOne({ slug: params.slug });
    if (!doc) return {};
    const { _id, slug, ...data } = doc;
    return data;
  }

  async updateGlobal(params: { slug: string; data: any }) {
    const col = this.getGlobalCollection();
    await col.updateOne(
      { slug: params.slug },
      { $set: params.data },
      { upsert: true }
    );
    return params.data;
  }

  private toObjectId(id: string) {
    try {
      return new ObjectId(id);
    } catch {
      return id; // Fallback for custom string IDs
    }
  }
}

export const mongodbAdapter = (config: MongoAdapterConfig) => new MongoAdapter(config);
