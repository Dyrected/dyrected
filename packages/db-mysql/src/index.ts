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

  private async ensureInitialized() {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
  }

  private async initialize() {
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
        const tempConn = (await mysql.createConnection(serverConfig)) as any;
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await tempConn.end();
        console.log(`[dyrected/db-mysql] Database "${dbName}" checked/created successfully`);
      } catch (err: any) {
        console.warn(`[dyrected/db-mysql] Auto-creation of database "${dbName}" skipped/failed:`, err.message);
        if (err.code === "EADDRNOTAVAIL" || err.message?.includes("EADDRNOTAVAIL")) {
          this.handleConnectionError(err);
        }
      }
    }

    if (config.url) {
      this.pool = mysql.createPool(config.url);
    } else {
      this.pool = mysql.createPool({
        host: config.host ?? "localhost",
        port: config.port ?? 3306,
        user: config.user,
        password: config.password,
        database: config.database,
        dateStrings: true,
      });
    }

    // Initialize internal tables
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS dyrected_internal (
          \`key\` VARCHAR(255) PRIMARY KEY,
          value JSON NOT NULL
        )
      `);
    } catch (err: any) {
      this.handleConnectionError(err);
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
    return `collection_${slug}`;
  }

  private async ensureTable(slug: string, fields: any[] = []) {
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
    const [cols] = await this.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingCols = cols.map((c: any) => c.Field);

    for (const field of fields) {
      if (field.promoted && !existingCols.includes(field.name)) {
        console.log(`[dyrected/mysql] Promoting field "${field.name}" to column in ${tableName}`);
        let sqlType = "TEXT";
        if (field.type === "number") sqlType = "DECIMAL(19,4)";
        if (field.type === "boolean") sqlType = "TINYINT(1)";

        await this.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${field.name}\` ${sqlType}`);
      }
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
    const [cols] = await this.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingCols = cols.map((c: any) => c.Field);

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
    const [cols] = await this.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingCols = cols.map((c: any) => c.Field);

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
    const [cols] = await this.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingCols = cols.map((c: any) => c.Field);

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
  }): Promise<Record<string, number | null>> {
    if (Object.keys(args.aggregates).length === 0) {
      return {};
    }

    const tableName = this.getTableName(args.collection);
    if (!this.inTransaction) await this.ensureTable(args.collection);

    // Inspect promoted columns.
    const [cols] = await this.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingCols = cols.map((c: any) => c.Field);

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

    for (const [name, op] of Object.entries(args.aggregates)) {
      let whereSql: string | null = null;
      if (op.where && Object.keys(op.where).length > 0) {
        const parsed = parseSqlWhere(op.where, toFieldExpr, "?");
        whereSql = parsed.sql;
        allParams.push(...parsed.params);
      }

      let aggExpr: string;
      if ("count" in op) {
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

    const query = `SELECT ${selectParts.join(", ")} FROM \`${tableName}\``;
    const [rows] = await this.query(query, allParams);
    const row = rows[0] ?? {};

    const result: Record<string, number | null> = {};
    for (const name of Object.keys(args.aggregates)) {
      const raw = row[name];
      result[name] = raw === null || raw === undefined ? null : Number(raw);
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
    if (this.pool && typeof this.pool.end === "function") {
      await this.pool.end().catch(() => {});
    }
    this.initPromise = null;
    this.pool = null;
  }
}

export const mysqlAdapter = (config: MysqlAdapterConfig) => new MysqlAdapter(config);
