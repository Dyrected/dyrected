import { describe, expect, it, vi } from "vitest";
import { PostgresAdapter } from "../db-postgres/src/index.js";

function createSqlMock(relationExists: boolean) {
  const calls: string[] = [];
  const sql = vi.fn((strings: TemplateStringsArray | string, ...values: unknown[]) => {
    if (typeof strings === "string") {
      return strings;
    }

    const statement = strings.reduce((result, part, index) => {
      const value = index < values.length ? String(values[index]) : "";
      return result + part + value;
    }, "");
    const normalized = statement.replace(/\s+/g, " ").trim();
    calls.push(normalized);

    if (normalized.includes("SELECT to_regclass('dyrected_internal') AS table_name")) {
      return [{ table_name: relationExists ? "dyrected_internal" : null }];
    }

    return [];
  });

  return { calls, sql };
}

describe("PostgresAdapter initInternalTables", () => {
  it("skips creating dyrected_internal when the relation already exists", async () => {
    const { calls, sql } = createSqlMock(true);
    const adapter = Object.create(PostgresAdapter.prototype) as PostgresAdapter;

    await (adapter as any).initInternalTables(sql);

    expect(calls).toEqual([
      "SELECT to_regclass('dyrected_internal') AS table_name",
    ]);
  });

  it("creates dyrected_internal when the relation is missing", async () => {
    const { calls, sql } = createSqlMock(false);
    const adapter = Object.create(PostgresAdapter.prototype) as PostgresAdapter;

    await (adapter as any).initInternalTables(sql);

    expect(calls).toEqual([
      "SELECT to_regclass('dyrected_internal') AS table_name",
      "CREATE TABLE dyrected_internal ( key TEXT PRIMARY KEY, value JSONB )",
    ]);
  });

  it("ignores duplicate_table during a concurrent create race", async () => {
    const calls: string[] = [];
    const sql = vi.fn((strings: TemplateStringsArray | string, ...values: unknown[]) => {
      if (typeof strings === "string") {
        return strings;
      }

      const statement = strings.reduce((result, part, index) => {
        const value = index < values.length ? String(values[index]) : "";
        return result + part + value;
      }, "");
      const normalized = statement.replace(/\s+/g, " ").trim();
      calls.push(normalized);

      if (normalized.includes("SELECT to_regclass('dyrected_internal') AS table_name")) {
        return [{ table_name: null }];
      }

      if (normalized.includes("CREATE TABLE dyrected_internal")) {
        throw { code: "42P07" };
      }

      return [];
    });

    const adapter = Object.create(PostgresAdapter.prototype) as PostgresAdapter;

    await expect((adapter as any).initInternalTables(sql)).resolves.toBeUndefined();
    expect(calls).toEqual([
      "SELECT to_regclass('dyrected_internal') AS table_name",
      "CREATE TABLE dyrected_internal ( key TEXT PRIMARY KEY, value JSONB )",
    ]);
  });

  it("skips collection table creation when the relation already exists", async () => {
    const calls: string[] = [];
    const sql = vi.fn((strings: TemplateStringsArray | string, ...values: unknown[]) => {
      if (typeof strings === "string") {
        return strings;
      }

      const statement = strings.reduce((result, part, index) => {
        const value = index < values.length ? String(values[index]) : "";
        return result + part + value;
      }, "");
      const normalized = statement.replace(/\s+/g, " ").trim();
      calls.push(normalized);

      if (normalized.includes("SELECT to_regclass(")) {
        return [{ table_name: "collection_pages" }];
      }

      if (normalized.includes("SELECT column_name FROM information_schema.columns")) {
        return [];
      }

      return [];
    });

    const adapter = Object.create(PostgresAdapter.prototype) as PostgresAdapter;
    (adapter as any).sql = sql;
    (adapter as any).ensureInitialized = vi.fn().mockResolvedValue(undefined);

    await (adapter as any).ensureTable("pages");

    expect(calls).toEqual([
      "SELECT to_regclass(collection_pages) AS table_name",
      "SELECT column_name FROM information_schema.columns WHERE table_name = collection_pages",
    ]);
  });

  it("creates the collection table when the relation is missing", async () => {
    const calls: string[] = [];
    const sql = vi.fn((strings: TemplateStringsArray | string, ...values: unknown[]) => {
      if (typeof strings === "string") {
        return strings;
      }

      const statement = strings.reduce((result, part, index) => {
        const value = index < values.length ? String(values[index]) : "";
        return result + part + value;
      }, "");
      const normalized = statement.replace(/\s+/g, " ").trim();
      calls.push(normalized);

      if (normalized.includes("SELECT to_regclass(")) {
        return [{ table_name: null }];
      }

      if (normalized.includes("SELECT column_name FROM information_schema.columns")) {
        return [];
      }

      return [];
    });

    const adapter = Object.create(PostgresAdapter.prototype) as PostgresAdapter;
    (adapter as any).sql = sql;
    (adapter as any).ensureInitialized = vi.fn().mockResolvedValue(undefined);

    await (adapter as any).ensureTable("pages");

    expect(calls).toEqual([
      "SELECT to_regclass(collection_pages) AS table_name",
      "CREATE TABLE IF NOT EXISTS collection_pages ( id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP )",
      "SELECT column_name FROM information_schema.columns WHERE table_name = collection_pages",
    ]);
  });
});

describe("PostgresAdapter lazy initialization and disconnect", () => {
  it("does not eagerly initialize connection in constructor", () => {
    const adapter = new PostgresAdapter({ url: "postgres://user:pass@localhost:5432/test_db" });
    expect((adapter as any).initPromise).toBeNull();
  });

  it("disconnects and closes sql client if initialized", async () => {
    const endFn = vi.fn().mockResolvedValue(undefined);
    const adapter = new PostgresAdapter({ url: "postgres://user:pass@localhost:5432/test_disconnect_db" });
    (adapter as any).sql = { end: endFn };
    (adapter as any).initPromise = Promise.resolve();

    const cacheKey = "__dyrectedPostgresClientCache";
    const cache = (globalThis as any)[cacheKey] || new Map();
    (globalThis as any)[cacheKey] = cache;
    cache.set("postgres://user:pass@localhost:5432/test_disconnect_db", { sql: (adapter as any).sql });

    await adapter.disconnect();

    expect(endFn).toHaveBeenCalledWith({ timeout: 0 });
    expect(cache.has("postgres://user:pass@localhost:5432/test_disconnect_db")).toBe(false);
    expect((adapter as any).initPromise).toBeNull();
  });
});
