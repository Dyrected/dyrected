import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDyrectedApp } from "../app.js";
import { InMemoryAdapter } from "./mocks.js";
import { defineCollection, defineConfig, defineGlobal } from "../index.js";

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
});
