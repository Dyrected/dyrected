import { DatabaseAdapter, CollectionConfig, GlobalConfig, parseSort, parseSqlWhere } from '@dyrected/core';
import Database from 'better-sqlite3';

export interface SqliteAdapterConfig {
  filename: string;
}

function escapeSqliteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function normalizeSqliteSort(sort: string | undefined, columns: string[]) {
  return parseSort(sort)
    .map(({ field, direction }) => {
      if (field === 'createdAt' || field === 'created_at') return `"created_at" ${direction}`;
      if (field === 'updatedAt' || field === 'updated_at') return `"updated_at" ${direction}`;
      if (columns.includes(field) && !['id', 'data'].includes(field)) {
        return `${escapeSqliteIdentifier(field)} ${direction}`;
      }

      return `json_extract(data, '$.${field}') ${direction}`;
    })
    .join(', ');
}

export class SqliteAdapter implements DatabaseAdapter {
  private sqlite: Database.Database;
  private transactionQueue: Promise<void> = Promise.resolve();

  constructor(config: SqliteAdapterConfig) {
    this.sqlite = new Database(config.filename);
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
    return `collection_${slug.replace(/-/g, '_')}`;
  }

  private async ensureTable(slug: string, fields: any[] = []) {
    const tableName = this.getTableName(slug);
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

    // Handle Promoted Fields
    for (const field of fields) {
      if (field.promoted) {
        const hasColumn = tableInfo.some(col => col.name === field.name);
        if (!hasColumn) {
          console.log(`[dyrected/sqlite] Promoting field "${field.name}" to column in ${tableName}`);
          // Simplified type mapping
          let sqlType = 'TEXT';
          if (field.type === 'number') sqlType = 'NUMERIC';
          if (field.type === 'boolean') sqlType = 'INTEGER';
          
          this.sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${field.name} ${sqlType}`);
        }
      }
    }
  }

  async find(args: { collection: string; where?: any; limit?: number; page?: number; sort?: string }) {
    await this.ensureTable(args.collection);
    const tableName = this.getTableName(args.collection);

    const limit = args.limit || 10;
    const page = args.page || 1;
    const offset = (page - 1) * limit;

    // Inspect columns for promoted fields
    const tableInfo = this.sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const columns = tableInfo.map(col => col.name);

    // Build WHERE clause from the DSL (sqlite dialect: json_extract)
    let whereSql = '';
    let whereParams: any[] = [];
    if (args.where && Object.keys(args.where).length > 0) {
      const result = parseSqlWhere(
        args.where,
        (field: string) => {
          if (field === 'createdAt') return 'created_at';
          if (field === 'updatedAt') return 'updated_at';
          if (columns.includes(field) && !['id', 'data'].includes(field)) {
            return field;
          }
          return `json_extract(data, '$.${field}')`;
        },
        '?',
      );
      whereSql = `WHERE ${result.sql}`;
      whereParams = result.params;
    }

    const sort = normalizeSqliteSort(args.sort, columns);

    // Count with same filter so pagination totals are accurate
    const { count } = this.sqlite
      .prepare(`SELECT COUNT(*) as count FROM ${tableName} ${whereSql}`)
      .get(...whereParams) as { count: number };

    const rows = this.sqlite
      .prepare(`SELECT * FROM ${tableName} ${whereSql} ORDER BY ${sort} LIMIT ? OFFSET ?`)
      .all(...whereParams, limit, offset) as any[];

    const docs = rows.map((r) => ({
      id: r.id,
      ...JSON.parse(r.data),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const totalPages = Math.ceil(count / limit);
    return {
      docs,
      total: count,
      limit,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
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
    
    // Inspect columns to handle promoted fields
    const tableInfo = this.sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const columns = tableInfo.map(col => col.name);
    
    const id = params.data.id || Math.random().toString(36).substring(7);
    const now = new Date().toISOString();
    const createdAt = params.data.createdAt || now;
    const updatedAt = params.data.updatedAt || now;

    const data = { ...params.data };
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    // Extract promoted fields
    const promotedValues: Record<string, any> = {};
    for (const col of columns) {
      if (['id', 'data', 'created_at', 'updated_at'].includes(col)) continue;
      if (data[col] !== undefined) {
        promotedValues[col] = data[col];
        // We keep it in the JSON blob for now to ensure compatibility, 
        // but it's now also in a real column for indexing.
      }
    }

    const colNames = ['id', 'data', 'created_at', 'updated_at', ...Object.keys(promotedValues)];
    const placeholders = colNames.map(() => '?').join(', ');
    const values = [id, JSON.stringify(data), createdAt, updatedAt, ...Object.values(promotedValues)];

    const stmt = this.sqlite.prepare(`INSERT INTO ${tableName} (${colNames.join(', ')}) VALUES (${placeholders})`);
    stmt.run(...values);

    return { id, ...data, createdAt, updatedAt };
  }

  async update(params: { collection: string; id: string; data: any }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    
    // Inspect columns for promoted fields
    const tableInfo = this.sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const columns = tableInfo.map(col => col.name);

    const existing = await this.findOne({ collection: params.collection, id: params.id });
    const now = new Date().toISOString();
    const newData = { ...(existing || {}), ...params.data };
    delete (newData as any).id;
    delete (newData as any).createdAt;
    delete (newData as any).updatedAt;

    // Extract promoted fields
    const promotedValues: Record<string, any> = {};
    for (const col of columns) {
      if (['id', 'data', 'created_at', 'updated_at'].includes(col)) continue;
      if (newData[col] !== undefined) {
        promotedValues[col] = newData[col];
      }
    }

    const setClauses = ['data = ?', 'updated_at = ?', ...Object.keys(promotedValues).map(k => `${k} = ?`)];
    const values = [JSON.stringify(newData), now, ...Object.values(promotedValues), params.id];

    const stmt = this.sqlite.prepare(`UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
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

  async transaction<T>(callback: (db: DatabaseAdapter) => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.transactionQueue;
    this.transactionQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const result = await callback(this);
      this.sqlite.exec('COMMIT');
      return result;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    } finally {
      release();
    }
  }

  async aggregate(args: {
    collection: string;
    aggregates: Record<string, any>;
  }): Promise<Record<string, number | null>> {
    if (Object.keys(args.aggregates).length === 0) {
      return {};
    }

    await this.ensureTable(args.collection);
    const tableName = this.getTableName(args.collection);

    // Inspect promoted columns so we resolve field references correctly.
    const tableInfo = this.sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const columns = tableInfo.map(col => col.name);

    const toFieldExpr = (field: string): string => {
      if (field === 'createdAt') return 'created_at';
      if (field === 'updatedAt') return 'updated_at';
      if (columns.includes(field) && !['id', 'data'].includes(field)) return field;
      return `json_extract(data, '$.${field}')`;
    };

    /**
     * Safe cast: returns NULL for invalid values.
     * sum/avg/min/max natively skip NULLs in SQLite.
     *
     * SQLite CAST('unknown' AS REAL) returns 0.0 — not NULL — so we guard
     * with a GLOB pattern that only passes numeric-looking strings.
     */
    const toCastExpr = (rawField: string, cast: string | undefined): string => {
      const base = toFieldExpr(rawField);
      if (cast === 'string') return base;
      if (cast === 'boolean') return `CAST(${base} AS INTEGER)`;
      if (cast === 'date') return base; // SQLite stores dates as text
      // number / integer / float: return NULL for non-numeric values
      return `CASE WHEN (${base} GLOB '[0-9]*' OR ${base} GLOB '[+-]*') AND (${base} NOT GLOB '*[^0-9.eE+-]*') THEN CAST(${base} AS REAL) ELSE NULL END`;
    };

    const selectParts: string[] = [];
    const allParams: any[] = [];

    for (const [name, op] of Object.entries(args.aggregates)) {
      let filterClause = '';
      if (op.where && Object.keys(op.where).length > 0) {
        const parsed = parseSqlWhere(op.where, toFieldExpr, '?');
        filterClause = `FILTER (WHERE ${parsed.sql})`;
        allParams.push(...parsed.params);
      }

      let aggExpr: string;
      if ('count' in op) {
        aggExpr = `COUNT(*) ${filterClause}`;
      } else if (op.sum) {
        aggExpr = `SUM(${toCastExpr(op.sum, op.cast)}) ${filterClause}`;
      } else if (op.avg) {
        aggExpr = `AVG(${toCastExpr(op.avg, op.cast)}) ${filterClause}`;
      } else if (op.min) {
        aggExpr = `MIN(${toCastExpr(op.min, op.cast)}) ${filterClause}`;
      } else if (op.max) {
        aggExpr = `MAX(${toCastExpr(op.max, op.cast)}) ${filterClause}`;
      } else {
        aggExpr = `COUNT(*) ${filterClause}`;
      }

      selectParts.push(`${aggExpr} AS "${name.replace(/"/g, '""')}"`);
    }

    const query = `SELECT ${selectParts.join(', ')} FROM ${tableName}`;
    const row = this.sqlite.prepare(query).get(...allParams) as Record<string, unknown> | undefined ?? {};

    const result: Record<string, number | null> = {};
    for (const name of Object.keys(args.aggregates)) {
      const raw = row[name];
      result[name] = raw === null || raw === undefined ? null : Number(raw);
    }
    return result;
  }
}

export const sqliteAdapter = (config: SqliteAdapterConfig) => new SqliteAdapter(config);
