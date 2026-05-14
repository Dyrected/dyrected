import { DatabaseAdapter, PaginatedResult, parseSqlWhere } from "@dyrected/core";
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

export class MysqlAdapter implements DatabaseAdapter {
  private pool: any;

  constructor(config: MysqlAdapterConfig) {
    if (config.url) {
      this.pool = mysql.createPool(config.url);
    } else {
      this.pool = mysql.createPool({
        host: config.host ?? "localhost",
        port: config.port ?? 3306,
        user: config.user,
        password: config.password,
        database: config.database,
        // Return dates as strings for consistency with other adapters
        dateStrings: true,
      });
    }
    // Fire-and-forget: create internal table on startup
    this.initInternalTables().catch((err) => console.error("[dyrected/db-mysql] Failed to init internal tables:", err));
  }

  private async initInternalTables() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS dyrected_internal (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value JSON NOT NULL
      )
    `);
  }

  private getTableName(slug: string): string {
    return `collection_${slug}`;
  }

  private async ensureTable(slug: string, fields: any[] = []) {
    const tableName = this.getTableName(slug);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        id VARCHAR(36) PRIMARY KEY,
        data JSON NOT NULL,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      )
    `);

    // Inspect columns for promoted fields
    const [cols] = await this.pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingCols = cols.map((c: any) => c.Field);

    for (const field of fields) {
      if (field.promoted && !existingCols.includes(field.name)) {
        console.log(`[dyrected/mysql] Promoting field "${field.name}" to column in ${tableName}`);
        let sqlType = "TEXT";
        if (field.type === "number") sqlType = "DECIMAL(19,4)";
        if (field.type === "boolean") sqlType = "TINYINT(1)";

        await this.pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${field.name}\` ${sqlType}`);
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
    await this.ensureTable(args.collection);
    const tableName = this.getTableName(args.collection);

    const limit = args.limit ?? 10;
    const page = args.page ?? 1;
    const offset = (page - 1) * limit;

    // Inspect columns for promoted fields
    const [cols] = await this.pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingCols = cols.map((c: any) => c.Field);

    // Build WHERE clause via shared DSL translator (MySQL JSON path syntax)
    let whereSql = "";
    let whereParams: any[] = [];
    if (args.where && Object.keys(args.where).length > 0) {
      const result = parseSqlWhere(
        args.where,
        (field: string) => {
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

    // Normalize camelCase sort fields → snake_case columns
    const rawSort = args.sort ?? "created_at DESC";
    const sort = rawSort.replace(/\bcreatedAt\b/g, "created_at").replace(/\bupdatedAt\b/g, "updated_at");

    // Count with filter applied for accurate pagination
    const [countRows] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM \`${tableName}\` ${whereSql}`,
      whereParams,
    );
    const total = Number(countRows[0].total);

    // Fetch page of data
    const [rows] = await this.pool.query(
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
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    const [rows] = await this.pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [params.id]);
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
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);

    // Inspect columns for promoted fields
    const [cols] = await this.pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
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

    await this.pool.query(`INSERT INTO \`${tableName}\` (${colNames.join(", ")}) VALUES (${placeholders})`, values);
    return { id, ...data, createdAt: now, updatedAt: now };
  }

  async update(params: { collection: string; id: string; data: any }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);

    // Inspect columns for promoted fields
    const [cols] = await this.pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
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

    await this.pool.query(`UPDATE \`${tableName}\` SET ${setClauses.join(", ")} WHERE id = ?`, values);
    return { id: params.id, ...merged, createdAt: existing?.createdAt, updatedAt: now };
  }

  async sync(collections: any[]) {
    for (const col of collections) {
      await this.ensureTable(col.slug, col.fields);
    }
  }

  async delete(params: { collection: string; id: string }) {
    await this.ensureTable(params.collection);
    const tableName = this.getTableName(params.collection);
    await this.pool.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [params.id]);
  }

  async getGlobal(params: { slug: string }) {
    const [rows] = await this.pool.query("SELECT value FROM dyrected_internal WHERE `key` = ?", [
      `global_${params.slug}`,
    ]);
    const row = rows[0];
    if (!row) return {};
    return typeof row.value === "string" ? JSON.parse(row.value) : row.value;
  }

  async updateGlobal(params: { slug: string; data: any }) {
    await this.pool.execute(
      "INSERT INTO dyrected_internal (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
      [`global_${params.slug}`, JSON.stringify(params.data)],
    );
    return params.data;
  }

  /** Gracefully close the connection pool. Call on process exit. */
  async close() {
    await this.pool.end();
  }
}

export const mysqlAdapter = (config: MysqlAdapterConfig) => new MysqlAdapter(config);
