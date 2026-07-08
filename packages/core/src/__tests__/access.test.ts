import { describe, expect, it, vi } from "vitest";
import { isAccessAllowed, resolveAccess } from "../auth/access.js";
import { defineCollection, defineConfig } from "../index.js";
import { createDyrectedApp } from "../app.js";
import { InMemoryAdapter } from "./mocks.js";

const req = {
  query: {},
  headers: {},
};

describe("access resolution", () => {
  it("allows named policies registered on the top-level config", async () => {
    const config = defineConfig({
      collections: [],
      globals: [],
      accessPolicies: {
        isAdmin: ({ user }) => user?.roles?.includes("admin") ?? false,
      },
    });

    const allowed = await isAccessAllowed(config, { policy: "isAdmin" }, {
      user: { sub: "1", collection: "users", roles: ["admin"] },
      req,
    });

    expect(allowed).toBe(true);
  });

  it("fails closed for unknown named policies", async () => {
    const config = defineConfig({
      collections: [],
      globals: [],
    });

    const allowed = await isAccessAllowed(config, { policy: "missing" }, {
      user: { sub: "1", collection: "users" },
      req,
    });

    expect(allowed).toBe(false);
  });

  it("fails closed when a named policy throws", async () => {
    const config = defineConfig({
      collections: [],
      globals: [],
      accessPolicies: {
        broken: vi.fn(() => {
          throw new Error("boom");
        }),
      },
    });

    const allowed = await isAccessAllowed(config, { policy: "broken" }, {
      user: { sub: "1", collection: "users" },
      req,
    });

    expect(allowed).toBe(false);
  });

  it("preserves object results returned by named policies", async () => {
    const config = defineConfig({
      collections: [],
      globals: [],
      accessPolicies: {
        ownDocsOnly: ({ user }) => ({ owner: { equals: user?.sub } }),
      },
    });

    const result = await resolveAccess(config, { policy: "ownDocsOnly" }, {
      user: { sub: "abc", collection: "users" },
      req,
    });

    expect(result).toEqual({ owner: { equals: "abc" } });
  });

  it("preserves object results returned by Jexl access rules", async () => {
    const config = defineConfig({
      collections: [],
      globals: [],
    });

    const result = await resolveAccess(config, "{ owner: { equals: user.sub } }", {
      user: { sub: "abc", collection: "users" },
      req,
    });

    expect(result).toEqual({ owner: { equals: "abc" } });
  });

  it("lets Jexl access rules inspect incoming data", async () => {
    const config = defineConfig({
      collections: [],
      globals: [],
    });

    const allowed = await isAccessAllowed(config, "data.locked != false", {
      user: { sub: "1", collection: "users" },
      data: { locked: true },
      req,
    });

    expect(allowed).toBe(true);
  });
});

describe("self-hosted access runtime", () => {
  it("executes direct function access rules for CRUD routes", async () => {
    const db = new InMemoryAdapter();
    const posts = defineCollection({
      slug: "posts",
      access: {
        create: () => true,
      },
      fields: [{ name: "title", type: "text" }],
    });

    const app = await createDyrectedApp(
      defineConfig({
        collections: [posts],
        globals: [],
        db,
      }),
    );

    const res = await app.request("/api/collections/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "hello" }),
    });

    expect(res.status).toBe(201);
  });

  it("executes named policies for CRUD routes", async () => {
    const db = new InMemoryAdapter();
    const posts = defineCollection({
      slug: "posts",
      access: {
        create: { policy: "allowCreate" },
      },
      fields: [{ name: "title", type: "text" }],
    });

    const app = await createDyrectedApp(
      defineConfig({
        collections: [posts],
        globals: [],
        db,
        accessPolicies: {
          allowCreate: () => true,
        },
      }),
    );

    const res = await app.request("/api/collections/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "hello" }),
    });

    expect(res.status).toBe(201);
  });
});
