import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDyrectedApp } from "../app.js";
import { InMemoryAdapter } from "./mocks.js";
import { defineCollection, defineConfig, defineGlobal } from "../index.js";
import { createReadonlyDb } from "../utils/readonly-db.js";

describe("Backend hooks integration", () => {
  let db: InMemoryAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    db = new InMemoryAdapter();
  });

  it("should run beforeChange and transform data before database write, and trigger afterChange", async () => {
    const beforeChangeSpy = vi.fn(({ data }) => ({ ...data, title: data.title + " - processed" }));
    const afterChangeSpy = vi.fn();

    const posts = defineCollection({
      slug: "posts",
      hooks: {
        beforeChange: [beforeChangeSpy],
        afterChange: [afterChangeSpy],
      },
      fields: [{ name: "title", type: "text", required: true }],
    });

    const config = defineConfig({
      collections: [posts],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);

    const res = await app.request("/api/collections/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "My Post" }),
    });

    expect(res.status).toBe(201);
    expect(beforeChangeSpy).toHaveBeenCalled();
    expect(afterChangeSpy).toHaveBeenCalled();

    const dbDocs = await db.find({ collection: "posts" });
    expect(dbDocs.docs[0].title).toBe("My Post - processed");
  });

  it("should chain multiple hooks sequentially", async () => {
    const hook1 = vi.fn(({ data }) => ({ ...data, value: data.value + 10 }));
    const hook2 = vi.fn(({ data }) => ({ ...data, value: data.value * 2 }));

    const numbers = defineCollection({
      slug: "numbers",
      hooks: {
        beforeChange: [hook1, hook2],
      },
      fields: [{ name: "value", type: "number" }],
    });

    const config = defineConfig({
      collections: [numbers],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);

    const res = await app.request("/api/collections/numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: 5 }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.value).toBe(30); // (5 + 10) * 2
  });

  it("should abort database write and return error if a beforeChange hook throws", async () => {
    const throwingHook = vi.fn(() => {
      throw new Error("Validation failed in hook");
    });

    const strictlyValidated = defineCollection({
      slug: "validated",
      hooks: {
        beforeChange: [throwingHook],
      },
      fields: [{ name: "title", type: "text" }],
    });

    const config = defineConfig({
      collections: [strictlyValidated],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);

    const res = await app.request("/api/collections/validated", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Failing Post" }),
    });

    expect(res.status).toBe(500);
    const dbDocs = await db.find({ collection: "validated" });
    expect(dbDocs.total).toBe(0);
  });

  it("should run field-level beforeChange and afterRead hooks recursively", async () => {
    const fieldBeforeChangeSpy = vi.fn(({ value }) => value?.toUpperCase());
    const fieldAfterReadSpy = vi.fn(({ value }) => `masked-${value}`);

    const users = defineCollection({
      slug: "users",
      fields: [
        {
          name: "username",
          type: "text",
          hooks: {
            beforeChange: [fieldBeforeChangeSpy],
            afterRead: [fieldAfterReadSpy],
          },
        },
      ],
    });

    const config = defineConfig({
      collections: [users],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);

    // Create the document
    const resCreate = await app.request("/api/collections/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice" }),
    });

    expect(resCreate.status).toBe(201);
    const createdBody = await resCreate.json();
    // In database, it should be UPPERCASE (beforeChange)
    const dbDoc = await db.findOne({ collection: "users", id: createdBody.id });
    expect(dbDoc.username).toBe("ALICE");

    // But on returning, it should also be processed by afterRead
    expect(createdBody.username).toBe("masked-ALICE");

    // Fetch the document via GET
    const resGet = await app.request(`/api/collections/users/${createdBody.id}`);
    expect(resGet.status).toBe(200);
    const getBody = await resGet.json();
    expect(getBody.username).toBe("masked-ALICE");
  });

  it("should execute global hooks for get and update", async () => {
    const beforeChangeSpy = vi.fn(({ data }) => ({ ...data, key: "updated-key" }));
    const afterReadSpy = vi.fn(({ doc }) => ({ ...doc, extra: "added-on-read" }));

    const siteSettings = defineGlobal({
      slug: "settings",
      hooks: {
        beforeChange: [beforeChangeSpy],
        afterRead: [afterReadSpy],
      },
      fields: [{ name: "key", type: "text" }],
    });

    const config = defineConfig({
      collections: [],
      globals: [siteSettings],
      db,
    });

    const app = await createDyrectedApp(config);

    // Update global settings
    const resUpdate = await app.request("/api/globals/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "initial" }),
    });

    expect(resUpdate.status).toBe(200);
    const updateBody = await resUpdate.json();
    expect(updateBody.key).toBe("updated-key");
    expect(updateBody.extra).toBe("added-on-read");

    // Fetch global settings
    const resGet = await app.request("/api/globals/settings");
    expect(resGet.status).toBe(200);
    const getBody = await resGet.json();
    expect(getBody.key).toBe("updated-key");
    expect(getBody.extra).toBe("added-on-read");
  });

  it("should provide readonly db in beforeChange — find/findOne work, create throws", async () => {
    // Seed a related collection
    await db.create({ collection: "categories", data: { id: "cat-1", name: "Tech" } });

    let createError: string | null = null;
    const hook = vi.fn(async ({ data, db: hookDb }) => {
      // Should be able to read
      const cat = await hookDb.findOne({ collection: "categories", id: "cat-1" });
      data.categoryName = cat?.name ?? "unknown";

      // Should NOT be able to write — must throw
      try {
        await hookDb.create({ collection: "categories", data: { id: "cat-2", name: "Bad" } });
      } catch (e: any) {
        createError = e.message;
      }

      return data;
    });

    const posts = defineCollection({
      slug: "posts-with-db-hook",
      hooks: { beforeChange: [hook] },
      fields: [
        { name: "title", type: "text" },
        { name: "categoryName", type: "text" },
      ],
    });

    const config = defineConfig({ collections: [posts], globals: [], db });
    const app = await createDyrectedApp(config);

    const res = await app.request("/api/collections/posts-with-db-hook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hello" }),
    });

    expect(res.status).toBe(201);
    expect(hook).toHaveBeenCalled();
    expect(createError).toMatch(/Write operation "create" is not allowed/);
    const body = await res.json();
    expect(body.categoryName).toBe("Tech");
  });

  it("should provide full db in afterChange — write operations succeed", async () => {
    const hook = vi.fn(async ({ doc, db: hookDb }) => {
      // Should be able to write in afterChange
      await hookDb.create({
        collection: "audit-log",
        data: { action: "created", postId: doc.id },
      });
    });

    const posts = defineCollection({
      slug: "posts-audit",
      hooks: { afterChange: [hook] },
      fields: [{ name: "title", type: "text" }],
    });

    const config = defineConfig({ collections: [posts], globals: [], db });
    const app = await createDyrectedApp(config);

    const res = await app.request("/api/collections/posts-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Audited Post" }),
    });

    expect(res.status).toBe(201);
    expect(hook).toHaveBeenCalled();

    // Verify the audit log was written
    const auditLogs = await db.find({ collection: "audit-log" });
    expect(auditLogs.total).toBe(1);
    expect(auditLogs.docs[0].action).toBe("created");
  });

  it("should provide readonly db in afterRead — reads work, writes throw", async () => {
    await db.create({ collection: "tags", data: { id: "tag-1", label: "important" } });

    let deleteError: string | null = null;
    const hook = vi.fn(async ({ doc, db: hookDb }) => {
      const tag = await hookDb.findOne({ collection: "tags", id: "tag-1" });
      doc.tagLabel = tag?.label ?? "";

      try {
        await hookDb.delete({ collection: "tags", id: "tag-1" });
      } catch (e: any) {
        deleteError = e.message;
      }

      return doc;
    });

    const posts = defineCollection({
      slug: "posts-readonly-afterread",
      hooks: { afterRead: [hook] },
      fields: [
        { name: "title", type: "text" },
        { name: "tagLabel", type: "text" },
      ],
    });

    const config = defineConfig({ collections: [posts], globals: [], db });
    const app = await createDyrectedApp(config);

    // Create
    const resCreate = await app.request("/api/collections/posts-readonly-afterread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test" }),
    });
    expect(resCreate.status).toBe(201);
    expect(deleteError).toMatch(/Write operation "delete" is not allowed/);

    // Read — triggers afterRead
    const resGet = await app.request("/api/collections/posts-readonly-afterread");
    expect(resGet.status).toBe(200);
    const body = await resGet.json();
    expect(body.docs[0].tagLabel).toBe("important");
  });

  it("should provide readonly db in beforeDelete — find works, delete throws", async () => {
    await db.create({ collection: "posts-ref", data: { id: "ref-1", categoryId: "cat-1" } });

    const hook = vi.fn(async ({ id, db: hookDb }) => {
      // Should be able to check references
      const refs = await hookDb.find({
        collection: "posts-ref",
        where: { categoryId: { equals: id } },
      });

      // Should NOT be able to delete
      await expect(
        hookDb.delete({ collection: "posts-ref", id: "ref-1" })
      ).rejects.toThrow(/Write operation "delete" is not allowed/);

      if (refs.total > 0) {
        throw new Error(`${refs.total} reference(s) exist`);
      }
    });

    const categories = defineCollection({
      slug: "categories-guarded",
      hooks: { beforeDelete: [hook] },
      fields: [{ name: "name", type: "text" }],
    });

    const config = defineConfig({ collections: [categories], globals: [], db });
    const app = await createDyrectedApp(config);

    // Create a category
    await db.create({ collection: "categories-guarded", data: { id: "cat-1", name: "Test" } });

    // Try to delete — should fail because references exist
    const res = await app.request("/api/collections/categories-guarded/cat-1", {
      method: "DELETE",
    });

    expect(res.status).toBe(500);
    // Category should still exist
    const remaining = await db.findOne({ collection: "categories-guarded", id: "cat-1" });
    expect(remaining).not.toBeNull();
  });

  it("createReadonlyDb should throw on all write methods", () => {
    const readonlyDb = createReadonlyDb(db);

    expect(() => readonlyDb.create({ collection: "x", data: {} })).toThrow(/Write operation "create"/);
    expect(() => readonlyDb.update({ collection: "x", id: "1", data: {} })).toThrow(/Write operation "update"/);
    expect(() => readonlyDb.delete({ collection: "x", id: "1" })).toThrow(/Write operation "delete"/);
    expect(() => readonlyDb.updateGlobal({ slug: "x", data: {} })).toThrow(/Write operation "updateGlobal"/);
  });

  it("createReadonlyDb should allow read methods", async () => {
    await db.create({ collection: "test-read", data: { id: "r1", val: 42 } });

    const readonlyDb = createReadonlyDb(db);

    const found = await readonlyDb.findOne({ collection: "test-read", id: "r1" });
    expect(found).toEqual({ id: "r1", val: 42 });

    const list = await readonlyDb.find({ collection: "test-read" });
    expect(list.docs).toHaveLength(1);

    // getGlobal returns empty object for nonexistent globals (InMemoryAdapter behavior)
    const global = await readonlyDb.getGlobal({ slug: "nonexistent" });
    expect(global).toBeDefined();
  });
});
