import { DatabaseAdapter, CollectionConfig, GlobalConfig, parseSort, parseSqlWhere, DuplicateKeyError, generateDocumentId, coerceBooleanWhere, normalizeGroupKey } from '@dyrected/core';
import Database from 'better-sqlite3';

function handleSqliteError(err: any): never {
  if (err && (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message?.includes('UNIQUE constraint failed'))) {
    const match = err.message.match(/UNIQUE constraint failed: (?:[^.]*\.)?(.*)/);
    const field = match ? match[1] : undefined;
    throw new DuplicateKeyError(err.message, { field });
  }
  throw err;
}

function toSqliteBind(val: any): any {
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (val === undefined) return null;
  return val;
}

function isNumericOp(val: any): val is { increment?: number; decrement?: number } {
  return (
    val !== null &&
    typeof val === 'object' &&
    !Array.isArray(val) &&
    ('increment' in val || 'decrement' in val)
  );
}

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
  private collectionConfigs = new Map<string, any>();

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

    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS _dyrected_ai_threads (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS _dyrected_ai_messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `);

    this.sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_ai_messages_thread_id ON _dyrected_ai_messages(thread_id)
    `);

    this.sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_ai_threads_user_project ON _dyrected_ai_threads(user_id, project_id)
    `);
  }

  private getTableName(slug: string) {
    return `collection_${slug.replace(/-/g, '_')}`;
  }

  private async ensureTable(slug: string, fields: any[] = [], indexes: any[] = []) {
    if (slug === '_dyrected_ai_threads' || slug === '_dyrected_ai_messages') {
      return;
    }
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

    // Collect all fields that are indexed
    const indexedFields = new Set<string>();
    if (Array.isArray(indexes)) {
      for (const idx of indexes) {
        if (Array.isArray(idx.fields)) {
          for (const f of idx.fields) indexedFields.add(f);
        }
      }
    }

    // Handle Promoted and Indexed Fields
    for (const field of fields) {
      if (field.promoted || field.unique || indexedFields.has(field.name)) {
        const hasColumn = tableInfo.some(col => col.name === field.name);
        if (!hasColumn) {
          console.log(`[dyrected/sqlite] Promoting field "${field.name}" to column in ${tableName}`);
          // Simplified type mapping
          let sqlType = 'TEXT';
          if (field.type === 'number') sqlType = 'NUMERIC';
          if (field.type === 'money') sqlType = 'INTEGER';
          if (field.type === 'boolean') sqlType = 'INTEGER';
          
          this.sqlite.exec(`ALTER TABLE ${escapeSqliteIdentifier(tableName)} ADD COLUMN ${escapeSqliteIdentifier(field.name)} ${sqlType}`);
          tableInfo.push({ name: field.name });
        }
      }
    }

    // Ensure indexes exist
    // 1. Single-field unique constraints
    for (const field of fields) {
      if (field.unique) {
        const idxName = `uniq_${tableName}_${field.name}`;
        this.sqlite.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ${escapeSqliteIdentifier(idxName)} ON ${escapeSqliteIdentifier(tableName)}(${escapeSqliteIdentifier(field.name)})`);
      }
    }

    // 2. Collection composite/custom indexes
    if (Array.isArray(indexes)) {
      for (const idx of indexes) {
        if (!Array.isArray(idx.fields) || idx.fields.length === 0) continue;
        const isUnique = Boolean(idx.unique);
        const idxName = idx.name || `${isUnique ? 'uniq' : 'idx'}_${tableName}_${idx.fields.join('_')}`;
        const uniqueKeyword = isUnique ? 'UNIQUE ' : '';
        const colList = idx.fields.map((f: string) => escapeSqliteIdentifier(f)).join(', ');
        this.sqlite.exec(`CREATE ${uniqueKeyword}INDEX IF NOT EXISTS ${escapeSqliteIdentifier(idxName)} ON ${escapeSqliteIdentifier(tableName)}(${colList})`);
      }
    }
  }

  async find(args: {
    collection: string;
    where?: any;
    limit?: number;
    page?: number;
    sort?: string;
    fields?: any[];
    lock?: 'for-update';
  }) {
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
        this.coerceBooleanWhere(args.collection, args.where),
        (field: string) => {
          if (field === 'id') return 'id';
          if (field === 'createdAt') return 'created_at';
          if (field === 'updatedAt') return 'updated_at';
          if (columns.includes(field) && !['id', 'data'].includes(field)) {
            return escapeSqliteIdentifier(field);
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
      .get(...whereParams.map(toSqliteBind)) as { count: number };

    const rows = this.sqlite
      .prepare(`SELECT * FROM ${tableName} ${whereSql} ORDER BY ${sort} LIMIT ? OFFSET ?`)
      .all(...whereParams.map(toSqliteBind), limit, offset) as any[];

    const docs = rows.map((r) => {
      const parsedData = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
      const promotedOverlay: Record<string, any> = {};
      for (const col of columns) {
        if (!['id', 'data', 'created_at', 'updated_at'].includes(col) && r[col] !== undefined && r[col] !== null) {
          promotedOverlay[col] = r[col];
        }
      }
      return {
        id: r.id,
        ...parsedData,
        ...promotedOverlay,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

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

  async findOne(params: { collection: string; id?: string; where?: Record<string, unknown>; lock?: 'for-update' }) {
    if (params.id === undefined && params.where) {
      const found = await this.find({ collection: params.collection, where: params.where, limit: 1, lock: params.lock });
      return found.docs[0] ?? null;
    }
    if (params.id === undefined) throw new Error("findOne requires either id or where");
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    const tableInfo = this.sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const columns = tableInfo.map(col => col.name);
    const stmt = this.sqlite.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
    const id = (params.id && typeof params.id === 'object') ? (params.id as any).id : params.id;
    const row = stmt.get(id) as any;
    if (!row) return null;

    const parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
    const promotedOverlay: Record<string, any> = {};
    for (const col of columns) {
      if (!['id', 'data', 'created_at', 'updated_at'].includes(col) && row[col] !== undefined && row[col] !== null) {
        promotedOverlay[col] = row[col];
      }
    }

    return { 
      id: row.id, 
      ...parsedData,
      ...promotedOverlay,
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
    
    const colConfig = this.collectionConfigs.get(params.collection);
    const id = params.data.id || generateDocumentId(colConfig || params.collection);
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
      }
    }

    const colNames = ['id', 'data', 'created_at', 'updated_at', ...Object.keys(promotedValues)];
    const placeholders = colNames.map(() => '?').join(', ');
    const values = [id, JSON.stringify(data), createdAt, updatedAt, ...Object.values(promotedValues)].map(toSqliteBind);

    try {
      const stmt = this.sqlite.prepare(`INSERT INTO ${tableName} (${colNames.join(', ')}) VALUES (${placeholders})`);
      stmt.run(...values);
      return { id, ...data, ...promotedValues, createdAt, updatedAt };
    } catch (err: any) {
      handleSqliteError(err);
    }
  }

  async update(params: { collection: string; id?: string; where?: any; data: any }): Promise<any> {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    
    // Inspect columns for promoted fields
    const tableInfo = this.sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const columns = tableInfo.map(col => col.name);
    const now = new Date().toISOString();

    // Build WHERE clause
    let whereSql = '';
    let whereParams: any[] = [];
    if (params.id) {
      whereSql = 'WHERE id = ?';
      whereParams = [params.id];
      if (params.where && Object.keys(params.where).length > 0) {
        const parsed = parseSqlWhere(
          this.coerceBooleanWhere(params.collection, params.where),
          (field: string) => {
            if (field === 'id') return 'id';
            if (field === 'createdAt') return 'created_at';
            if (field === 'updatedAt') return 'updated_at';
            if (columns.includes(field) && !['id', 'data'].includes(field)) {
              return escapeSqliteIdentifier(field);
            }
            return `json_extract(data, '$.${field}')`;
          },
          '?',
        );
        whereSql += ` AND (${parsed.sql})`;
        whereParams.push(...parsed.params);
      }
    } else if (params.where && Object.keys(params.where).length > 0) {
      const parsed = parseSqlWhere(
        this.coerceBooleanWhere(params.collection, params.where),
        (field: string) => {
          if (field === 'id') return 'id';
          if (field === 'createdAt') return 'created_at';
          if (field === 'updatedAt') return 'updated_at';
          if (columns.includes(field) && !['id', 'data'].includes(field)) {
            return escapeSqliteIdentifier(field);
          }
          return `json_extract(data, '$.${field}')`;
        },
        '?',
      );
      whereSql = `WHERE ${parsed.sql}`;
      whereParams = parsed.params;
    } else {
      throw new Error('update requires either id or where clause');
    }

    const setClauses: string[] = [];
    const setParams: any[] = [];
    const jsonPaths: string[] = [];
    const jsonParams: any[] = [];

    for (const [key, val] of Object.entries(params.data)) {
      if (['id', 'createdAt', 'updatedAt'].includes(key)) continue;

      const isPromoted = columns.includes(key) && !['id', 'data', 'created_at', 'updated_at'].includes(key);

      if (isNumericOp(val)) {
        const delta = Number((val.increment ?? 0) - (val.decrement ?? 0));
        if (isPromoted) {
          const escapedCol = escapeSqliteIdentifier(key);
          setClauses.push(`${escapedCol} = COALESCE(${escapedCol}, 0) + ?`);
          setParams.push(delta);
          jsonPaths.push(`'$.${key}', ${escapedCol}`);
        } else {
          jsonPaths.push(`'$.${key}', json_extract(data, '$.${key}') + ?`);
          jsonParams.push(delta);
        }
      } else {
        if (isPromoted) {
          const escapedCol = escapeSqliteIdentifier(key);
          setClauses.push(`${escapedCol} = ?`);
          setParams.push(val);
          jsonPaths.push(`'$.${key}', ${escapedCol}`);
        } else if (typeof val === 'object' && val !== null) {
          jsonPaths.push(`'$.${key}', json(?)`);
          jsonParams.push(JSON.stringify(val));
        } else {
          jsonPaths.push(`'$.${key}', ?`);
          jsonParams.push(val);
        }
      }
    }

    setClauses.push('updated_at = ?');
    setParams.push(now);

    if (jsonPaths.length > 0) {
      setClauses.push(`data = json_set(COALESCE(data, '{}'), ${jsonPaths.join(', ')})`);
      setParams.push(...jsonParams);
    }

    const updateSql = `UPDATE ${tableName} SET ${setClauses.join(', ')} ${whereSql}`;
    try {
      const stmt = this.sqlite.prepare(updateSql);
      const info = stmt.run(...[...setParams, ...whereParams].map(toSqliteBind));

      let targetId = params.id;
      if (!targetId && params.where) {
        const found = await this.find({ collection: params.collection, where: params.where, limit: 1 });
        targetId = found.docs[0]?.id;
      }

      if (targetId) {
        const doc = await this.findOne({ collection: params.collection, id: targetId });
        if (doc) {
          (doc as any).affectedRows = info.changes;
          return doc;
        }
      }

      return { id: targetId, ...params.data, affectedRows: info.changes, updatedAt: now };
    } catch (err: any) {
      handleSqliteError(err);
    }
  }

  async delete(params: { collection: string; id: string }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    const stmt = this.sqlite.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
    stmt.run(params.id);
  }

  /** Applies {@link coerceBooleanWhere} using the collection's declared field types. */
  private coerceBooleanWhere(collection: string, where: any): any {
    return coerceBooleanWhere(where, this.collectionConfigs.get(collection)?.fields);
  }

  async sync(collections: any[]) {
    for (const col of collections) {
      this.collectionConfigs.set(col.slug, col);
      await this.ensureTable(col.slug, col.fields, col.indexes);
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
    groupBy?: string;
  }): Promise<Record<string, any>> {
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
      if (cast === 'date') return `CASE WHEN (${base} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]*') THEN ${base} ELSE NULL END`;
      // number / integer / float: return NULL for non-numeric values
      return `CASE WHEN (${base} GLOB '[0-9]*' OR ${base} GLOB '[+-]*') AND (${base} NOT GLOB '*[^0-9.eE+-]*') THEN CAST(${base} AS REAL) ELSE NULL END`;
    };

    const selectParts: string[] = [];
    const allParams: any[] = [];
    const isDistinctMap: Record<string, boolean> = {};

    for (const [name, op] of Object.entries(args.aggregates)) {
      let filterClause = '';
      if (op.where && Object.keys(op.where).length > 0) {
        const parsed = parseSqlWhere(this.coerceBooleanWhere(args.collection, op.where), toFieldExpr, '?');
        filterClause = `FILTER (WHERE ${parsed.sql})`;
        allParams.push(...parsed.params);
      }

      let aggExpr: string;
      if ('countDistinct' in op && typeof op.countDistinct === 'string') {
        const fieldExpr = toFieldExpr(op.countDistinct);
        aggExpr = `COUNT(DISTINCT ${fieldExpr}) ${filterClause}`;
      } else if ('distinct' in op && typeof op.distinct === 'string') {
        isDistinctMap[name] = true;
        const fieldExpr = toFieldExpr(op.distinct);
        aggExpr = `COALESCE(json_group_array(DISTINCT ${fieldExpr}) ${filterClause}, '[]')`;
      } else if ('count' in op) {
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

    if (args.groupBy) {
      const groupCol = toFieldExpr(args.groupBy);
      const query = `SELECT ${groupCol} AS "__group_key", ${selectParts.join(', ')} FROM ${tableName} GROUP BY ${groupCol}`;
      const rows = (this.sqlite.prepare(query).all(...allParams.map(toSqliteBind)) as Record<string, unknown>[]) ?? [];

      const groups: Record<string, Record<string, any>> = {};
      for (const row of rows) {
        const key = normalizeGroupKey(row.__group_key, (this.collectionConfigs.get(args.collection)?.fields ?? []).find((f: any) => f.name === args.groupBy)?.type);
        const groupResult: Record<string, any> = {};
        for (const name of Object.keys(args.aggregates)) {
          const raw = row[name];
          const op = args.aggregates[name];
          if (isDistinctMap[name]) {
            const rawArr = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : (raw ?? []));
            groupResult[name] = Array.isArray(rawArr) ? rawArr.filter((v: any) => v !== null && v !== undefined) : [];
          } else if (op?.cast === 'date') {
            groupResult[name] = raw === null || raw === undefined ? null : String(raw);
          } else {
            groupResult[name] = raw === null || raw === undefined ? null : (isNaN(Number(raw)) ? raw : Number(raw));
          }
        }
        groups[key] = groupResult;
      }
      return { groups };
    }

    const query = `SELECT ${selectParts.join(', ')} FROM ${tableName}`;
    const row = (this.sqlite.prepare(query).get(...allParams.map(toSqliteBind)) as Record<string, unknown> | undefined) ?? {};

    const result: Record<string, any> = {};
    for (const name of Object.keys(args.aggregates)) {
      const raw = row[name];
      const op = args.aggregates[name];
      if (isDistinctMap[name]) {
        const rawArr = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : (raw ?? []));
        result[name] = Array.isArray(rawArr) ? rawArr.filter((v: any) => v !== null && v !== undefined) : [];
      } else if (op?.cast === 'date') {
        result[name] = raw === null || raw === undefined ? null : String(raw);
      } else {
        result[name] = raw === null || raw === undefined ? null : (isNaN(Number(raw)) ? raw : Number(raw));
      }
    }
    return result;
  }

  async disconnect(): Promise<void> {
    try {
      this.sqlite.close();
    } catch {
      // Ignore errors if already closed
    }
  }
}

export const sqliteAdapter = (config: SqliteAdapterConfig) => new SqliteAdapter(config);
