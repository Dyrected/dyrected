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
