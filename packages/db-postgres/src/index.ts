import { DatabaseAdapter, PaginatedResult } from '@dyrected/core';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface PostgresAdapterConfig {
  url: string;
}

export class PostgresAdapter implements DatabaseAdapter {
  private db: any;
  private sql: postgres.Sql;

  constructor(config: PostgresAdapterConfig) {
    this.sql = postgres(config.url);
    this.db = drizzle(this.sql);
    this.initInternalTables();
  }

  private async initInternalTables() {
    await this.sql`
      CREATE TABLE IF NOT EXISTS dyrected_internal (
        key TEXT PRIMARY KEY,
        value JSONB
      )
    `;
  }

  private getTableName(slug: string) {
    return `collection_${slug}`;
  }

  private async ensureTable(slug: string) {
    const tableName = this.getTableName(slug);
    await this.sql`
      CREATE TABLE IF NOT EXISTS ${this.sql(tableName)} (
        id TEXT PRIMARY KEY,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  async find(args: { collection: string; where?: any; limit?: number; page?: number; sort?: string }): Promise<PaginatedResult> {
    await this.ensureTable(args.collection);
    const tableName = this.getTableName(args.collection);
    const limit = args.limit || 10;
    const page = args.page || 1;
    const offset = (page - 1) * limit;

    let whereClause = this.sql``;
    if (args.where) {
      const conditions = Object.entries(args.where).map(([key, value]) => {
        if (key === 'id') return this.sql`id = ${value as any}`;
        return this.sql`data->>${key} = ${value as any}`;
      });
      if (conditions.length > 0) {
        whereClause = this.sql`WHERE ${conditions.reduce((acc, curr) => this.sql`${acc} AND ${curr}`)}`;
      }
    }

    // Fetch total count
    const countRes = await this.sql`SELECT count(*) as total FROM ${this.sql(tableName)} ${whereClause}`;
    const total = parseInt(countRes[0].total);

    // Fetch data
    let sort = args.sort || 'createdAt DESC';
    sort = sort.replace('createdAt', 'created_at').replace('updatedAt', 'updated_at');
    const rows = await this.sql`
      SELECT * FROM ${this.sql(tableName)} 
      ${whereClause} 
      ORDER BY ${this.sql.unsafe(sort)}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalPages = Math.ceil(total / limit);
    return {
      docs: rows.map(r => ({ id: r.id, ...r.data })),
      total,
      limit,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  async findOne(params: { collection: string; id: string }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    const rows = await this.sql`SELECT * FROM ${this.sql(tableName)} WHERE id = ${params.id}`;
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, ...row.data };
  }

  async create(params: { collection: string; data: any }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    const id = params.data.id || Math.random().toString(36).substring(7);
    const data = { ...params.data };
    delete data.id;

    await this.sql`INSERT INTO ${this.sql(tableName)} (id, data) VALUES (${id}, ${data})`;

    return { id, ...data };
  }

  async update(params: { collection: string; id: string; data: any }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    await this.sql`UPDATE ${this.sql(tableName)} SET data = data || ${params.data}::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = ${params.id}`;
    return { id: params.id, ...params.data };
  }

  async delete(params: { collection: string; id: string }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    await this.sql`DELETE FROM ${this.sql(tableName)} WHERE id = ${params.id}`;
  }

  async getGlobal(params: { slug: string }) {
    const rows = await this.sql`SELECT value FROM dyrected_internal WHERE key = ${`global_${params.slug}`}`;
    const row = rows[0];
    if (!row) return {};
    return row.value;
  }

  async updateGlobal(params: { slug: string; data: any }) {
    await this.sql`
      INSERT INTO dyrected_internal (key, value) 
      VALUES (${`global_${params.slug}`}, ${params.data})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    return params.data;
  }

  async execute(query: string, params?: any[]) {
    if (params && params.length > 0) {
      return this.sql.unsafe(query, params);
    }
    return this.sql.unsafe(query);
  }
}
