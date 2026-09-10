import { DatabaseAdapter, PaginatedResult, parseSort, parseSqlWhere } from "@dyrected/core";
import mysql from "mysql2/promise";

export interface MysqlAdapterConfig {
  /** Full MySQL connection URL: mysql://user:pass@host:3306/dbname */
  url?: string;
  /** Alternative: individual connection options */
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  /** Optional pool options passed directly to mysql2 createPool */
  poolOptions?: Record<string, any>;
}

type SharedMysqlClient = {
  pool?: any;
  initPromise?: Promise<any>;
};

const MYSQL_CLIENT_CACHE_KEY = "__dyrectedMysqlClientCache";

function getSharedMysqlClientCache(): Map<string, SharedMysqlClient> {
  const globalScope = globalThis as typeof globalThis & {
    [MYSQL_CLIENT_CACHE_KEY]?: Map<string, SharedMysqlClient>;
  };

  if (!globalScope[MYSQL_CLIENT_CACHE_KEY]) {
    globalScope[MYSQL_CLIENT_CACHE_KEY] = new Map();
  }

  return globalScope[MYSQL_CLIENT_CACHE_KEY];
}

function getMysqlCacheKey(config: MysqlAdapterConfig): string {
  if (config.url) return config.url;
  return `${config.host || "localhost"}:${config.port || 3306}:${config.database || ""}:${config.user || ""}`;
}

function escapeMysqlIdentifier(identifier: string) {
  return `\`${identifier.replace(/`/g, "``")}\``;
}

function normalizeMysqlSort(sort: string | undefined, existingCols: string[]) {
  return parseSort(sort)
    .map(({ field, direction }) => {
      if (field === "createdAt" || field === "created_at") return `\`created_at\` ${direction}`;
      if (field === "updatedAt" || field === "updated_at") return `\`updated_at\` ${direction}`;
      if (existingCols.includes(field) && !["id", "data"].includes(field)) {
        return `${escapeMysqlIdentifier(field)} ${direction}`;
      }

      return `JSON_UNQUOTE(JSON_EXTRACT(data, '$.${field}')) ${direction}`;
    })
    .join(", ");
}

export class MysqlAdapter implements DatabaseAdapter {
  private pool: any;
  private config: MysqlAdapterConfig;
  private initPromise: Promise<void> | null = null;
  private inTransaction = false;
  private tableLocks = new Map<string, Promise<void>>();
  private ensuredTables = new Set<string>();
  private tableColumnsCache = new Map<string, string[]>();

  constructor(config: MysqlAdapterConfig) {
    this.config = config;
  }

  private handleConnectionError(err: any): never {
    if (err && (err.code === "EADDRNOTAVAIL" || err.message?.includes("EADDRNOTAVAIL"))) {
      const customMessage = `
[dyrected/db-mysql] ERROR: MySQL connection failed with EADDRNOTAVAIL.
--------------------------------------------------------------------------------
This error often occurs when:
1. 'localhost' is resolved to an IPv6 address (::1) but MySQL is only listening on IPv4 (127.0.0.1).
2. The MySQL server is not running or is bound to a different port.

FIX INSTRUCTIONS:
- Try changing your host configuration in '.env' or config from 'localhost' to '127.0.0.1'.
- Make sure your local MySQL service is active and running on the configured port.
--------------------------------------------------------------------------------
`;
      console.error(customMessage);
      throw new Error(`MySQL Connection Failed: EADDRNOTAVAIL. Hint: Try using '127.0.0.1' instead of 'localhost'. Original: ${err.message}`);
    }
    throw err;
  }

  private async retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err: any) {
        lastError = err;
        const isNetworkOrTimeout =
          err.code === "ETIMEDOUT" ||
          err.code === "ECONNREFUSED" ||
          err.code === "PROTOCOL_CONNECTION_LOST" ||
          err.message?.includes("ETIMEDOUT") ||
          err.message?.includes("Connection lost");

        if (attempt < maxRetries && isNetworkOrTimeout) {
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.warn(`[dyrected/db-mysql] Connection attempt ${attempt} failed (${err.code || err.message}), retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }
    throw lastError;
  }

  private async ensureInitialized() {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
  }

  private async initialize() {
    const cache = getSharedMysqlClientCache();
    const cacheKey = getMysqlCacheKey(this.config);
    const cached = cache.get(cacheKey);

    if (cached?.pool) {
      this.pool = cached.pool;
      return;
    }

    if (cached?.initPromise) {
      this.pool = await cached.initPromise;
      return;
    }

    const initPromise = (async () => {
      const config = this.config;
      let dbName = config.database;
      let serverConfig: any = null;

      if (config.url) {
        try {
          const parsed = new URL(config.url);
          dbName = parsed.pathname.replace(/^\//, "");
          const serverUrl = `${parsed.protocol}//${parsed.username}:${parsed.password}@${parsed.host}`;
          serverConfig = serverUrl;
        } catch (err) {
          // Ignore parsing errors
        }
      } else {
        serverConfig = {
          host: config.host ?? "localhost",
          port: config.port ?? 3306,
          user: config.user,
          password: config.password,
        };
      }

      if (dbName && serverConfig) {
        try {
          await this.retryOperation(async () => {
            const tempConn = (await mysql.createConnection(serverConfig)) as any;
            try {
              await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
            } finally {
              await tempConn.end().catch(() => {});
            }
          }, 3, 1000);
          console.log(`[dyrected/db-mysql] Database "${dbName}" checked/created successfully`);
        } catch (err: any) {
          console.warn(`[dyrected/db-mysql] Auto-creation of database "${dbName}" skipped/failed:`, err.message);
          if (err.code === "EADDRNOTAVAIL" || err.message?.includes("EADDRNOTAVAIL")) {
            this.handleConnectionError(err);
          }
        }
      }

      const defaultPoolOptions = {
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        connectTimeout: 20000,
        dateStrings: true,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ...config.poolOptions,
      };

      let pool: any;
      if (config.url) {
        pool = mysql.createPool({
          uri: config.url,
          ...defaultPoolOptions,
        });
      } else {
        pool = mysql.createPool({
          host: config.host ?? "localhost",
          port: config.port ?? 3306,
          user: config.user,
          password: config.password,
          database: config.database,
          ...defaultPoolOptions,
        });
      }

      // Initialize internal tables with retry
      try {
        await this.retryOperation(async () => {
          await pool.query(`
            CREATE TABLE IF NOT EXISTS dyrected_internal (
              \`key\` VARCHAR(255) PRIMARY KEY,
              value JSON NOT NULL
            )
          `);
          await pool.query(`
            CREATE TABLE IF NOT EXISTS _dyrected_ai_threads (
              id VARCHAR(36) PRIMARY KEY,
              project_id VARCHAR(255) NOT NULL,
              user_id VARCHAR(255) NOT NULL,
              title TEXT,
              created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
              updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
              INDEX idx_ai_threads_user_project (user_id, project_id)
            )
          `);
          await pool.query(`
            CREATE TABLE IF NOT EXISTS _dyrected_ai_messages (
              id VARCHAR(36) PRIMARY KEY,
              thread_id VARCHAR(36) NOT NULL,
              role VARCHAR(50) NOT NULL,
              content LONGTEXT NOT NULL,
              created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
              metadata JSON,
              INDEX idx_ai_messages_thread_id (thread_id),
              CONSTRAINT fk_ai_messages_thread FOREIGN KEY (thread_id) REFERENCES _dyrected_ai_threads(id) ON DELETE CASCADE
            )
          `);
        }, 3, 1000);
      } catch (err: any) {
        this.handleConnectionError(err);
      }

      return pool;
    })();

    cache.set(cacheKey, { initPromise });

    try {
      this.pool = await initPromise;
      cache.set(cacheKey, { pool: this.pool });
    } catch (error) {
      cache.delete(cacheKey);
      throw error;
    }
  }

  private async query(sql: string, params?: any[]): Promise<any> {
    await this.ensureInitialized();
    try {
      return await this.pool.query(sql, params);
    } catch (err: any) {
      this.handleConnectionError(err);
    }
  }

  async execute(sql: string, params?: any[]): Promise<any> {
    await this.ensureInitialized();
    try {
      return await this.pool.execute(sql, params);
    } catch (err: any) {
      this.handleConnectionError(err);
    }
  }

  private getTableName(slug: string): string {
    if (slug.includes(".")) {
      const parts = slug.split(".");
      return parts[parts.length - 1].replace(/`/g, "");
    }
    return slug.startsWith("collection_") ? slug : `collection_${slug}`;
  }

  private async getTableColumns(tableName: string): Promise<string[]> {
    const cached = this.tableColumnsCache.get(tableName);
    if (cached) return cached;
    const [cols] = await this.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingCols = cols.map((c: any) => c.Field);
    this.tableColumnsCache.set(tableName, existingCols);
    return existingCols;
  }

  private async ensureTable(slug: string, fields: any[] = []) {
    if (slug === "_dyrected_ai_threads" || slug === "_dyrected_ai_messages") {
      return;
    }

    // If the table was already ensured in this lifecycle and no new fields are being passed, skip
    if (fields.length === 0 && this.ensuredTables.has(slug)) {
      return;
    }

    // Coordinate concurrency via tableLocks so parallel requests don't collide on table creation/alteration
    if (this.tableLocks.has(slug)) {
      await this.tableLocks.get(slug);
      if (fields.length === 0 && this.ensuredTables.has(slug)) {
        return;
      }
    }

    let resolveLock!: () => void;
    let rejectLock!: (err: any) => void;
    const lockPromise = new Promise<void>((resolve, reject) => {
      resolveLock = resolve;
      rejectLock = reject;
    });
    this.tableLocks.set(slug, lockPromise);

    try {
      const tableName = this.getTableName(slug);
      await this.query(`
        CREATE TABLE IF NOT EXISTS \`${tableName}\` (
          id VARCHAR(36) PRIMARY KEY,
          data JSON NOT NULL,
          created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
        )
      `);

      // Inspect columns for promoted fields
      const existingCols = await this.getTableColumns(tableName);

      for (const field of fields) {
        if (field.promoted && !existingCols.includes(field.name)) {
          console.log(`[dyrected/mysql] Promoting field "${field.name}" to column in ${tableName}`);
          let sqlType = "TEXT";
          if (field.type === "number") sqlType = "DECIMAL(19,4)";
          if (field.type === "boolean") sqlType = "TINYINT(1)";
          if (field.type === "date" || field.type === "datetime") sqlType = "DATETIME(3)";

          try {
            await this.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${field.name}\` ${sqlType}`);
            existingCols.push(field.name);
            this.tableColumnsCache.set(tableName, existingCols);
          } catch (err: any) {
            // ER_DUP_FIELDNAME (errno 1060): Duplicate column name. Silently ignore if already added concurrently.
            if (err.code === "ER_DUP_FIELDNAME" || err.errno === 1060 || err.message?.includes("Duplicate column name")) {
              // Column already added
            } else {
              throw err;
            }
          }

          // Backfill existing rows where the promoted column is NULL but JSON data contains the field
          const escapedField = field.name.replace(/`/g, "``");
          let castExpr = `JSON_UNQUOTE(JSON_EXTRACT(data, '$.${field.name}'))`;
          if (field.type === "number") {
            castExpr = `IF(JSON_UNQUOTE(JSON_EXTRACT(data, '$.${field.name}')) REGEXP '^-?[0-9]+(\\\\.[0-9]+)?([eE][+-]?[0-9]+)?$', CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.${field.name}')) AS DECIMAL(19,4)), NULL)`;
          } else if (field.type === "boolean") {
            castExpr = `IF(JSON_UNQUOTE(JSON_EXTRACT(data, '$.${field.name}')) IN ('true', '1'), 1, 0)`;
          } else if (field.type === "date" || field.type === "datetime") {
            castExpr = `STR_TO_DATE(LEFT(JSON_UNQUOTE(JSON_EXTRACT(data, '$.${field.name}')), 23), '%Y-%m-%d %H:%i:%s.%f')`;
          }

          try {
            await this.query(
              `UPDATE \`${tableName}\` SET \`${escapedField}\` = ${castExpr} WHERE \`${escapedField}\` IS NULL AND JSON_CONTAINS_PATH(data, 'one', '$.${field.name}')`
            );
          } catch {
            // Ignore backfill errors
          }
        }
      }

      this.ensuredTables.add(slug);
      resolveLock();
    } catch (err) {
      rejectLock(err);
      throw err;
    } finally {
      this.tableLocks.delete(slug);
    }
  }

  async find(args: {
    collection: string;
    where?: any;
    limit?: number;
    page?: number;
    sort?: string;
  }): Promise<PaginatedResult> {
    if (!this.inTransaction) await this.ensureTable(args.collection);
    const tableName = this.getTableName(args.collection);

    const limit = args.limit ?? 10;
    const page = args.page ?? 1;
    const offset = (page - 1) * limit;

    // Inspect columns for promoted fields
    const existingCols = await this.getTableColumns(tableName);

    // Build WHERE clause via shared DSL translator (MySQL JSON path syntax)
    let whereSql = "";
    let whereParams: any[] = [];
    if (args.where && Object.keys(args.where).length > 0) {
      const result = parseSqlWhere(
        args.where,
        (field: string) => {
          if (field === "createdAt") return "`created_at`";
          if (field === "updatedAt") return "`updated_at`";
          if (existingCols.includes(field) && !["id", "data"].includes(field)) {
            return `\`${field}\``;
          }
          return `JSON_UNQUOTE(JSON_EXTRACT(data, '$.${field}'))`;
        },
        "?",
      );
      whereSql = `WHERE ${result.sql}`;
      whereParams = result.params;
    }

    const sort = normalizeMysqlSort(args.sort, existingCols);

    // Count with filter applied for accurate pagination
    const [countRows] = await this.query(
      `SELECT COUNT(*) AS total FROM \`${tableName}\` ${whereSql}`,
      whereParams,
    );
    const total = Number(countRows[0].total);

    // Fetch page of data
    const [rows] = await this.query(
      `SELECT * FROM \`${tableName}\` ${whereSql} ORDER BY ${sort} LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset],
    );

    const docs = rows.map((r: any) => ({
      id: r.id,
      ...JSON.parse(typeof r.data === "string" ? r.data : JSON.stringify(r.data)),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const totalPages = Math.ceil(total / limit);
    return {
      docs,
      total,
      limit,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findOne(params: { collection: string; id: string }) {
    if (!this.inTransaction) await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    const lock = this.inTransaction ? " FOR UPDATE" : "";
    const [rows] = await this.query(`SELECT * FROM \`${tableName}\` WHERE id = ?${lock}`, [params.id]);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      ...JSON.parse(typeof row.data === "string" ? row.data : JSON.stringify(row.data)),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(params: { collection: string; data: any }) {
    if (!this.inTransaction) await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);

    // Inspect columns for promoted fields
    const existingCols = await this.getTableColumns(tableName);

    const id = params.data.id ?? Math.random().toString(36).substring(7);
    const now = new Date().toISOString().replace("T", " ").replace("Z", "");

    const data = { ...params.data };
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    // Extract promoted fields
    const promotedValues: Record<string, any> = {};
    for (const col of existingCols) {
      if (["id", "data", "created_at", "updated_at"].includes(col)) continue;
      if (data[col] !== undefined) {
        promotedValues[col] = data[col];
      }
    }

    const colNames = ["id", "data", "created_at", "updated_at", ...Object.keys(promotedValues).map((k) => `\`${k}\``)];
    const placeholders = colNames.map(() => "?").join(", ");
    const values = [id, JSON.stringify(data), now, now, ...Object.values(promotedValues)];

    await this.query(`INSERT INTO \`${tableName}\` (${colNames.join(", ")}) VALUES (${placeholders})`, values);
    return { id, ...data, createdAt: now, updatedAt: now };
  }

  async update(params: { collection: string; id: string; data: any }) {
    if (!this.inTransaction) await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);

    // Inspect columns for promoted fields
    const existingCols = await this.getTableColumns(tableName);

    const existing = await this.findOne({ collection: params.collection, id: params.id });
    const now = new Date().toISOString().replace("T", " ").replace("Z", "");
    const merged = { ...(existing ?? {}), ...params.data };
    delete (merged as any).id;
    delete (merged as any).createdAt;
    delete (merged as any).updatedAt;

    // Extract promoted fields
    const promotedValues: Record<string, any> = {};
    for (const col of existingCols) {
      if (["id", "data", "created_at", "updated_at"].includes(col)) continue;
      if (merged[col] !== undefined) {
        promotedValues[col] = merged[col];
      }
    }

    const setClauses = ["data = ?", "updated_at = ?", ...Object.keys(promotedValues).map((k) => `\`${k}\` = ?`)];
    const values = [JSON.stringify(merged), now, ...Object.values(promotedValues), params.id];

    await this.query(`UPDATE \`${tableName}\` SET ${setClauses.join(", ")} WHERE id = ?`, values);
    return { id: params.id, ...merged, createdAt: existing?.createdAt, updatedAt: now };
  }

  async sync(collections: any[]) {
    for (const col of collections) {
      await this.ensureTable(col.slug, col.fields);
    }
  }

  async delete(params: { collection: string; id: string }) {
    if (!this.inTransaction) await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    await this.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [params.id]);
  }

  async getGlobal(params: { slug: string }) {
    const [rows] = await this.query("SELECT value FROM dyrected_internal WHERE `key` = ?", [
      `global_${params.slug}`,
    ]);
    const row = rows[0];
    if (!row) return {};
    return typeof row.value === "string" ? JSON.parse(row.value) : row.value;
  }

  async updateGlobal(params: { slug: string; data: any }) {
    await this.execute(
      "INSERT INTO dyrected_internal (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
      [`global_${params.slug}`, JSON.stringify(params.data)],
    );
    return params.data;
  }

  async transaction<T>(callback: (db: DatabaseAdapter) => Promise<T>): Promise<T> {
    await this.ensureInitialized();
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const scoped = Object.create(this) as MysqlAdapter;
      scoped.pool = connection;
      scoped.initPromise = Promise.resolve();
      scoped.inTransaction = true;
      const result = await callback(scoped);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /** Gracefully close the connection pool. Call on process exit. */
  async close() {
    if (this.pool) {
      await this.pool.end();
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

    const tableName = this.getTableName(args.collection);
    if (!this.inTransaction) await this.ensureTable(args.collection);

    // Inspect promoted columns.
    const existingCols = await this.getTableColumns(tableName);

    const toFieldExpr = (field: string): string => {
      if (field === "createdAt") return "`created_at`";
      if (field === "updatedAt") return "`updated_at`";
      if (existingCols.includes(field) && !["id", "data"].includes(field)) {
        return `\`${field}\``;
      }
      return `JSON_UNQUOTE(JSON_EXTRACT(data, '$.${field}'))`;
    };

    /**
     * Safe cast: invalid values become NULL.
     * MySQL REGEXP check ensures only numeric-looking strings are cast.
     */
    const toCastExpr = (rawField: string, cast: string | undefined): string => {
      const base = toFieldExpr(rawField);
      if (cast === "string") return base;
      if (cast === "boolean") return `IF(${base} IS NOT NULL, IF(${base} IN ('true','1'), 1, 0), NULL)`;
      if (cast === "date") return `CAST(${base} AS DATETIME)`;
      // number / integer / float — safe NULL on invalid input
      const sqlType = cast === "integer" ? "SIGNED" : "DECIMAL(20,6)";
      return `IF(${base} REGEXP '^-?[0-9]+(\\\\.[0-9]+)?([eE][+-]?[0-9]+)?$', CAST(${base} AS ${sqlType}), NULL)`;
    };

    const selectParts: string[] = [];
    const allParams: any[] = [];
    const isDistinctMap: Record<string, boolean> = {};

    for (const [name, op] of Object.entries(args.aggregates)) {
      let whereSql: string | null = null;
      if (op.where && Object.keys(op.where).length > 0) {
        const parsed = parseSqlWhere(op.where, toFieldExpr, "?");
        whereSql = parsed.sql;
        allParams.push(...parsed.params);
      }

      let aggExpr: string;
      if ("countDistinct" in op && typeof op.countDistinct === "string") {
        const fieldExpr = toFieldExpr(op.countDistinct);
        aggExpr = whereSql
          ? `COUNT(DISTINCT IF(${whereSql}, ${fieldExpr}, NULL))`
          : `COUNT(DISTINCT ${fieldExpr})`;
      } else if ("distinct" in op && typeof op.distinct === "string") {
        isDistinctMap[name] = true;
        const fieldExpr = toFieldExpr(op.distinct);
        aggExpr = whereSql
          ? `COALESCE(JSON_ARRAYAGG(DISTINCT IF(${whereSql}, ${fieldExpr}, NULL)), JSON_ARRAY())`
          : `COALESCE(JSON_ARRAYAGG(DISTINCT ${fieldExpr}), JSON_ARRAY())`;
      } else if ("count" in op) {
        aggExpr = whereSql ? `COUNT(IF(${whereSql}, 1, NULL))` : `COUNT(*)`;
      } else if (op.sum) {
        const val = toCastExpr(op.sum, op.cast);
        aggExpr = whereSql ? `SUM(IF(${whereSql}, ${val}, NULL))` : `SUM(${val})`;
      } else if (op.avg) {
        const val = toCastExpr(op.avg, op.cast);
        aggExpr = whereSql ? `AVG(IF(${whereSql}, ${val}, NULL))` : `AVG(${val})`;
      } else if (op.min) {
        const val = toCastExpr(op.min, op.cast);
        aggExpr = whereSql ? `MIN(IF(${whereSql}, ${val}, NULL))` : `MIN(${val})`;
      } else if (op.max) {
        const val = toCastExpr(op.max, op.cast);
        aggExpr = whereSql ? `MAX(IF(${whereSql}, ${val}, NULL))` : `MAX(${val})`;
      } else {
        aggExpr = whereSql ? `COUNT(IF(${whereSql}, 1, NULL))` : `COUNT(*)`;
      }

      selectParts.push(
        `${aggExpr} AS \`${name.replace(/`/g, "``")}\``,
      );
    }

    if (args.groupBy) {
      const groupCol = toFieldExpr(args.groupBy);
      const query = `SELECT ${groupCol} AS \`__group_key\`, ${selectParts.join(", ")} FROM \`${tableName}\` GROUP BY ${groupCol}`;
      const [rows] = await this.query(query, allParams);

      const groups: Record<string, Record<string, any>> = {};
      for (const row of (rows ?? [])) {
        const key = row.__group_key === null || row.__group_key === undefined ? "__unassigned__" : String(row.__group_key);
        const groupResult: Record<string, any> = {};
        for (const name of Object.keys(args.aggregates)) {
          const raw = row[name];
          if (isDistinctMap[name]) {
            const parsed = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : (raw ?? []));
            groupResult[name] = Array.isArray(parsed) ? parsed.filter((v: any) => v !== null && v !== undefined) : [];
          } else {
            groupResult[name] = raw === null || raw === undefined ? null : Number(raw);
          }
        }
        groups[key] = groupResult;
      }
      return { groups };
    }

    const query = `SELECT ${selectParts.join(", ")} FROM \`${tableName}\``;
    const [rows] = await this.query(query, allParams);
    const row = rows[0] ?? {};

    const result: Record<string, any> = {};
    for (const name of Object.keys(args.aggregates)) {
      const raw = row[name];
      if (isDistinctMap[name]) {
        const parsed = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : (raw ?? []));
        result[name] = Array.isArray(parsed) ? parsed.filter((v: any) => v !== null && v !== undefined) : [];
      } else {
        result[name] = raw === null || raw === undefined ? null : Number(raw);
      }
    }
    return result;
  }

  async disconnect(): Promise<void> {
    const cache = getSharedMysqlClientCache();
    const cacheKey = getMysqlCacheKey(this.config);
    cache.delete(cacheKey);
    this.ensuredTables.clear();
    this.tableColumnsCache.clear();
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // Ignore initialization failure during disconnect
      }
    }
    if (this.pool && typeof this.pool.end === "function") {
      await this.pool.end().catch(() => {});
    }
    this.initPromise = null;
    this.pool = null;
  }
}

export async function closeAllMysqlClients(): Promise<void> {
  const cache = getSharedMysqlClientCache();
  const entries = Array.from(cache.values());
  cache.clear();
  for (const entry of entries) {
    try {
      const pool = entry.pool || (await entry.initPromise);
      if (pool && typeof pool.end === "function") {
        await pool.end().catch(() => {});
      }
    } catch {
      // Ignore errors during pool teardown
    }
  }
}

export const mysqlAdapter = (config: MysqlAdapterConfig) => new MysqlAdapter(config);
