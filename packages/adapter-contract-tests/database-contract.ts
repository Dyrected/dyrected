import { describe, expect, it } from "vitest";
import {
  type CollectionConfig,
  type DatabaseAdapter,
  DuplicateKeyError,
  createTaskRunner,
  defineConfig,
  defineTask,
} from "@dyrected/core";

export function runDatabaseAdapterContract(
  name: string,
  createAdapter: () => DatabaseAdapter | Promise<DatabaseAdapter>,
  options: { skip?: boolean } = {},
) {
  const suite = options.skip ? describe.skip : describe;
  suite(`${name} DatabaseAdapter contract`, () => {
    it("returns consistent CRUD, pagination, and global shapes", async () => {
      const db = await createAdapter();
      const collection = `contract-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "title", type: "text" },
          { name: "status", type: "text" },
        ],
      };

      await db.sync?.([config], []);
      const created = await db.create({
        collection,
        data: { title: "Original", status: "draft" },
      });
      expect(created).toMatchObject({ title: "Original", status: "draft" });
      expect(created.id).toEqual(expect.any(String));

      const page = await db.find({ collection, limit: 10, page: 1 });
      expect(page).toMatchObject({
        docs: expect.any(Array),
        total: 1,
        limit: 10,
        page: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });

      const updated = await db.update({
        collection,
        id: created.id,
        data: { status: "published" },
      });
      expect(updated).toMatchObject({
        id: created.id,
        title: "Original",
        status: "published",
      });

      const globalSlug = `${collection}-settings`;
      await expect(db.getGlobal({ slug: globalSlug })).resolves.toEqual({});
      await expect(
        db.updateGlobal({
          slug: globalSlug,
          data: { siteName: "Contract Site" },
        }),
      ).resolves.toEqual({ siteName: "Contract Site" });
      await expect(db.getGlobal({ slug: globalSlug })).resolves.toEqual({
        siteName: "Contract Site",
      });

      await db.delete({ collection, id: created.id });
      await expect(
        db.findOne({ collection, id: created.id }),
      ).resolves.toBeNull();
    });
  });
}

export function runAggregateAdapterContract(
  name: string,
  createAdapter: () => DatabaseAdapter | Promise<DatabaseAdapter>,
  options: { skip?: boolean } = {},
) {
  const suite = options.skip ? describe.skip : describe;
  suite(`${name} aggregate contract`, () => {
    it("count, sum+cast, avg+cast, filtered count, min, max, null-on-empty, and invalid-value-as-null", async () => {
      const db = await createAdapter();
      const collection = `agg-contract-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "status", type: "text" },
          { name: "yards", type: "text" }, // stored as string to test cast
        ],
      };

      await db.sync?.([config], []);

      // Seed: two "attending", one "not-attending", one with invalid yards
      await db.create({ collection, data: { status: "attending",     yards: "3"       } });
      await db.create({ collection, data: { status: "attending",     yards: "5"       } });
      await db.create({ collection, data: { status: "not-attending", yards: "2"       } });
      await db.create({ collection, data: { status: "not-attending", yards: "unknown" } });

      const result = await db.aggregate({
        collection,
        aggregates: {
          // count: all documents
          total: { count: "*" },
          // filtered count using a text field
          attending: { count: "*", where: { status: { equals: "attending" } } },
          // sum with cast — "unknown" becomes null and is ignored (3 + 5 + 2 = 10)
          totalYards: { sum: "yards", cast: "number" },
          // avg with cast — (3 + 5 + 2) / 3 = 3.3333...
          avgYards: { avg: "yards", cast: "number" },
          // min / max across the valid numeric strings
          minYards: { min: "yards", cast: "number" },
          maxYards: { max: "yards", cast: "number" },
        },
      });

      expect(result.total).toBe(4);
      expect(result.attending).toBe(2);
      expect(result.totalYards).toBeCloseTo(10);
      expect(result.avgYards).toBeCloseTo(10 / 3);
      expect(result.minYards).toBeCloseTo(2);
      expect(result.maxYards).toBeCloseTo(5);
    });

    it("handles native numeric fields, avg calculations, and complex where operators", async () => {
      const db = await createAdapter();
      const collection = `agg-native-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "category", type: "text" },
          { name: "score", type: "number" },
        ],
      };

      await db.sync?.([config], []);

      await db.create({ collection, data: { category: "A", score: 10 } });
      await db.create({ collection, data: { category: "A", score: 20 } });
      await db.create({ collection, data: { category: "B", score: 30 } });
      await db.create({ collection, data: { category: "C", score: 40 } });

      const result = await db.aggregate({
        collection,
        aggregates: {
          totalScore: { sum: "score" },
          avgScore: { avg: "score" },
          minScore: { min: "score" },
          maxScore: { max: "score" },
          highScoresCount: { count: "*", where: { score: { gt: 15 } } },
          categoryAorBCount: {
            count: "*",
            where: {
              OR: [
                { category: { equals: "A" } },
                { category: { equals: "B" } },
              ],
            },
          },
          categoryAAvgScore: {
            avg: "score",
            where: { category: { equals: "A" } },
          },
        },
      });

      expect(result.totalScore).toBeCloseTo(100);
      expect(result.avgScore).toBeCloseTo(25);
      expect(result.minScore).toBeCloseTo(10);
      expect(result.maxScore).toBeCloseTo(40);
      expect(result.highScoresCount).toBe(3); // 20, 30, 40
      expect(result.categoryAorBCount).toBe(3); // 2 of A, 1 of B
      expect(result.categoryAAvgScore).toBeCloseTo(15); // (10 + 20) / 2
    });

    it("returns null for metrics when matching documents contain all nulls for target field", async () => {
      const db = await createAdapter();
      const collection = `agg-nulls-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "tag", type: "text" },
          { name: "missingField", type: "text" },
        ],
      };

      await db.sync?.([config], []);

      await db.create({ collection, data: { tag: "active", missingField: null } });
      await db.create({ collection, data: { tag: "active", missingField: "invalid" } });

      const result = await db.aggregate({
        collection,
        aggregates: {
          matchedDocs: { count: "*", where: { tag: { equals: "active" } } },
          sumMissing: { sum: "missingField", cast: "number", where: { tag: { equals: "active" } } },
          avgMissing: { avg: "missingField", cast: "number", where: { tag: { equals: "active" } } },
          minMissing: { min: "missingField", cast: "number", where: { tag: { equals: "active" } } },
          maxMissing: { max: "missingField", cast: "number", where: { tag: { equals: "active" } } },
        },
      });

      expect(result.matchedDocs).toBe(2);
      expect(result.sumMissing).toBeNull();
      expect(result.avgMissing).toBeNull();
      expect(result.minMissing).toBeNull();
      expect(result.maxMissing).toBeNull();
    });

    it("handles empty aggregate objects gracefully returning empty object", async () => {
      const db = await createAdapter();
      const collection = `agg-empty-obj-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [{ name: "score", type: "number" }],
      };
      await db.sync?.([config], []);
      const result = await db.aggregate({ collection, aggregates: {} });
      expect(result).toEqual({});
    });

    it("strictly returns null for mixed alphanumeric strings like '123abc' and handles promoted numeric columns", async () => {
      const db = await createAdapter();
      const collection = `agg-promoted-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "score", type: "number", promoted: true }, // promoted column
          { name: "mixedVal", type: "text" },
        ],
      };
      await db.sync?.([config], []);

      await db.create({ collection, data: { score: 10, mixedVal: "100" } });
      await db.create({ collection, data: { score: 25, mixedVal: "123abc" } }); // mixed alphanumeric
      await db.create({ collection, data: { score: 15, mixedVal: "3 yards" } }); // mixed text

      const result = await db.aggregate({
        collection,
        aggregates: {
          promotedSum: { sum: "score" },
          promotedAvg: { avg: "score" },
          mixedSum: { sum: "mixedVal", cast: "number" },
          mixedCount: { count: "*" },
        },
      });

      expect(result.promotedSum).toBeCloseTo(50);
      expect(result.promotedAvg).toBeCloseTo(50 / 3);
      // Only "100" is valid numeric. "123abc" and "3 yards" must be null and ignored
      expect(result.mixedSum).toBeCloseTo(100);
      expect(result.mixedCount).toBe(3);
    });

    it("supports range filters, not_in operators, and special characters in alias names", async () => {
      const db = await createAdapter();
      const collection = `agg-ranges-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "tier", type: "text" },
          { name: "age", type: "number" },
        ],
      };
      await db.sync?.([config], []);

      await db.create({ collection, data: { tier: "bronze", age: 15 } });
      await db.create({ collection, data: { tier: "silver", age: 25 } });
      await db.create({ collection, data: { tier: "gold", age: 35 } });
      await db.create({ collection, data: { tier: "platinum", age: 45 } });

      const result = await db.aggregate({
        collection,
        aggregates: {
          "Total Members (Count)": { count: "*" },
          "middle_age_group:avg": {
            avg: "age",
            where: {
              age: { gte: 20, lte: 40 }, // Range: 25 and 35
            },
          },
          "non_bronze_count": {
            count: "*",
            where: {
              tier: { not_in: ["bronze"] }, // silver, gold, platinum
            },
          },
        },
      });

      expect(result["Total Members (Count)"]).toBe(4);
      expect(result["middle_age_group:avg"]).toBeCloseTo(30); // (25 + 35) / 2
      expect(result["non_bronze_count"]).toBe(3);
    });

    it("returns null for sum/avg/min/max on an empty collection", async () => {
      const db = await createAdapter();
      const collection = `agg-empty-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [{ name: "value", type: "text" }],
      };
      await db.sync?.([config], []);

      const result = await db.aggregate({
        collection,
        aggregates: {
          total: { count: "*" },
          sumVal: { sum: "value", cast: "number" },
          avgVal: { avg: "value", cast: "number" },
          minVal: { min: "value", cast: "number" },
          maxVal: { max: "value", cast: "number" },
        },
      });

      // count of an empty set is 0 (not null)
      expect(result.total).toBe(0);
      // sum/avg/min/max of nothing is null
      expect(result.sumVal).toBeNull();
      expect(result.avgVal).toBeNull();
      expect(result.minVal).toBeNull();
      expect(result.maxVal).toBeNull();
    });

    it("supports countDistinct and distinct value extractions in a single pass", async () => {
      const db = await createAdapter();
      const collection = `agg-distinct-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "category", type: "text", promoted: true },
          { name: "tag", type: "text" },
          { name: "active", type: "boolean" },
        ],
      };
      await db.sync?.([config], []);

      await db.create({ collection, data: { category: "vip", tag: "gold", active: true } });
      await db.create({ collection, data: { category: "vip", tag: "silver", active: true } });
      await db.create({ collection, data: { category: "regular", tag: "silver", active: true } });
      await db.create({ collection, data: { category: "regular", tag: "bronze", active: false } });

      const result = await db.aggregate({
        collection,
        aggregates: {
          totalRows: { count: "*" },
          uniqueCategories: { countDistinct: "category" },
          uniqueTags: { countDistinct: "tag" },
          distinctCategories: { distinct: "category" },
          distinctActiveTags: { distinct: "tag", where: { active: { equals: true } } },
        },
      });

      expect(result.totalRows).toBe(4);
      expect(result.uniqueCategories).toBe(2);
      expect(result.uniqueTags).toBe(3);
      expect(result.distinctCategories).toEqual(expect.arrayContaining(["vip", "regular"]));
      expect(result.distinctActiveTags).toEqual(expect.arrayContaining(["gold", "silver"]));
      expect(result.distinctActiveTags).not.toContain("bronze");
    });

    it("supports grouped aggregation via groupBy parameter", async () => {
      const db = await createAdapter();
      const collection = `agg-groupby-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "status", type: "text", promoted: true },
          { name: "revenue", type: "number" },
        ],
      };
      await db.sync?.([config], []);

      await db.create({ collection, data: { status: "paid", revenue: 100 } });
      await db.create({ collection, data: { status: "paid", revenue: 200 } });
      await db.create({ collection, data: { status: "pending", revenue: 50 } });

      const result = await db.aggregate({
        collection,
        groupBy: "status",
        aggregates: {
          orderCount: { count: "*" },
          totalRevenue: { sum: "revenue" },
        },
      });

      expect(result.groups).toBeDefined();
      expect(result.groups["paid"]).toEqual({ orderCount: 2, totalRevenue: 300 });
      expect(result.groups["pending"]).toEqual({ orderCount: 1, totalRevenue: 50 });
    });

    it("handles promoted numeric columns, unassigned nulls, and boolean filters in groupBy without type errors", async () => {
      const db = await createAdapter();
      const collection = `agg-edge-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "tableNumber", type: "number", promoted: true },
          { name: "attending", type: "boolean", promoted: true },
          { name: "asoebiSize", type: "select" },
          { name: "guestCount", type: "number" },
        ],
      };
      await db.sync?.([config], []);

      // 1. Attending guests with table numbers
      await db.create({ collection, data: { tableNumber: 1, attending: true, asoebiSize: "M", guestCount: 2 } });
      await db.create({ collection, data: { tableNumber: 1, attending: true, asoebiSize: "L", guestCount: 1 } });
      await db.create({ collection, data: { tableNumber: 2, attending: true, asoebiSize: "M", guestCount: 3 } });

      // 2. Attending guest without table number (unassigned)
      await db.create({ collection, data: { tableNumber: null, attending: true, asoebiSize: "S", guestCount: 1 } });

      // 3. Non-attending guest (should be filtered out when filter applies)
      await db.create({ collection, data: { tableNumber: 1, attending: false, asoebiSize: "M", guestCount: 1 } });

      // Test A: Group by promoted numeric column with boolean filter
      const resultByTable = await db.aggregate({
        collection,
        groupBy: "tableNumber",
        aggregates: {
          totalAttending: { count: "*", where: { attending: { equals: true } } },
          totalGuests: { sum: "guestCount", where: { attending: { equals: true } } },
        },
      });

      expect(resultByTable.groups).toBeDefined();
      expect(resultByTable.groups["1"]).toEqual({ totalAttending: 2, totalGuests: 3 });
      expect(resultByTable.groups["2"]).toEqual({ totalAttending: 1, totalGuests: 3 });
      expect(resultByTable.groups["__unassigned__"]).toEqual({ totalAttending: 1, totalGuests: 1 });

      // Test B: Group by unpromoted JSON field (asoebiSize) with distinct extraction
      const resultBySize = await db.aggregate({
        collection,
        groupBy: "asoebiSize",
        aggregates: {
          guestCount: { sum: "guestCount" },
        },
      });

      expect(resultBySize.groups).toBeDefined();
      expect(resultBySize.groups["M"]).toEqual({ guestCount: 6 }); // 2 + 1 + 3 (including non-attending)
      expect(resultBySize.groups["L"]).toEqual({ guestCount: 1 });
      expect(resultBySize.groups["S"]).toEqual({ guestCount: 1 });

      // Test C: Distinct on promoted numeric column without nulls in result
      const distinctTables = await db.aggregate({
        collection,
        aggregates: {
          tables: { distinct: "tableNumber", where: { attending: { equals: true } } },
        },
      });

      expect(distinctTables.tables).toBeDefined();
      expect(distinctTables.tables).not.toContain(null);
      expect(distinctTables.tables).toEqual(expect.arrayContaining([1, 2]));
    });
  });
}

export function runIntegrityAndConcurrencyAdapterContract(
  name: string,
  createAdapter: () => DatabaseAdapter | Promise<DatabaseAdapter>,
  options: { skip?: boolean } = {},
) {
  const suite = options.skip ? describe.skip : describe;
  suite(`${name} integrity & concurrency contract`, () => {
    it("generates default prefixed NanoID when no id is provided", async () => {
      const db = await createAdapter();
      const collection = `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [{ name: "name", type: "text" }],
      };
      await db.sync?.([config], []);

      const doc = await db.create({ collection, data: { name: "Alpha" } });
      expect(doc.id).toMatch(/^col_[0-9a-zA-Z]{16}$/);
    });

    it("generates custom prefixed IDs when idPrefix is configured", async () => {
      const db = await createAdapter();
      const collection = `custom-coll-${Date.now()}`;
      const config: CollectionConfig = {
        slug: collection,
        idPrefix: "cob",
        fields: [{ name: "name", type: "text" }],
      };
      await db.sync?.([config], []);

      const doc = await db.create({ collection, data: { name: "Report" } });
      expect(doc.id).toMatch(/^cob_[0-9a-zA-Z]{16}$/);
    });

    it("supports ULID, NanoID, and UUID ID strategies via collection config", async () => {
      const db = await createAdapter();

      // ULID
      const ulidColl = `ulid-${Date.now()}`;
      await db.sync?.([{ slug: ulidColl, idType: "ulid", fields: [{ name: "x", type: "text" }] }], []);
      const ulidDoc = await db.create({ collection: ulidColl, data: { x: "1" } });
      expect(ulidDoc.id).toHaveLength(26);
      expect(ulidDoc.id).toMatch(/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);

      // NanoID
      const nanoColl = `nano-${Date.now()}`;
      await db.sync?.([{ slug: nanoColl, idType: "nanoid", fields: [{ name: "x", type: "text" }] }], []);
      const nanoDoc = await db.create({ collection: nanoColl, data: { x: "1" } });
      expect(nanoDoc.id).toHaveLength(21);
      expect(nanoDoc.id).toMatch(/^[0-9a-zA-Z_-]{21}$/);

      // UUID
      const uuidColl = `uuid-${Date.now()}`;
      await db.sync?.([{ slug: uuidColl, idType: "uuid", fields: [{ name: "x", type: "text" }] }], []);
      const uuidDoc = await db.create({ collection: uuidColl, data: { x: "1" } });
      expect(uuidDoc.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it("enforces physical unique constraints with DuplicateKeyError", async () => {
      const db = await createAdapter();
      const collection = `uniq-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "code", type: "text", unique: true },
          { name: "description", type: "text" },
        ],
      };
      await db.sync?.([config], []);

      await db.create({ collection, data: { code: "TEST-1", description: "First" } });
      await expect(
        db.create({ collection, data: { code: "TEST-1", description: "Duplicate" } }),
      ).rejects.toThrow(DuplicateKeyError);
    });

    it("enforces physical composite unique indexes with DuplicateKeyError", async () => {
      const db = await createAdapter();
      const collection = `comp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "account", type: "text" },
          { name: "currency", type: "text" },
        ],
        indexes: [
          { fields: ["account", "currency"], unique: true },
        ],
      };
      await db.sync?.([config], []);

      await db.create({ collection, data: { account: "ACC-001", currency: "NGN" } });

      // Same composite key should fail
      await expect(
        db.create({ collection, data: { account: "ACC-001", currency: "NGN" } }),
      ).rejects.toThrow(DuplicateKeyError);

      // Different composite key should succeed
      const second = await db.create({ collection, data: { account: "ACC-001", currency: "USD" } });
      expect(second).toBeDefined();
      expect(second.currency).toBe("USD");
    });

    it("performs atomic numeric increments and decrements without read-modify-write races", async () => {
      const db = await createAdapter();
      const collection = `atomic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "balance", type: "number", promoted: true },
          { name: "unpromotedBalance", type: "number" },
        ],
      };
      await db.sync?.([config], []);

      const doc = await db.create({
        collection,
        data: { balance: 100, unpromotedBalance: 100 },
      });

      // Increment
      const step1 = await db.update({
        collection,
        id: doc.id,
        data: {
          balance: { increment: 50 },
          unpromotedBalance: { increment: 50 },
        },
      });
      expect(Number(step1.balance)).toBe(150);
      expect(Number(step1.unpromotedBalance)).toBe(150);

      // Decrement
      const step2 = await db.update({
        collection,
        id: doc.id,
        data: {
          balance: { decrement: 20 },
          unpromotedBalance: { decrement: 20 },
        },
      });
      expect(Number(step2.balance)).toBe(130);
      expect(Number(step2.unpromotedBalance)).toBe(130);

      // Re-fetch to ensure persistence
      const reFetched = await db.findOne({ collection, id: doc.id });
      expect(Number(reFetched?.balance)).toBe(130);
      expect(Number(reFetched?.unpromotedBalance)).toBe(130);
    });

    it("supports conditional where updates and tracks affectedRows", async () => {
      const db = await createAdapter();
      const collection = `cond-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const config: CollectionConfig = {
        slug: collection,
        fields: [
          { name: "balance", type: "number", promoted: true },
          { name: "tier", type: "text" },
        ],
      };
      await db.sync?.([config], []);

      const doc = await db.create({
        collection,
        data: { balance: 130, tier: "standard" },
      });

      // Conditional update that does NOT match: balance >= 200
      const failedCond = await db.update({
        collection,
        id: doc.id,
        where: { balance: { greater_than_equal: 200 } },
        data: { tier: "vip" },
      });
      expect((failedCond as any).affectedRows).toBe(0);

      // Verify row was not changed
      const unchanged = await db.findOne({ collection, id: doc.id });
      expect(unchanged?.tier).toBe("standard");

      // Conditional update that DOES match: balance >= 100
      const successCond = await db.update({
        collection,
        id: doc.id,
        where: { balance: { greater_than_equal: 100 } },
        data: { tier: "premium" },
      });
      expect((successCond as any).affectedRows).toBe(1);
      expect(successCond.tier).toBe("premium");

      const changed = await db.findOne({ collection, id: doc.id });
      expect(changed?.tier).toBe("premium");
    });
    it("guarantees exactly one winner among 50 concurrent inserts with the same unique value", async () => {
      const db = await createAdapter();
      const collection = `race-uniq-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await db.sync?.(
        [{ slug: collection, fields: [{ name: "external_reference", type: "text", unique: true }] }],
        [],
      );

      const results = await Promise.allSettled(
        Array.from({ length: 50 }, () =>
          db.create({ collection, data: { external_reference: "REF-1" } }),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(49);
      for (const r of rejected) expect(r.reason).toBeInstanceOf(DuplicateKeyError);

      const rows = await db.find({ collection, where: { external_reference: { equals: "REF-1" } }, limit: 100 });
      expect(rows.total).toBe(1);
    });

    it("never overdraws under 20 concurrent conditional debits", async () => {
      const db = await createAdapter();
      const collection = `race-debit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await db.sync?.(
        [{ slug: collection, fields: [{ name: "balance_minor", type: "number", promoted: true }] }],
        [],
      );
      const account = await db.create({ collection, data: { balance_minor: 5000 } });

      const debit = async () => {
        const result = await db.update({
          collection,
          where: { id: { equals: account.id }, balance_minor: { greater_than_equal: 1000 } },
          data: { balance_minor: { decrement: 1000 } },
        });
        if ((result as any).affectedRows === 0) throw new Error("Insufficient available balance");
      };

      const results = await Promise.allSettled(Array.from({ length: 20 }, debit));
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(15);

      const final = await db.findOne({ collection, id: account.id });
      expect(Number(final?.balance_minor)).toBe(0);
    });

    it("finds a single document by where and accepts a lock inside a transaction", async () => {
      const db = await createAdapter();
      const collection = `lock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await db.sync?.(
        [
          {
            slug: collection,
            fields: [
              { name: "investor", type: "text", promoted: true },
              { name: "currency", type: "text", promoted: true },
            ],
          },
        ],
        [],
      );
      const created = await db.create({ collection, data: { investor: "inv-1", currency: "NGN" } });

      const found = await db.transaction!(async (tx) =>
        tx.findOne({
          collection,
          where: { investor: { equals: "inv-1" }, currency: { equals: "NGN" } },
          lock: "for-update",
        }),
      );
      expect(found?.id).toBe(created.id);

      const missing = await db.findOne({ collection, where: { investor: { equals: "nobody" } } });
      expect(missing).toBeNull();
    });

    it("stores money fields as exact integers through atomic increments", async () => {
      const db = await createAdapter();
      const collection = `money-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await db.sync?.(
        [{ slug: collection, fields: [{ name: "balance", type: "money", promoted: true }] }],
        [],
      );
      const account = await db.create({ collection, data: { balance: 100 } });

      await Promise.all(
        Array.from({ length: 200 }, () =>
          db.update({ collection, id: account.id, data: { balance: { increment: 37 } } }),
        ),
      );

      const stored = await db.findOne({ collection, id: account.id });
      expect(stored?.balance).toBe(100 + 200 * 37);
      expect(Number.isInteger(stored?.balance)).toBe(true);
    });

    it("runs a scheduled task on exactly one of several concurrent runners", async () => {
      const db = await createAdapter();
      let runs = 0;
      const config = defineConfig({
        collections: [],
        globals: [],
        db,
        tasks: [
          defineTask({
            name: "contract:task",
            cron: "*/5 * * * *",
            run: async () => {
              runs++;
              await new Promise((r) => setTimeout(r, 20));
            },
          }),
        ],
      });
      // No manual sync: the runner registers its own lock collection.
      const start = new Date();
      await createTaskRunner(config).runDue(start); // registers the task
      const later = new Date(start.getTime() + 6 * 60_000);
      const results = (
        await Promise.all(Array.from({ length: 10 }, () => createTaskRunner(config).runDue(later)))
      ).flat();

      expect(results.filter((r) => r.status === "completed")).toHaveLength(1);
      expect(runs).toBe(1);
      const row = await db.findOne({ collection: "__task_locks", id: "contract:task" });
      expect(Number(row?.lockedUntil)).toBe(0);
      expect(row?.lastStatus).toBe("completed");
    });
  });
}
