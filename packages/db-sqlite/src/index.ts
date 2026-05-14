import { DatabaseAdapter, CollectionConfig, GlobalConfig } from '@dyrected/core';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';

export interface SqliteAdapterConfig {
  filename: string;
}

export class SqliteAdapter implements DatabaseAdapter {
  private db: any;
  private sqlite: Database.Database;

  constructor(config: SqliteAdapterConfig) {
    this.sqlite = new Database(config.filename);
    // Drizzle is initialized for future-proofing and metadata handling,
    // but we use raw better-sqlite3 (this.sqlite) for CRUD to support dynamic runtime schemas.
    this.db = drizzle(this.sqlite);
    this.initInternalTables();
  }

  private initInternalTables() {
    // Basic setup for a generic approach if needed, 
    // but we will mostly use dynamic tables.
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS dyrected_internal (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
  }

  private getTableName(slug: string) {
    return `collection_${slug}`;
  }

  private async ensureTable(slug: string) {
    const tableName = this.getTableName(slug);
    // Simple dynamic table creation for MVP
    // In a real scenario, we'd map fields to columns.
    // For now, we'll use a JSON 'data' column for flexibility.
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure columns exist (for existing tables)
    const tableInfo = this.sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const hasCreatedAt = tableInfo.some(col => col.name === "created_at");
    const hasUpdatedAt = tableInfo.some(col => col.name === "updated_at");

    if (!hasCreatedAt) {
      this.sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    }
    if (!hasUpdatedAt) {
      this.sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    }
  }

  async find(args: { collection: string; where?: any; limit?: number; page?: number; sort?: string }) {
    await this.ensureTable(args.collection);
    const tableName = this.getTableName(args.collection);
    
    const limit = args.limit || 10;
    const page = args.page || 1;
    const offset = (page - 1) * limit;

    // Count total
    const countStmt = this.sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
    const { count } = countStmt.get() as { count: number };

    // Fetch data
    const sort = args.sort || 'created_at DESC';
    const stmt = this.sqlite.prepare(`SELECT * FROM ${tableName} ORDER BY ${sort} LIMIT ? OFFSET ?`);
    const rows = stmt.all(limit, offset) as any[];
    const docs = rows.map(r => ({ 
      id: r.id, 
      ...JSON.parse(r.data),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    const totalPages = Math.ceil(count / limit);

    return {
      docs,
      total: count,
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
    const stmt = this.sqlite.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
    const id = (params.id && typeof params.id === 'object') ? (params.id as any).id : params.id;
    const row = stmt.get(id) as any;
    if (!row) return null;
    return { 
      id: row.id, 
      ...JSON.parse(row.data),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async create(params: { collection: string; data: any }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    const id = params.data.id || Math.random().toString(36).substring(7);
    const now = new Date().toISOString();
    const createdAt = params.data.createdAt || now;
    const updatedAt = params.data.updatedAt || now;

    const data = { ...params.data };
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    const stmt = this.sqlite.prepare(`INSERT INTO ${tableName} (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)`);
    stmt.run(id, JSON.stringify(data), createdAt, updatedAt);

    return { id, ...data, createdAt, updatedAt };
  }

  async update(params: { collection: string; id: string; data: any }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    const existing = await this.findOne({ collection: params.collection, id: params.id });
    const now = new Date().toISOString();
    const newData = { ...(existing || {}), ...params.data };
    delete (newData as any).id;
    delete (newData as any).createdAt;
    delete (newData as any).updatedAt;

    const stmt = this.sqlite.prepare(`UPDATE ${tableName} SET data = ?, updated_at = ? WHERE id = ?`);
    stmt.run(JSON.stringify(newData), now, params.id);
    return { id: params.id, ...newData, createdAt: existing?.createdAt, updatedAt: now };
  }

  async delete(params: { collection: string; id: string }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    const stmt = this.sqlite.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
    stmt.run(params.id);
  }

  async sync(collections: any[]) {
    for (const col of collections) {
      await this.ensureTable(col.slug);
    }
  }

  async getGlobal(params: { slug: string }) {
    const stmt = this.sqlite.prepare(`SELECT value FROM dyrected_internal WHERE key = ?`);
    const row = stmt.get(`global_${params.slug}`) as any;
    if (!row) return {};
    return JSON.parse(row.value);
  }

  async updateGlobal(params: { slug: string; data: any }) {
    const stmt = this.sqlite.prepare(`INSERT OR REPLACE INTO dyrected_internal (key, value) VALUES (?, ?)`);
    stmt.run(`global_${params.slug}`, JSON.stringify(params.data));
    return params.data;
  }
}

export const sqliteAdapter = (config: SqliteAdapterConfig) => new SqliteAdapter(config);
