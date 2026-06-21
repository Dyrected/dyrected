import {
  DatabaseAdapter,
  PaginatedResult,
  parseSort,
  parseSqlWhere,
} from "@dyrected/core";
import postgres from "postgres";

export interface PostgresAdapterConfig {
  url: string;
}

function escapePgIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function normalizePgSort(sort: string | undefined, existingCols: string[]) {
  return parseSort(sort)
    .map(({ field, direction }) => {
      if (field === "createdAt" || field === "created_at")
        return `"created_at" ${direction}`;
      if (field === "updatedAt" || field === "updated_at")
        return `"updated_at" ${direction}`;
      if (existingCols.includes(field) && !["id", "data"].includes(field)) {
        return `${escapePgIdentifier(field)} ${direction}`;
      }

      return `(data->>'${field.replace(/'/g, "''")}') ${direction}`;
    })
    .join(", ");
}

export class PostgresAdapter implements DatabaseAdapter {
  private sql!: postgres.Sql;
  private config: PostgresAdapterConfig;
  private initPromise: Promise<void> | null = null;
  private inTransaction = false;

  constructor(config: PostgresAdapterConfig) {
    this.config = config;
    this.ensureInitialized().catch((err) => {
      console.error(
        "[dyrected/db-postgres] Initialization promise failed:",
        err,
      );
    });
  }

  private async ensureInitialized() {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
  }

  private async initialize() {
    let dbName = "";
    let defaultUrl = "";
    try {
      const parsed = new URL(this.config.url);
      dbName = parsed.pathname.replace(/^\//, "");
      parsed.pathname = "/postgres";
      defaultUrl = parsed.toString();
    } catch (err) {
      // url might not be a valid URL string or parsed pathname is empty
    }

    if (dbName && defaultUrl) {
      try {
        const tempSql = postgres(defaultUrl, { max: 1 });
        const exists = await tempSql`
          SELECT 1 FROM pg_database WHERE datname = ${dbName}
        `;
        if (exists.length === 0) {
          await tempSql.unsafe(
            `CREATE DATABASE "${dbName.replace(/"/g, '""')}"`,
          );
          console.log(
            `[dyrected/db-postgres] Database "${dbName}" checked/created successfully`,
          );
        }
        await tempSql.end();
      } catch (err: any) {
        console.warn(
          `[dyrected/db-postgres] Auto-creation of database "${dbName}" skipped/failed:\n` +
            `  Error: ${err.message}\n` +
            `  Please ensure the database exists or your credentials have CREATEDB privileges.`,
        );
      }
    }

    this.sql = postgres(this.config.url);
    await this.initInternalTables();
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
    if (slug.includes(".")) {
      // If it's already qualified (contains a dot), trust the caller has formatted it correctly
      // e.g. "ws_123"."collection_posts"
      return this.sql.unsafe(slug);
    }
    return this.sql(`collection_${slug}`);
  }

  private async ensureTable(slug: string, fields: any[] = []) {
    await this.ensureInitialized();
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
    const existingCols = cols.map((c) => c.column_name);

    for (const field of fields) {
      if (field.promoted && !existingCols.includes(field.name)) {
        console.log(
          `[dyrected/postgres] Promoting field "${field.name}" to column in ${slug}`,
        );
        let sqlType = "TEXT";
        if (field.type === "number") sqlType = "NUMERIC";
        if (field.type === "boolean") sqlType = "BOOLEAN";

        await this.sql.unsafe(
          `ALTER TABLE ${slug.includes(".") ? slug : `collection_${slug}`} ADD COLUMN "${field.name}" ${sqlType}`,
        );
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
    await this.ensureInitialized();
    const tableSlug = args.collection;
    const tableName = tableSlug.includes(".")
      ? tableSlug
      : `"${tableSlug.startsWith("collection_") ? tableSlug : `collection_${tableSlug}`}"`;
    const limit = args.limit || 10;
    const page = args.page || 1;
    const offset = (page - 1) * limit;

    // Inspect columns for promoted fields
    const cols = await this.sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${`collection_${tableSlug}`}
    `;
    const existingCols = cols.map((c) => c.column_name);

    // Build parameterized WHERE using the shared DSL translator (Postgres JSON path)
    let whereSql = "";
    let params: any[] = [];
    if (args.where && Object.keys(args.where).length > 0) {
      const parsed = parseSqlWhere(
        args.where,
        (field: string) => {
          if (field === "createdAt") return '"created_at"';
          if (field === "updatedAt") return '"updated_at"';
          if (existingCols.includes(field) && !["id", "data"].includes(field)) {
            return `"${field}"`;
          }
          return `data->>'${field}'`;
        },
        "pg",
      );
      whereSql = `WHERE ${parsed.sql}`;
      params = parsed.params;
    }

    // Fetch total count with same filter
    const countQuery = `SELECT count(*) as total FROM ${tableName} ${whereSql}`;
    const countRes = await this.sql.unsafe(countQuery, params);
    const total = parseInt(countRes[0].total);

    const sort = normalizePgSort(args.sort, existingCols);

    const rowsQuery = `
      SELECT * FROM ${tableName}
      ${whereSql}
      ORDER BY ${sort}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const rows = await this.sql.unsafe(rowsQuery, params);

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
    await this.ensureInitialized();
    const table = this.getTableIdentifier(params.collection);
    const rows = this.inTransaction
      ? await this
          .sql`SELECT * FROM ${table} WHERE id = ${params.id} FOR UPDATE`
      : await this.sql`SELECT * FROM ${table} WHERE id = ${params.id}`;
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, ...row.data };
  }

  async create(params: { collection: string; data: any }) {
    await this.ensureInitialized();
    const table = this.getTableIdentifier(params.collection);

    // Inspect columns for promoted fields
    const cols = await this.sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${`collection_${params.collection}`}
    `;
    const existingCols = cols.map((c) => c.column_name);

    const id = params.data.id || Math.random().toString(36).substring(7);
    const data = { ...params.data };
    delete data.id;

    // Extract promoted fields
    const promotedValues: Record<string, any> = {};
    for (const col of existingCols) {
      if (["id", "data", "created_at", "updated_at"].includes(col)) continue;
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
    await this.ensureInitialized();
    const table = this.getTableIdentifier(params.collection);

    // Inspect columns for promoted fields
    const cols = await this.sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${`collection_${params.collection}`}
    `;
    const existingCols = cols.map((c) => c.column_name);

    const data = { ...params.data };
    const promotedValues: Record<string, any> = {};
    for (const col of existingCols) {
      if (["id", "data", "created_at", "updated_at"].includes(col)) continue;
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
      await this
        .sql`UPDATE ${table} SET data = data || ${data}::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = ${params.id}`;
    }

    const updated = await this.findOne({
      collection: params.collection,
      id: params.id,
    });
    return updated ?? { id: params.id, ...params.data };
  }

  async sync(collections: any[]) {
    for (const col of collections) {
      await this.ensureTable(col.slug, col.fields);
    }
  }

  async delete(params: { collection: string; id: string }) {
    await this.ensureInitialized();
    const table = this.getTableIdentifier(params.collection);
    await this.sql`DELETE FROM ${table} WHERE id = ${params.id}`;
  }

  async getGlobal(params: { slug: string }) {
    await this.ensureInitialized();
    const rows = await this
      .sql`SELECT value FROM dyrected_internal WHERE key = ${`global_${params.slug}`}`;
    const row = rows[0];
    if (!row) return {};
    return row.value;
  }

  async updateGlobal(params: { slug: string; data: any }) {
    await this.ensureInitialized();
    await this.sql`
      INSERT INTO dyrected_internal (key, value) 
      VALUES (${`global_${params.slug}`}, ${params.data})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    return params.data;
  }

  async execute(query: string, params?: any[]) {
    await this.ensureInitialized();
    if (params && params.length > 0) {
      return this.sql.unsafe(query, params);
    }
    return this.sql.unsafe(query);
  }

  async transaction<T>(
    callback: (db: DatabaseAdapter) => Promise<T>,
  ): Promise<T> {
    await this.ensureInitialized();
    return await (this.sql.begin(async (sql) => {
      const scoped = Object.create(this) as PostgresAdapter;
      scoped.sql = sql as unknown as postgres.Sql;
      scoped.initPromise = Promise.resolve();
      scoped.inTransaction = true;
      return callback(scoped);
    }) as unknown as Promise<T>);
  }

  async ping() {
    await this.ensureInitialized();
    try {
      await this.sql`SELECT 1`;
      return true;
    } catch (error) {
      console.error(
        "[dyrected-db-postgres] Database connectivity check failed:",
        error,
      );
      return false;
    }
  }
}

export const postgresAdapter = (config: PostgresAdapterConfig) =>
  new PostgresAdapter(config);
