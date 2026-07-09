import { beforeAll, describe, expect, it } from "vitest";
import { createDyrectedApp } from "../app.js";
import { signCollectionToken } from "../auth/token.js";
import { defineCollection, defineConfig } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

beforeAll(() => {
  process.env.DYRECTED_JWT_SECRET = "test-secret";
});

async function adminHeaders(sub = "admin-1") {
  const token = await signCollectionToken({ sub, email: `${sub}@example.com`, collection: "users" });
  return { Authorization: `Bearer ${token}` };
}

describe("readAudit access", () => {
  it("gates the audit log independently of read", async () => {
    const db = new InMemoryAdapter();
    db.seed("users", [{ id: "admin-1", email: "admin-1@example.com", roles: ["admin"] }]);

    const app = await createDyrectedApp(defineConfig({
      db,
      globals: [],
      collections: [
        defineCollection({ slug: "users", auth: true, fields: [{ name: "email", type: "email" }, { name: "roles", type: "select", hasMany: true, options: ["admin"] }] }),
        defineCollection({
          slug: "posts",
          audit: true,
          access: {
            read: true, // anyone can read documents
            readAudit: "'admin' in user.roles", // but only admins can read the audit trail
          },
          fields: [{ name: "title", type: "text" }],
        }),
      ],
    }));

    // Anyone can read documents...
    const listRes = await app.request("/api/collections/posts");
    expect(listRes.status).toBe(200);

    // ...but an anonymous caller cannot read the audit log.
    const anonAudit = await app.request("/api/collections/posts/__audit");
    expect(anonAudit.status).toBe(403);

    // An admin can.
    const adminAudit = await app.request("/api/collections/posts/__audit", { headers: await adminHeaders() });
    expect(adminAudit.status).toBe(200);
  });

  it("falls back to the read rule when readAudit is not set", async () => {
    const db = new InMemoryAdapter();
    const app = await createDyrectedApp(defineConfig({
      db,
      globals: [],
      collections: [
        defineCollection({
          slug: "posts",
          audit: true,
          access: { read: "user != null" }, // audit inherits this
          fields: [{ name: "title", type: "text" }],
        }),
      ],
    }));

    const anon = await app.request("/api/collections/posts/__audit");
    expect(anon.status).toBe(403);
  });
});

describe("field create access", () => {
  it("applies the create rule on create and the update rule on update", async () => {
    const db = new InMemoryAdapter();
    const app = await createDyrectedApp(defineConfig({
      db,
      globals: [],
      collections: [
        defineCollection({
          slug: "posts",
          fields: [
            { name: "title", type: "text" },
            // Settable only at creation time; ignored on later updates.
            { name: "refCode", type: "text", access: { create: true, update: false } },
            // Cannot be set at creation; editable afterward.
            { name: "reviewNote", type: "text", access: { create: false } },
          ],
        }),
      ],
    }));

    const createRes = await app.request("/api/collections/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "T", refCode: "ABC", reviewNote: "should be dropped" }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.refCode).toBe("ABC"); // create allowed
    expect(created.reviewNote).toBeUndefined(); // create denied → dropped

    const updateRes = await app.request(`/api/collections/posts/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refCode: "CHANGED", reviewNote: "now allowed" }),
    });
    expect(updateRes.status).toBe(200);
    const stored = await db.findOne({ collection: "posts", id: created.id });
    expect(stored?.refCode).toBe("ABC"); // update denied → unchanged
    expect(stored?.reviewNote).toBe("now allowed"); // update allowed (no update rule)
  });
});

describe("string-valued named policies", () => {
  it("resolves a Jexl-string policy for row-level access", async () => {
    const db = new InMemoryAdapter();
    db.seed("users", [{ id: "user-1", email: "user1@example.com", roles: [] }]);
    db.seed("posts", [
      { id: "post-1", title: "Mine", owner: "user-1" },
      { id: "post-2", title: "Theirs", owner: "user-2" },
    ]);

    const app = await createDyrectedApp(defineConfig({
      db,
      accessPolicies: {
        ownDocs: "{ owner: { equals: user.sub } }",
      },
      globals: [],
      collections: [
        defineCollection({ slug: "users", auth: true, fields: [{ name: "email", type: "email" }] }),
        defineCollection({
          slug: "posts",
          access: { read: { policy: "ownDocs" } },
          fields: [{ name: "title", type: "text" }, { name: "owner", type: "text" }],
        }),
      ],
    }));

    const token = await signCollectionToken({ sub: "user-1", email: "user1@example.com", collection: "users" });
    const headers = { Authorization: `Bearer ${token}` };

    const listRes = await app.request("/api/collections/posts", { headers });
    const list = await listRes.json();
    expect(list.docs).toHaveLength(1);
    expect(list.docs[0].id).toBe("post-1");
  });

  it("inlines a string policy into the admin schema so it can be evaluated live", async () => {
    const db = new InMemoryAdapter();
    const app = await createDyrectedApp(defineConfig({
      db,
      accessPolicies: {
        isAdmin: "'admin' in user.roles",
        alwaysDeny: false,
      },
      globals: [],
      collections: [
        defineCollection({
          slug: "posts",
          access: { create: { policy: "isAdmin" } },
          fields: [
            { name: "title", type: "text" },
            { name: "secret", type: "text", access: { read: { policy: "alwaysDeny" } } },
          ],
        }),
      ],
    }));

    const res = await app.request("/api/schemas");
    const data = await res.json();
    // The string policy is inlined as its Jexl expression, not collapsed to a boolean.
    expect(data.collections[0].access.create).toBe("'admin' in user.roles");
    // The boolean policy resolves to its literal value.
    const secret = data.collections[0].fields.find((f: any) => f.name === "secret");
    expect(secret.access.read).toBe(false);
  });
});
