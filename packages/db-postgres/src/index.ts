import { DatabaseAdapter, PaginatedResult, parseSqlWhere } from '@dyrected/core';
import postgres from 'postgres';

export interface PostgresAdapterConfig {
  url: string;
}

export class PostgresAdapter implements DatabaseAdapter {
  private sql: postgres.Sql;

  constructor(config: PostgresAdapterConfig) {
    this.sql = postgres(config.url);
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

  private getTableIdentifier(slug: string) {
    if (slug.includes('.')) {
      // If it's already qualified (contains a dot), trust the caller has formatted it correctly
      // e.g. "ws_123"."collection_posts"
      return this.sql.unsafe(slug);
    }
    return this.sql(`collection_${slug}`);
  }

  private async ensureTable(slug: string, fields: any[] = []) {
    const table = this.getTableIdentifier(slug);
    await this.sql`
      CREATE TABLE IF NOT EXISTS ${table} (
        id TEXT PRIMARY KEY,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Handle Promoted Fields
    const cols = await this.sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${`collection_${slug}`}
    `;
    const existingCols = cols.map(c => c.column_name);

    for (const field of fields) {
      if (field.promoted && !existingCols.includes(field.name)) {
        console.log(`[dyrected/postgres] Promoting field "${field.name}" to column in ${slug}`);
        let sqlType = 'TEXT';
        if (field.type === 'number') sqlType = 'NUMERIC';
        if (field.type === 'boolean') sqlType = 'BOOLEAN';
        
        await this.sql.unsafe(`ALTER TABLE ${slug.includes('.') ? slug : `collection_${slug}`} ADD COLUMN "${field.name}" ${sqlType}`);
      }
    }
  }

  async find(args: { collection: string; where?: any; limit?: number; page?: number; sort?: string }): Promise<PaginatedResult> {
    const table = this.getTableIdentifier(args.collection);
    const limit = args.limit || 10;
    const page = args.page || 1;
    const offset = (page - 1) * limit;

    // Inspect columns for promoted fields
    const cols = await this.sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${`collection_${args.collection}`}
    `;
    const existingCols = cols.map(c => c.column_name);

    // Build parameterized WHERE using the shared DSL translator (Postgres JSON path)
    let whereFragment = this.sql``;
    if (args.where && Object.keys(args.where).length > 0) {
      const { sql: whereSql, params } = parseSqlWhere(
        args.where,
        (field: string) => {
          if (existingCols.includes(field) && !['id', 'data'].includes(field)) {
            return `"${field}"`;
          }
          return `data->>'${field}'`;
        },
        'pg',
      );
      whereFragment = this.sql`WHERE ${this.sql.unsafe(whereSql, params)}`;
    }

    // Fetch total count with same filter
    const countRes = await this.sql`SELECT count(*) as total FROM ${table} ${whereFragment}`;
    const total = parseInt(countRes[0].total);

    // Normalize sort field names from camelCase to snake_case
    let sort = args.sort || 'createdAt DESC';
    sort = sort.replace(/\bcreatedAt\b/g, 'created_at').replace(/\bupdatedAt\b/g, 'updated_at');

    const rows = await this.sql`
      SELECT * FROM ${table}
      ${whereFragment}
      ORDER BY ${this.sql.unsafe(sort)}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalPages = Math.ceil(total / limit);
    return {
      docs: rows.map((r) => ({ id: r.id, ...r.data })),
      total,
      limit,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findOne(params: { collection: string; id: string }) {
    const table = this.getTableIdentifier(params.collection);
    const rows = await this.sql`SELECT * FROM ${table} WHERE id = ${params.id}`;
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, ...row.data };
  }

  async create(params: { collection: string; data: any }) {
    const table = this.getTableIdentifier(params.collection);
    
    // Inspect columns for promoted fields
    const cols = await this.sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${`collection_${params.collection}`}
    `;
    const existingCols = cols.map(c => c.column_name);

    const id = params.data.id || Math.random().toString(36).substring(7);
    const data = { ...params.data };
    delete data.id;

    // Extract promoted fields
    const promotedValues: Record<string, any> = {};
    for (const col of existingCols) {
      if (['id', 'data', 'created_at', 'updated_at'].includes(col)) continue;
      if (data[col] !== undefined) {
        promotedValues[col] = data[col];
      }
    }

    if (Object.keys(promotedValues).length > 0) {
      const allData = { id, data, ...promotedValues };
      await this.sql`INSERT INTO ${table} ${this.sql(allData)}`;
    } else {
      await this.sql`INSERT INTO ${table} (id, data) VALUES (${id}, ${data})`;
    }

    return { id, ...data };
  }

  async update(params: { collection: string; id: string; data: any }) {
    const table = this.getTableIdentifier(params.collection);
    
    // Inspect columns for promoted fields
    const cols = await this.sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${`collection_${params.collection}`}
    `;
    const existingCols = cols.map(c => c.column_name);

    const data = { ...params.data };
    const promotedValues: Record<string, any> = {};
    for (const col of existingCols) {
      if (['id', 'data', 'created_at', 'updated_at'].includes(col)) continue;
      if (data[col] !== undefined) {
        promotedValues[col] = data[col];
      }
    }

    if (Object.keys(promotedValues).length > 0) {
      await this.sql`
        UPDATE ${table} 
        SET data = data || ${data}::jsonb, 
            updated_at = CURRENT_TIMESTAMP,
            ${this.sql(promotedValues)}
        WHERE id = ${params.id}
      `;
    } else {
      await this.sql`UPDATE ${table} SET data = data || ${data}::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = ${params.id}`;
    }

    return { id: params.id, ...params.data };
  }

  async sync(collections: any[]) {
    for (const col of collections) {
      await this.ensureTable(col.slug, col.fields);
    }
  }

  async delete(params: { collection: string; id: string }) {
    const table = this.getTableIdentifier(params.collection);
    await this.sql`DELETE FROM ${table} WHERE id = ${params.id}`;
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

  async ping() {
    try {
      await this.sql`SELECT 1`;
      return true;
    } catch (error) {
      console.error('[dyrected-db-postgres] Database connectivity check failed:', error);
      return false;
    }
  }
}

export const postgresAdapter = (config: PostgresAdapterConfig) => new PostgresAdapter(config);
