import { beforeAll, describe, expect, it } from "vitest";
import { createDyrectedApp } from "../app.js";
import { signCollectionToken } from "../auth/token.js";
import { defineCollection, defineConfig, defineGlobal } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

beforeAll(() => {
  process.env.DYRECTED_JWT_SECRET = "test-secret";
});

describe("access-control parity", () => {
  it("enforces row-level collection access on list, read, update, and delete", async () => {
    const db = new InMemoryAdapter();
    db.seed("users", [
      { id: "user-1", email: "user1@example.com", roles: ["editor"] },
      { id: "user-2", email: "user2@example.com", roles: ["editor"] },
    ]);
    db.seed("posts", [
      { id: "post-1", title: "Mine", owner: "user-1" },
      { id: "post-2", title: "Theirs", owner: "user-2" },
    ]);

    const app = await createDyrectedApp(defineConfig({
      db,
      collections: [
        defineCollection({
          slug: "users",
          auth: true,
          fields: [{ name: "email", type: "email" }, { name: "roles", type: "select", hasMany: true, options: ["editor"] }],
        }),
        defineCollection({
          slug: "posts",
          access: {
            read: ({ user }) => ({ owner: { equals: user?.sub } }),
            update: ({ user }) => ({ owner: { equals: user?.sub } }),
            delete: ({ user }) => ({ owner: { equals: user?.sub } }),
          },
          fields: [
            { name: "title", type: "text" },
            { name: "owner", type: "text" },
          ],
        }),
      ],
      globals: [],
    }));

    const token = await signCollectionToken({
      sub: "user-1",
      email: "user1@example.com",
      collection: "users",
    });
    const headers = { Authorization: `Bearer ${token}` };

    const listRes = await app.request("/api/collections/posts", { headers });
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.docs).toHaveLength(1);
    expect(listData.docs[0].id).toBe("post-1");

    const ownRes = await app.request("/api/collections/posts/post-1", { headers });
    expect(ownRes.status).toBe(200);

    const otherRes = await app.request("/api/collections/posts/post-2", { headers });
    expect(otherRes.status).toBe(403);

    const updateOtherRes = await app.request("/api/collections/posts/post-2", {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nope" }),
    });
    expect(updateOtherRes.status).toBe(403);

    const deleteOtherRes = await app.request("/api/collections/posts/post-2", {
      method: "DELETE",
      headers,
    });
    expect(deleteOtherRes.status).toBe(403);

    const updateOwnRes = await app.request("/api/collections/posts/post-1", {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });
    expect(updateOwnRes.status).toBe(200);

    const updated = await db.findOne({ collection: "posts", id: "post-1" });
    expect(updated?.title).toBe("Updated");
  });

  it("enforces row-level collection access from Jexl filter strings", async () => {
    const db = new InMemoryAdapter();
    db.seed("users", [
      { id: "user-1", email: "user1@example.com", roles: ["editor"] },
      { id: "user-2", email: "user2@example.com", roles: ["editor"] },
    ]);
    db.seed("posts", [
      { id: "post-1", title: "Mine", owner: "user-1" },
      { id: "post-2", title: "Theirs", owner: "user-2" },
    ]);

    const app = await createDyrectedApp(defineConfig({
      db,
      collections: [
        defineCollection({
          slug: "users",
          auth: true,
          fields: [{ name: "email", type: "email" }, { name: "roles", type: "select", hasMany: true, options: ["editor"] }],
        }),
        defineCollection({
          slug: "posts",
          access: {
            read: "{ owner: { equals: user.sub } }",
            update: "{ owner: { equals: user.sub } }",
            delete: "{ owner: { equals: user.sub } }",
          },
          fields: [
            { name: "title", type: "text" },
            { name: "owner", type: "text" },
          ],
        }),
      ],
      globals: [],
    }));

    const token = await signCollectionToken({
      sub: "user-1",
      email: "user1@example.com",
      collection: "users",
    });
    const headers = { Authorization: `Bearer ${token}` };

    const listRes = await app.request("/api/collections/posts", { headers });
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.docs).toHaveLength(1);
    expect(listData.docs[0].id).toBe("post-1");

    const ownRes = await app.request("/api/collections/posts/post-1", { headers });
    expect(ownRes.status).toBe(200);

    const otherRes = await app.request("/api/collections/posts/post-2", { headers });
    expect(otherRes.status).toBe(403);
  });

  it("enforces field read and write access on the API", async () => {
    const db = new InMemoryAdapter();

    const app = await createDyrectedApp(defineConfig({
      db,
      collections: [
        defineCollection({
          slug: "posts",
          fields: [
            { name: "title", type: "text" },
            {
              name: "secret",
              type: "text",
              access: {
                read: false,
                update: false,
              },
            },
            {
              name: "settings",
              type: "object",
              fields: [
                { name: "visible", type: "text" },
                { name: "hidden", type: "text", access: { read: false, update: false } },
              ],
            },
          ],
        }),
      ],
      globals: [],
    }));

    const createRes = await app.request("/api/collections/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Post",
        secret: "top-secret",
        settings: { visible: "ok", hidden: "blocked" },
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.secret).toBeUndefined();
    expect(created.settings).toEqual({ visible: "ok" });

    const stored = await db.find({ collection: "posts", limit: 10 });
    expect(stored.docs[0].secret).toBeUndefined();
    expect(stored.docs[0].settings).toEqual({ visible: "ok" });

    const updateRes = await app.request(`/api/collections/posts/${stored.docs[0].id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: "changed",
        settings: { visible: "still-ok", hidden: "still-blocked" },
      }),
    });
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.secret).toBeUndefined();
    expect(updated.settings).toEqual({ visible: "still-ok" });

    const fetchedRes = await app.request(`/api/collections/posts/${stored.docs[0].id}`);
    expect(fetchedRes.status).toBe(200);
    const fetched = await fetchedRes.json();
    expect(fetched.secret).toBeUndefined();
    expect(fetched.settings).toEqual({ visible: "still-ok" });
  });

  it("passes document id into field access rules on API updates", async () => {
    const db = new InMemoryAdapter();

    const app = await createDyrectedApp(defineConfig({
      db,
      collections: [
        defineCollection({
          slug: "posts",
          fields: [
            { name: "title", type: "text" },
            {
              name: "slug",
              type: "text",
              access: {
                update: "!id",
              },
            },
          ],
        }),
      ],
      globals: [],
    }));

    const createRes = await app.request("/api/collections/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Post",
        slug: "original",
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.slug).toBe("original");

    const updateRes = await app.request(`/api/collections/posts/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: "changed",
      }),
    });
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.slug).toBe("original");

    const stored = await db.findOne({ collection: "posts", id: created.id });
    expect(stored?.slug).toBe("original");
  });

  it("evaluates global access against doc and incoming data", async () => {
    const db = new InMemoryAdapter();
    await db.updateGlobal({
      slug: "settings",
      data: { siteName: "Public", visibility: "public", locked: true },
    });

    const app = await createDyrectedApp(defineConfig({
      db,
      collections: [],
      globals: [
        defineGlobal({
          slug: "settings",
          access: {
            read: ({ doc }) => doc?.visibility === "public",
            update: ({ data }) => data?.locked !== false,
          },
          fields: [
            { name: "siteName", type: "text" },
            { name: "visibility", type: "text" },
            { name: "locked", type: "boolean" },
          ],
        }),
      ],
    }));

    const getRes = await app.request("/api/globals/settings");
    expect(getRes.status).toBe(200);

    const deniedUpdateRes = await app.request("/api/globals/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: false }),
    });
    expect(deniedUpdateRes.status).toBe(403);

    const allowedUpdateRes = await app.request("/api/globals/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteName: "Updated", locked: true }),
    });
    expect(allowedUpdateRes.status).toBe(200);
    const global = await db.getGlobal({ slug: "settings" });
    expect(global).toMatchObject({ siteName: "Updated", locked: true });
  });

  it("evaluates global access from Jexl against doc and incoming data", async () => {
    const db = new InMemoryAdapter();
    await db.updateGlobal({
      slug: "settings",
      data: { siteName: "Public", visibility: "public", locked: true },
    });

    const app = await createDyrectedApp(defineConfig({
      db,
      collections: [],
      globals: [
        defineGlobal({
          slug: "settings",
          access: {
            read: "doc.visibility == 'public'",
            update: "data.locked != false",
          },
          fields: [
            { name: "siteName", type: "text" },
            { name: "visibility", type: "text" },
            { name: "locked", type: "boolean" },
          ],
        }),
      ],
    }));

    const getRes = await app.request("/api/globals/settings");
    expect(getRes.status).toBe(200);

    const deniedUpdateRes = await app.request("/api/globals/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: false }),
    });
    expect(deniedUpdateRes.status).toBe(403);

    const allowedUpdateRes = await app.request("/api/globals/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteName: "Updated", locked: true }),
    });
    expect(allowedUpdateRes.status).toBe(200);
  });

  it("collapses document-scoped schema access to false", async () => {
    const app = await createDyrectedApp(defineConfig({
      db: new InMemoryAdapter(),
      collections: [
        defineCollection({
          slug: "posts",
          access: {
            read: ({ user }) => ({ owner: { equals: user?.sub } }),
            create: "user != null",
          },
          fields: [{ name: "title", type: "text" }],
        }),
      ],
      globals: [],
    }));

    const res = await app.request("/api/schemas");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.collections[0].access.read).toBe(false);
    expect(data.collections[0].access.create).toBe("user != null");
  });
});
