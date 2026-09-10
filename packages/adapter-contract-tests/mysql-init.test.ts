import { describe, expect, it, vi } from "vitest";
import { MysqlAdapter } from "../db-mysql/src/index.js";

describe("MysqlAdapter ensureTable & initialization", () => {
  it("uses tableLocks to prevent duplicate ALTER TABLE execution on concurrent ensureTable calls", async () => {
    const adapter = new MysqlAdapter({ database: "test_db" });
    const executedQueries: string[] = [];

    // Mock query method
    (adapter as any).query = vi.fn(async (sql: string) => {
      const normalized = sql.replace(/\s+/g, " ").trim();
      executedQueries.push(normalized);
      if (normalized.startsWith("SHOW COLUMNS")) {
        return [[{ Field: "id" }, { Field: "data" }, { Field: "created_at" }, { Field: "updated_at" }]];
      }
      return [];
    });

    const fields = [{ name: "email", promoted: true, type: "text" }];

    // Run two ensureTable calls concurrently
    await Promise.all([
      (adapter as any).ensureTable("users", fields),
      (adapter as any).ensureTable("users", fields),
    ]);

    const alterQueries = executedQueries.filter((q) => q.includes("ALTER TABLE"));
    // Because of tableLocks and cached columns, ALTER TABLE should only run once
    expect(alterQueries.length).toBe(1);
    expect(alterQueries[0]).toContain("ALTER TABLE `collection_users` ADD COLUMN `email` TEXT");
  });

  it("gracefully catches and ignores ER_DUP_FIELDNAME during concurrent column addition", async () => {
    const adapter = new MysqlAdapter({ database: "test_db" });

    (adapter as any).query = vi.fn(async (sql: string) => {
      const normalized = sql.replace(/\s+/g, " ").trim();
      if (normalized.startsWith("SHOW COLUMNS")) {
        return [[{ Field: "id" }, { Field: "data" }]];
      }
      if (normalized.startsWith("ALTER TABLE")) {
        const err: any = new Error("Duplicate column name 'title'");
        err.code = "ER_DUP_FIELDNAME";
        err.errno = 1060;
        throw err;
      }
      return [];
    });

    const fields = [{ name: "title", promoted: true, type: "text" }];

    // Should not throw when ER_DUP_FIELDNAME is encountered
    await expect((adapter as any).ensureTable("posts", fields)).resolves.toBeUndefined();
  });

  it("supports promoting date/datetime fields to DATETIME(3) with backfill", async () => {
    const adapter = new MysqlAdapter({ database: "test_db" });
    const executedQueries: string[] = [];

    (adapter as any).query = vi.fn(async (sql: string) => {
      const normalized = sql.replace(/\s+/g, " ").trim();
      executedQueries.push(normalized);
      if (normalized.startsWith("SHOW COLUMNS")) {
        return [[{ Field: "id" }, { Field: "data" }]];
      }
      return [];
    });

    const fields = [{ name: "publishedAt", promoted: true, type: "datetime" }];

    await (adapter as any).ensureTable("articles", fields);

    const alterQuery = executedQueries.find((q) => q.includes("ALTER TABLE"));
    expect(alterQuery).toContain("ADD COLUMN `publishedAt` DATETIME(3)");

    const updateQuery = executedQueries.find((q) => q.includes("UPDATE `collection_articles` SET `publishedAt`"));
    expect(updateQuery).toBeDefined();
    expect(updateQuery).toContain("STR_TO_DATE");
  });
});
