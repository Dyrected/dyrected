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
    await this.sql.unsafe(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async find(params: { collection: string; where?: any; limit?: number; page?: number }): Promise<PaginatedResult> {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    const limit = params.limit || 10;
    const page = params.page || 1;
    const offset = (page - 1) * limit;

    // Fetch total count
    const countRes = await this.sql.unsafe(`SELECT count(*) as total FROM ${tableName}`);
    const total = parseInt(countRes[0].total);

    // Fetch data
    const rows = await this.sql.unsafe(`SELECT * FROM ${tableName} LIMIT ${limit} OFFSET ${offset}`);

    return {
      docs: rows.map(r => ({ id: r.id, ...r.data })),
      total,
      limit,
      page
    };
  }

  async findOne(params: { collection: string; id: string }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    const rows = await this.sql.unsafe(`SELECT * FROM ${tableName} WHERE id = ${params.id}`);
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

    await this.sql.unsafe(`INSERT INTO ${tableName} (id, data) VALUES (${id}, ${JSON.stringify(data)})`);

    return { id, ...data };
  }

  async update(params: { collection: string; id: string; data: any }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    await this.sql.unsafe(`UPDATE ${tableName} SET data = ${JSON.stringify(params.data)}, updated_at = CURRENT_TIMESTAMP WHERE id = ${params.id}`);
    return { id: params.id, ...params.data };
  }

  async delete(params: { collection: string; id: string }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    await this.sql.unsafe(`DELETE FROM ${tableName} WHERE id = ${params.id}`);
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
}
