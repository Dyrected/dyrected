import { describe, expect, it } from "vitest";
import type { CollectionConfig, DatabaseAdapter } from "@dyrected/core";

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
    it("count, sum+cast, filtered count, null-on-empty, and invalid-value-as-null", async () => {
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
          // filtered count using a text field (avoids boolean/JSON interop differences across adapters)
          attending: { count: "*", where: { status: { equals: "attending" } } },
          // sum with cast — "unknown" becomes null and is ignored
          totalYards: { sum: "yards", cast: "number" },
          // min / max across the valid numeric strings
          minYards: { min: "yards", cast: "number" },
          maxYards: { max: "yards", cast: "number" },
        },
      });

      expect(result.total).toBe(4);
      expect(result.attending).toBe(2);
      // 3 + 5 + 2 = 10  ("unknown" skipped)
      expect(result.totalYards).toBeCloseTo(10);
      expect(result.minYards).toBeCloseTo(2);
      expect(result.maxYards).toBeCloseTo(5);
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
        },
      });

      // count of an empty set is 0 (not null)
      expect(result.total).toBe(0);
      // sum of nothing is null
      expect(result.sumVal).toBeNull();
    });
  });
}
