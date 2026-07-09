import { beforeAll, describe, expect, it } from "vitest";
import { createDyrectedApp } from "../app.js";
import { signCollectionToken } from "../auth/token.js";
import { defineCollection, defineConfig } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

beforeAll(() => {
  process.env.DYRECTED_JWT_SECRET = "test-secret";
});

describe("audit routes", () => {
  it("returns only readable audit entries for an audited collection", async () => {
    const db = new InMemoryAdapter();
    db.seed("users", [{ id: "user-1", email: "user1@example.com", roles: ["editor"] }]);
    db.seed("posts", [
      { id: "post-1", title: "Mine", owner: "user-1" },
      { id: "post-2", title: "Theirs", owner: "user-2" },
    ]);
    db.seed("__audit", [
      { id: "audit-1", collection: "posts", documentId: "post-1", operation: "create", user: "user-1", timestamp: "2026-01-01T00:00:00.000Z", changes: "{}" },
      { id: "audit-2", collection: "posts", documentId: "post-2", operation: "update", user: "user-2", timestamp: "2026-01-02T00:00:00.000Z", changes: "{}" },
    ]);

    const app = await createDyrectedApp(defineConfig({
      db,
      collections: [
        defineCollection({
          slug: "users",
          auth: true,
          fields: [{ name: "email", type: "email" }],
        }),
        defineCollection({
          slug: "posts",
          audit: true,
          access: {
            read: ({ user }) => ({ owner: { equals: user?.sub } }),
          },
          fields: [
            { name: "title", type: "text" },
            { name: "owner", type: "text" },
          ],
        }),
        defineCollection({
          slug: "pages",
          fields: [{ name: "title", type: "text" }],
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

    const res = await app.request("/api/collections/posts/__audit", { headers });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.docs[0].documentId).toBe("post-1");

    const rawAuditRes = await app.request("/api/collections/__audit", { headers });
    expect(rawAuditRes.status).toBe(403);

    const missingRes = await app.request("/api/collections/pages/__audit", { headers });
    expect(missingRes.status).toBe(404);
  });

  it("aggregates only entries from audited collections the caller can read", async () => {
    const db = new InMemoryAdapter();
    db.seed("users", [{ id: "user-1", email: "user1@example.com", roles: ["editor"] }]);
    db.seed("posts", [
      { id: "post-1", title: "Mine", owner: "user-1" },
      { id: "post-2", title: "Theirs", owner: "user-2" },
    ]);
    db.seed("comments", [{ id: "comment-1", body: "Visible" }]);
    db.seed("secrets", [{ id: "secret-1", value: "Hidden" }]);
    db.seed("__audit", [
      { id: "audit-1", collection: "posts", documentId: "post-1", operation: "create", user: "user-1", timestamp: "2026-01-01T00:00:00.000Z", changes: "{}" },
      { id: "audit-2", collection: "posts", documentId: "post-2", operation: "update", user: "user-2", timestamp: "2026-01-02T00:00:00.000Z", changes: "{}" },
      { id: "audit-3", collection: "comments", documentId: "comment-1", operation: "create", user: null, timestamp: "2026-01-03T00:00:00.000Z", changes: "{}" },
      { id: "audit-4", collection: "secrets", documentId: "secret-1", operation: "delete", user: "user-9", timestamp: "2026-01-04T00:00:00.000Z", changes: "{}" },
    ]);

    const app = await createDyrectedApp(defineConfig({
      db,
      collections: [
        defineCollection({
          slug: "users",
          auth: true,
          fields: [{ name: "email", type: "email" }],
        }),
        defineCollection({
          slug: "posts",
          audit: true,
          access: {
            read: ({ user }) => ({ owner: { equals: user?.sub } }),
          },
          fields: [
            { name: "title", type: "text" },
            { name: "owner", type: "text" },
          ],
        }),
        defineCollection({
          slug: "comments",
          audit: true,
          access: { read: true },
          fields: [{ name: "body", type: "text" }],
        }),
        defineCollection({
          slug: "secrets",
          audit: true,
          access: { read: false },
          fields: [{ name: "value", type: "text" }],
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

    const res = await app.request("/api/audit", { headers });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(2);
    expect(data.docs.map((doc: { id: string }) => doc.id)).toEqual(["audit-1", "audit-3"]);
  });
});
