import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDyrectedApp } from "../app.js";
import { defineConfig, defineCollection } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";
import {
  TRASH_COLLECTION,
  TRASH_COLLECTION_CONFIG,
  getTrashEntryId,
  resolveTrashConfig,
  assertValidTrashInConfig,
  createTrashPurgeTask,
} from "../trash.js";
import { createTaskRunner, defineTask } from "../tasks.js";
import type { StorageAdapter } from "../types/index.js";

describe("Trash & Retention System (Phase 1)", () => {
  describe("Config Resolution & Diagnostics", () => {
    it("resolves config according to specification truth table", () => {
      const colDefault = defineCollection({ slug: "c1", fields: [] });
      const colExplicitFalse = defineCollection({ slug: "c2", trash: false, fields: [] });
      const colExplicitTrue = defineCollection({ slug: "c3", trash: true, fields: [] });
      const colCustom = defineCollection({
        slug: "c4",
        trash: { retentionDays: 7, allowPermanentDelete: false },
        fields: [],
      });
      const colNoPurge = defineCollection({
        slug: "c5",
        trash: { retentionDays: null },
        fields: [],
      });

      // 1. App default (trash omitted: enabled by default with 30-day retention)
      const appDefault = defineConfig({ collections: [], globals: [], db: new InMemoryAdapter() });
      expect(resolveTrashConfig(colDefault, appDefault as any)).toEqual({
        enabled: true,
        retentionDays: 30,
        allowPermanentDelete: true,
      });
      expect(resolveTrashConfig(colExplicitFalse, appDefault as any)).toEqual({
        enabled: false,
        retentionDays: null,
        allowPermanentDelete: true,
      });
      expect(resolveTrashConfig(colExplicitTrue, appDefault as any)).toEqual({
        enabled: true,
        retentionDays: 30,
        allowPermanentDelete: true,
      });
      expect(resolveTrashConfig(colCustom, appDefault as any)).toEqual({
        enabled: true,
        retentionDays: 7,
        allowPermanentDelete: false,
      });
      expect(resolveTrashConfig(colNoPurge, appDefault as any)).toEqual({
        enabled: true,
        retentionDays: null,
        allowPermanentDelete: true,
      });

      // 2. App disabled (trash.enabled = false)
      const appDisabled = defineConfig({
        collections: [],
        globals: [],
        db: new InMemoryAdapter(),
        trash: { enabled: false },
      });
      expect(resolveTrashConfig(colDefault, appDisabled as any)).toEqual({
        enabled: false,
        retentionDays: null,
        allowPermanentDelete: true,
      });
      // Collection explicit true overrides app disabled
      expect(resolveTrashConfig(colExplicitTrue, appDisabled as any)).toEqual({
        enabled: true,
        retentionDays: 30,
        allowPermanentDelete: true,
      });

      // 3. App custom defaults (custom retentionDays & allowPermanentDelete)
      const appCustom = defineConfig({
        collections: [],
        globals: [],
        db: new InMemoryAdapter(),
        trash: { retentionDays: 60, allowPermanentDelete: false },
      });
      expect(resolveTrashConfig(colDefault, appCustom as any)).toEqual({
        enabled: true,
        retentionDays: 60,
        allowPermanentDelete: false,
      });
      expect(resolveTrashConfig(colExplicitTrue, appCustom as any)).toEqual({
        enabled: true,
        retentionDays: 60,
        allowPermanentDelete: false,
      });
    });

    it("rejects invalid retentionDays < 1", () => {
      const colInvalid = defineCollection({
        slug: "invalid",
        trash: { retentionDays: 0 },
        fields: [],
      });
      expect(() => {
        assertValidTrashInConfig({ collections: [colInvalid] } as any, "test");
      }).toThrow(/Invalid trash retentionDays/);
    });

    it("rejects trash on system collections", () => {
      const colSystem = defineCollection({
        slug: "__audit",
        trash: true,
        fields: [],
      });
      expect(() => {
        assertValidTrashInConfig({ collections: [colSystem] } as any, "test");
      }).toThrow(/System collection "__audit" cannot enable trash/);
    });

    it("warns on unusually large retentionDays > 3650", () => {
      const warnLogs: any[] = [];
      const mockLogger: any = {
        warn: (...args: any[]) => { warnLogs.push(args); },
        info: () => {},
        error: () => {},
        debug: () => {},
        child: () => mockLogger,
      };
      const colLarge = defineCollection({
        slug: "large",
        trash: { retentionDays: 4000 },
        fields: [],
      });
      assertValidTrashInConfig({ collections: [colLarge], logger: mockLogger } as any, "test");
      expect(warnLogs.length).toBeGreaterThan(0);
    });
  });

  describe("Trash Move, Soft Delete & Read Path Safety", () => {
    let db: InMemoryAdapter;
    let app: any;

    beforeEach(async () => {
      db = new InMemoryAdapter();
      db.seed("posts", [
        { id: "post-1", title: "First Post", slug: "first-post", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" },
        { id: "post-2", title: "Second Post", slug: "second-post", createdAt: "2025-01-02T00:00:00.000Z", updatedAt: "2025-01-02T00:00:00.000Z" },
      ]);

      const config = defineConfig({
        collections: [
          defineCollection({
            slug: "posts",
            fields: [
              { name: "title", type: "text" },
              { name: "slug", type: "text", unique: true },
            ],
            trash: { retentionDays: 14 },
          }),
        ],
        globals: [],
        db,
      });
      app = await createDyrectedApp(config);
    });

    it("moves document to __trash with deterministic id and removes it from active collection", async () => {
      const res = await app.request("/api/collections/posts/post-1", {
        method: "DELETE",
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("message");
      expect(data.trashed).toBe(true);
      expect(data.purgeAt).toBeDefined();

      // Read path safety: doc is gone from active collection
      const getRes = await app.request("/api/collections/posts/post-1");
      expect(getRes.status).toBe(404);

      const listRes = await app.request("/api/collections/posts");
      const listData = await listRes.json();
      expect(listData.total).toBe(1);
      expect(listData.docs[0].id).toBe("post-2");

      // Document exists in __trash
      const trashEntry = await db.findOne({
        collection: TRASH_COLLECTION,
        id: getTrashEntryId("posts", "post-1"),
      });
      expect(trashEntry).not.toBeNull();
      expect(trashEntry!.collection).toBe("posts");
      expect(trashEntry!.docId).toBe("post-1");
      expect(trashEntry!.title).toBe("First Post");
      expect(trashEntry!.snapshot).toMatchObject({ id: "post-1", title: "First Post", slug: "first-post" });

      // Unique field is freed: can create new document with slug "first-post"
      const createRes = await app.request("/api/collections/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New First Post", slug: "first-post" }),
      });
      expect(createRes.status).toBe(201);
    });

    it("performs permanent hard delete when ?permanent=true is passed", async () => {
      const res = await app.request("/api/collections/posts/post-1?permanent=true", {
        method: "DELETE",
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.permanent).toBe(true);

      const trashEntry = await db.findOne({
        collection: TRASH_COLLECTION,
        id: getTrashEntryId("posts", "post-1"),
      });
      expect(trashEntry).toBeNull();
    });

    it("bulk deletes documents to trash and supports permanent bulk delete", async () => {
      const res = await app.request("/api/collections/posts/delete-many", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["post-1", "post-2"] }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.trashed).toEqual(expect.arrayContaining(["post-1", "post-2"]));
      expect(data.deleted).toEqual(expect.arrayContaining(["post-1", "post-2"]));

      const listRes = await app.request("/api/collections/posts");
      const listData = await listRes.json();
      expect(listData.total).toBe(0);

      const entry1 = await db.findOne({ collection: TRASH_COLLECTION, id: "posts:post-1" });
      const entry2 = await db.findOne({ collection: TRASH_COLLECTION, id: "posts:post-2" });
      expect(entry1).not.toBeNull();
      expect(entry2).not.toBeNull();
    });
  });

  describe("Enforcement of allowPermanentDelete: false", () => {
    let db: InMemoryAdapter;
    let app: any;

    beforeEach(async () => {
      db = new InMemoryAdapter();
      db.seed("strict", [{ id: "s-1", name: "Strict Doc" }]);

      const config = defineConfig({
        collections: [
          defineCollection({
            slug: "strict",
            fields: [{ name: "name", type: "text" }],
            trash: { allowPermanentDelete: false },
          }),
        ],
        globals: [],
        db,
      });
      app = await createDyrectedApp(config);
    });

    it("rejects permanent delete with 403", async () => {
      const res = await app.request("/api/collections/strict/s-1?permanent=true", {
        method: "DELETE",
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.message).toMatch(/Permanent deletion is not allowed/);
    });

    it("rejects empty trash with 403", async () => {
      const res = await app.request("/api/collections/strict/trash?confirm=strict", {
        method: "DELETE",
      });
      expect(res.status).toBe(403);
    });
  });

  describe("Hook Lifecycle Execution", () => {
    let db: InMemoryAdapter;
    let hookCalls: string[] = [];

    beforeEach(async () => {
      db = new InMemoryAdapter();
      hookCalls = [];
      db.seed("items", [{ id: "item-1", title: "Item 1" }]);
    });

    it("fires beforeDelete (mode: trash), beforeTrash, and afterTrash on soft delete; skips afterDelete", async () => {
      const config = defineConfig({
        collections: [
          defineCollection({
            slug: "items",
            fields: [{ name: "title", type: "text" }],
            trash: true,
            hooks: {
              beforeDelete: [
                async ({ mode }) => {
                  hookCalls.push(`beforeDelete:${mode}`);
                },
              ],
              afterDelete: [
                async ({ mode }) => {
                  hookCalls.push(`afterDelete:${mode}`);
                },
              ],
              beforeTrash: [
                async ({ id }) => {
                  hookCalls.push(`beforeTrash:${id}`);
                },
              ],
              afterTrash: [
                async ({ id }) => {
                  hookCalls.push(`afterTrash:${id}`);
                },
              ],
            },
          }),
        ],
        globals: [],
        db,
      });
      const app = await createDyrectedApp(config);

      await app.request("/api/collections/items/item-1", { method: "DELETE" });

      expect(hookCalls).toEqual([
        "beforeDelete:trash",
        "beforeTrash:item-1",
        "afterTrash:item-1",
      ]);
      expect(hookCalls).not.toContain("afterDelete:trash");
    });

    it("fires beforeDelete (mode: permanent) and afterDelete (mode: permanent) on hard delete", async () => {
      const config = defineConfig({
        collections: [
          defineCollection({
            slug: "items",
            fields: [{ name: "title", type: "text" }],
            trash: true,
            hooks: {
              beforeDelete: [
                async ({ mode }) => {
                  hookCalls.push(`beforeDelete:${mode}`);
                },
              ],
              afterDelete: [
                async ({ mode }) => {
                  hookCalls.push(`afterDelete:${mode}`);
                },
              ],
              beforeTrash: [
                async () => {
                  hookCalls.push("beforeTrash");
                },
              ],
            },
          }),
        ],
        globals: [],
        db,
      });
      const app = await createDyrectedApp(config);

      await app.request("/api/collections/items/item-1?permanent=true", { method: "DELETE" });

      expect(hookCalls).toEqual([
        "beforeDelete:permanent",
        "afterDelete:permanent",
      ]);
      expect(hookCalls).not.toContain("beforeTrash");
    });

    it("fires beforeRestore and afterRestore on restore; does NOT fire beforeChange/afterChange", async () => {
      const config = defineConfig({
        collections: [
          defineCollection({
            slug: "items",
            fields: [{ name: "title", type: "text" }],
            trash: true,
            hooks: {
              beforeChange: [
                async () => {
                  hookCalls.push("beforeChange");
                },
              ],
              afterChange: [
                async () => {
                  hookCalls.push("afterChange");
                },
              ],
              beforeRestore: [
                async ({ id, doc }) => {
                  hookCalls.push(`beforeRestore:${id}:${(doc as any).title}`);
                },
              ],
              afterRestore: [
                async ({ doc }) => {
                  hookCalls.push(`afterRestore:${doc.id}:${doc.title}`);
                },
              ],
            },
          }),
        ],
        globals: [],
        db,
      });
      const app = await createDyrectedApp(config);

      // 1. Move to trash
      await app.request("/api/collections/items/item-1", { method: "DELETE" });
      hookCalls = [];

      // 2. Restore
      const restoreRes = await app.request("/api/collections/items/trash/items:item-1/restore", {
        method: "POST",
      });
      expect(restoreRes.status).toBe(200);

      expect(hookCalls).toEqual([
        "beforeRestore:item-1:Item 1",
        "afterRestore:item-1:Item 1",
      ]);
      expect(hookCalls).not.toContain("beforeChange");
      expect(hookCalls).not.toContain("afterChange");
    });
  });

  describe("Trash Endpoints: Listing, Keep, Purge, and Empty Trash", () => {
    let db: InMemoryAdapter;
    let app: any;

    beforeEach(async () => {
      db = new InMemoryAdapter();
      const config = defineConfig({
        collections: [
          defineCollection({
            slug: "articles",
            fields: [{ name: "headline", type: "text" }],
            trash: { retentionDays: 30 },
            admin: { useAsTitle: "headline" },
          }),
          defineCollection({
            slug: "products",
            fields: [{ name: "name", type: "text" }],
            trash: true,
          }),
        ],
        globals: [],
        db,
      });

      db.seed(TRASH_COLLECTION, [
        {
          id: "articles:art-1",
          collection: "articles",
          docId: "art-1",
          deletedAt: 1000,
          purgeAt: 2000,
          title: "First Article",
          snapshot: { id: "art-1", headline: "First Article" },
        },
        {
          id: "articles:art-2",
          collection: "articles",
          docId: "art-2",
          deletedAt: 1000,
          purgeAt: 3000,
          title: "Second Article",
          snapshot: { id: "art-2", headline: "Second Article" },
        },
        {
          id: "products:prod-1",
          collection: "products",
          docId: "prod-1",
          deletedAt: 1000,
          purgeAt: 2500,
          title: "Product 1",
          snapshot: { id: "prod-1", name: "Product 1" },
        },
      ]);

      app = await createDyrectedApp(config);
    });

    it("lists trash entries for a specific collection", async () => {
      const res = await app.request("/api/collections/articles/trash");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBe(2);
      expect(data.docs.map((d: any) => d.docId)).toEqual(expect.arrayContaining(["art-1", "art-2"]));
    });

    it("lists trash entries across all collections via /api/trash", async () => {
      const res = await app.request("/api/trash");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBe(3);
    });

    it("gets a single trash entry", async () => {
      const res = await app.request("/api/collections/articles/trash/articles:art-1");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.docId).toBe("art-1");
      expect(data.snapshot.headline).toBe("First Article");
    });

    it("updates trash entry retention with keep: true (sets purgeAt: null)", async () => {
      const res = await app.request("/api/collections/articles/trash/articles:art-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keep: true }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.purgeAt).toBeNull();

      const entry = await db.findOne({ collection: TRASH_COLLECTION, id: "articles:art-1" });
      expect(entry!.purgeAt).toBeNull();
    });

    it("purges a single trash entry", async () => {
      const res = await app.request("/api/collections/articles/trash/articles:art-1", {
        method: "DELETE",
      });
      expect(res.status).toBe(200);

      const entry = await db.findOne({ collection: TRASH_COLLECTION, id: "articles:art-1" });
      expect(entry).toBeNull();
    });

    it("empties trash when confirm query parameter matches collection slug", async () => {
      const failRes = await app.request("/api/collections/articles/trash", {
        method: "DELETE",
      });
      expect(failRes.status).toBe(400);

      const wrongRes = await app.request("/api/collections/articles/trash?confirm=wrong", {
        method: "DELETE",
      });
      expect(wrongRes.status).toBe(400);

      const successRes = await app.request("/api/collections/articles/trash?confirm=articles", {
        method: "DELETE",
      });
      expect(successRes.status).toBe(200);

      const remaining = await db.find({
        collection: TRASH_COLLECTION,
        where: { collection: "articles" },
      });
      expect(remaining.total).toBe(0);

      // Products remain untouched
      const prodEntry = await db.findOne({ collection: TRASH_COLLECTION, id: "products:prod-1" });
      expect(prodEntry).not.toBeNull();
    });
  });

  describe("Restore & 409 Conflict Handling", () => {
    let db: InMemoryAdapter;
    let app: any;

    beforeEach(async () => {
      db = new InMemoryAdapter();
      const config = defineConfig({
        collections: [
          defineCollection({
            slug: "posts",
            fields: [
              { name: "title", type: "text" },
              { name: "slug", type: "text", unique: true },
            ],
            trash: true,
          }),
        ],
        globals: [],
        db,
      });

      const createdAt = "2024-05-01T00:00:00.000Z";
      db.seed(TRASH_COLLECTION, [
        {
          id: "posts:p-100",
          collection: "posts",
          docId: "p-100",
          deletedAt: 1000,
          purgeAt: 2000,
          title: "Original Post",
          createdAt,
          snapshot: { id: "p-100", title: "Original Post", slug: "awesome-post", createdAt },
        },
      ]);

      app = await createDyrectedApp(config);
    });

    it("restores document with original id, original createdAt, and updated updatedAt", async () => {
      const res = await app.request("/api/collections/posts/trash/posts:p-100/restore", {
        method: "POST",
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe("p-100");
      expect(data.title).toBe("Original Post");
      expect(data.createdAt).toBe("2024-05-01T00:00:00.000Z");
      expect(data.updatedAt).toBeDefined();

      // Removed from __trash
      const trash = await db.findOne({ collection: TRASH_COLLECTION, id: "posts:p-100" });
      expect(trash).toBeNull();

      // Available in active collection
      const active = await db.findOne({ collection: "posts", id: "p-100" });
      expect(active).not.toBeNull();
    });

    it("returns 409 Conflict when active document with same id exists", async () => {
      db.seed("posts", [{ id: "p-100", title: "A new doc that reused the id" }]);

      const res = await app.request("/api/collections/posts/trash/posts:p-100/restore", {
        method: "POST",
      });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe("restore-conflict");
      expect(data.conflicts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "id", existingDocId: "p-100" }),
        ]),
      );
    });

    it("returns 409 Conflict when unique field collides with active document", async () => {
      db.seed("posts", [{ id: "other-id", title: "Collision", slug: "awesome-post" }]);

      const res = await app.request("/api/collections/posts/trash/posts:p-100/restore", {
        method: "POST",
      });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe("restore-conflict");
      expect(data.conflicts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "slug", value: "awesome-post", existingDocId: "other-id" }),
        ]),
      );
    });

    it("resolves unique conflict when overrides are supplied in restore payload", async () => {
      db.seed("posts", [{ id: "other-id", title: "Collision", slug: "awesome-post" }]);

      const res = await app.request("/api/collections/posts/trash/posts:p-100/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrides: { slug: "awesome-post-restored" },
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe("p-100");
      expect(data.slug).toBe("awesome-post-restored");

      const active = await db.findOne({ collection: "posts", id: "p-100" });
      expect(active!.slug).toBe("awesome-post-restored");
    });

    it("restores multiple documents with /restore-many", async () => {
      db.seed(TRASH_COLLECTION, [
        {
          id: "posts:p-101",
          collection: "posts",
          docId: "p-101",
          deletedAt: 1000,
          purgeAt: 2000,
          title: "Post 101",
          snapshot: { id: "p-101", title: "Post 101", slug: "p101" },
        },
      ]);

      const res = await app.request("/api/collections/posts/trash/restore-many", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["posts:p-100", "posts:p-101"] }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.restored).toEqual(expect.arrayContaining(["p-100", "p-101"]));

      const p100 = await db.findOne({ collection: "posts", id: "p-100" });
      const p101 = await db.findOne({ collection: "posts", id: "p-101" });
      expect(p100).not.toBeNull();
      expect(p101).not.toBeNull();
    });
  });

  describe("Access Control & Field Read Stripping", () => {
    it("denies access to trash and restore when access.delete or access.restore returns false", async () => {
      const db = new InMemoryAdapter();
      db.seed(TRASH_COLLECTION, [
        {
          id: "secret:s-1",
          collection: "secret",
          docId: "s-1",
          deletedAt: 1000,
          purgeAt: 2000,
          title: "Secret",
          snapshot: { id: "s-1", text: "confidential" },
        },
      ]);

      const config = defineConfig({
        collections: [
          defineCollection({
            slug: "secret",
            fields: [{ name: "text", type: "text" }],
            trash: true,
            access: {
              delete: () => false,
            },
          }),
        ],
        globals: [],
        db,
      });
      const app = await createDyrectedApp(config);

      const listRes = await app.request("/api/collections/secret/trash");
      expect(listRes.status).toBe(403);

      const getRes = await app.request("/api/collections/secret/trash/secret:s-1");
      expect(getRes.status).toBe(403);

      const restoreRes = await app.request("/api/collections/secret/trash/secret:s-1/restore", {
        method: "POST",
      });
      expect(restoreRes.status).toBe(403);
    });

    it("strips fields where access.read is false from trash snapshot", async () => {
      const db = new InMemoryAdapter();
      db.seed(TRASH_COLLECTION, [
        {
          id: "members:m-1",
          collection: "members",
          docId: "m-1",
          deletedAt: 1000,
          purgeAt: 2000,
          title: "Alice",
          snapshot: { id: "m-1", name: "Alice", ssn: "000-11-2222" },
        },
      ]);

      const config = defineConfig({
        collections: [
          defineCollection({
            slug: "members",
            fields: [
              { name: "name", type: "text" },
              { name: "ssn", type: "text", access: { read: () => false } },
            ],
            trash: true,
          }),
        ],
        globals: [],
        db,
      });
      const app = await createDyrectedApp(config);

      const res = await app.request("/api/collections/members/trash/members:m-1");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.snapshot.name).toBe("Alice");
      expect(data.snapshot.ssn).toBeUndefined();
    });
  });

  describe("Media Deferral (Storage File Preservation & Purge)", () => {
    it("preserves storage file on soft delete, and deletes on purge", async () => {
      const db = new InMemoryAdapter();
      const deletedFiles: string[] = [];
      const storage: StorageAdapter = {
        upload: async () => ({
          filename: "test.png",
          url: "/uploads/test.png",
          mimeType: "image/png",
          filesize: 1024,
        }),
        delete: async ({ filename }) => {
          deletedFiles.push(filename);
        },
        getURL: ({ filename }) => `/uploads/${filename}`,
      };

      db.seed("media", [
        {
          id: "media-1",
          filename: "test.png",
          mimeType: "image/png",
          filesize: 1024,
          sizes: {
            thumbnail: { filename: "test-thumb.png", width: 100, height: 100 },
          },
        },
      ]);

      const config = defineConfig({
        collections: [
          defineCollection({
            slug: "media",
            upload: true,
            trash: true,
            fields: [],
          }),
        ],
        globals: [],
        db,
        storage,
      });
      const app = await createDyrectedApp(config);

      // 1. Soft delete
      const delRes = await app.request("/api/collections/media/media-1", { method: "DELETE" });
      expect(delRes.status).toBe(200);
      // File should NOT be deleted from storage yet
      expect(deletedFiles).toHaveLength(0);

      // 2. Purge trash entry
      const purgeRes = await app.request("/api/collections/media/trash/media:media-1", {
        method: "DELETE",
      });
      expect(purgeRes.status).toBe(200);
      // File and thumbnail variant deleted
      expect(deletedFiles).toEqual(expect.arrayContaining(["test.png", "test-thumb.png"]));
    });
  });

  describe("Purge Task & Task Runner Auto-Registration", () => {
    it("purges expired documents and skips non-expired or kept documents", async () => {
      const db = new InMemoryAdapter();
      const now = Date.now();
      db.seed(TRASH_COLLECTION, [
        {
          id: "posts:expired-1",
          collection: "posts",
          docId: "expired-1",
          deletedAt: now - 20000,
          purgeAt: now - 10000,
          title: "Expired 1",
          snapshot: { id: "expired-1" },
        },
        {
          id: "posts:future-1",
          collection: "posts",
          docId: "future-1",
          deletedAt: now - 5000,
          purgeAt: now + 50000,
          title: "Future 1",
          snapshot: { id: "future-1" },
        },
        {
          id: "posts:kept-1",
          collection: "posts",
          docId: "kept-1",
          deletedAt: now - 20000,
          purgeAt: null,
          title: "Kept 1",
          snapshot: { id: "kept-1" },
        },
      ]);

      const config = defineConfig({
        collections: [
          defineCollection({
            slug: "posts",
            trash: { retentionDays: 7 },
            fields: [],
          }),
        ],
        globals: [],
        db,
      });

      const purgeTask = createTrashPurgeTask(config as any);
      await purgeTask.run({ db, logger: console, signal: new AbortController().signal });

      // expired-1 is purged
      expect(await db.findOne({ collection: TRASH_COLLECTION, id: "posts:expired-1" })).toBeNull();
      // future-1 and kept-1 remain
      expect(await db.findOne({ collection: TRASH_COLLECTION, id: "posts:future-1" })).not.toBeNull();
      expect(await db.findOne({ collection: TRASH_COLLECTION, id: "posts:kept-1" })).not.toBeNull();
    });

    it("auto-registers dyrected:trash-purge in createTaskRunner when retention is configured", () => {
      const db = new InMemoryAdapter();
      const configWithRetention = defineConfig({
        collections: [
          defineCollection({
            slug: "posts",
            trash: { retentionDays: 30 },
            fields: [],
          }),
        ],
        globals: [],
        db,
      });

      const runner = createTaskRunner(configWithRetention as any);
      expect(runner.getTasks().map((t) => t.name)).toContain("dyrected:trash-purge");

      const configDisabled = defineConfig({
        collections: [
          defineCollection({
            slug: "posts",
            trash: false,
            fields: [],
          }),
        ],
        globals: [],
        db,
        trash: { enabled: false },
      });

      const runnerDisabled = createTaskRunner(configDisabled as any);
      expect(runnerDisabled.getTasks().map((t) => t.name)).not.toContain("dyrected:trash-purge");
    });
  });
});
