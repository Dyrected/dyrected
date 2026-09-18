import { describe, it, expect, vi } from "vitest";
import { createDyrectedApp } from "../app.js";
import { defineCollection, defineConfig, defineAction, defineView } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

describe("Collection-root (view-less) actions", () => {
  it("runs a root-level action against a single document with no views defined", async () => {
    const db = new InMemoryAdapter();
    db.seed("orders", [{ id: "order-1", status: "pending" }]);

    const Orders = defineCollection({
      slug: "orders",
      fields: [{ name: "status", type: "text" }],
      actions: [
        defineAction({
          name: "markShipped",
          label: "Mark as shipped",
          type: "header",
          mutation: { status: "shipped" },
        }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Orders], globals: [], db }));

    const res = await app.request("/api/collections/orders/actions/markShipped", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "order-1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("shipped");
  });

  it("404s for an unknown action name", async () => {
    const db = new InMemoryAdapter();
    db.seed("orders", [{ id: "order-1", status: "pending" }]);

    const Orders = defineCollection({
      slug: "orders",
      fields: [{ name: "status", type: "text" }],
      actions: [defineAction({ name: "markShipped", label: "Mark as shipped", mutation: { status: "shipped" } })],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Orders], globals: [], db }));

    const res = await app.request("/api/collections/orders/actions/doesNotExist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "order-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("does not register the actions route at all when the collection has neither views nor actions", async () => {
    const db = new InMemoryAdapter();
    db.seed("orders", [{ id: "order-1", status: "pending" }]);

    const Orders = defineCollection({
      slug: "orders",
      fields: [{ name: "status", type: "text" }],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Orders], globals: [], db }));

    const res = await app.request("/api/collections/orders/actions/markShipped", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "order-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("denies a root action when action.access resolves false", async () => {
    const db = new InMemoryAdapter();
    db.seed("orders", [{ id: "order-1", status: "pending" }]);

    const Orders = defineCollection({
      slug: "orders",
      fields: [{ name: "status", type: "text" }],
      actions: [
        defineAction({
          name: "markShipped",
          label: "Mark as shipped",
          mutation: { status: "shipped" },
          access: { update: () => false },
        }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Orders], globals: [], db }));

    const res = await app.request("/api/collections/orders/actions/markShipped", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "order-1" }),
    });

    expect(res.status).toBe(403);
  });

  it("keeps view-scoped actions isolated: a view-slug request never resolves a root-level action of the same name", async () => {
    const db = new InMemoryAdapter();
    db.seed("orders", [{ id: "order-1", status: "pending" }]);

    const Orders = defineCollection({
      slug: "orders",
      fields: [{ name: "status", type: "text" }],
      views: [defineView({ slug: "all-orders", label: "All Orders", layout: "table" })],
      actions: [
        defineAction({ name: "markShipped", label: "Mark as shipped", mutation: { status: "shipped" } }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Orders], globals: [], db }));

    // "all-orders" view doesn't declare this action itself, so the view-scoped
    // route must 404 even though a root-level action with this name exists.
    const res = await app.request("/api/collections/orders/views/all-orders/actions/markShipped", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "order-1" }),
    });

    expect(res.status).toBe(404);

    // The view-less route, however, does resolve the root-level action.
    const rootRes = await app.request("/api/collections/orders/actions/markShipped", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "order-1" }),
    });
    expect(rootRes.status).toBe(200);
  });

  it("still runs a view-scoped action defined directly on a view", async () => {
    const db = new InMemoryAdapter();
    db.seed("orders", [{ id: "order-1", status: "pending" }]);

    const Orders = defineCollection({
      slug: "orders",
      fields: [{ name: "status", type: "text" }],
      views: [
        defineView({
          slug: "all-orders",
          label: "All Orders",
          layout: "table",
          actions: [
            defineAction({ name: "markShipped", label: "Mark as shipped", mutation: { status: "shipped" } }),
          ],
        }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Orders], globals: [], db }));

    const res = await app.request("/api/collections/orders/views/all-orders/actions/markShipped", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "order-1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("shipped");
  });

  it("propagates error.statusCode from a throwing handler instead of hardcoding 500", async () => {
    const db = new InMemoryAdapter();
    db.seed("orders", [{ id: "order-1", status: "pending" }]);

    const Orders = defineCollection({
      slug: "orders",
      fields: [{ name: "status", type: "text" }],
      actions: [
        defineAction({
          name: "refund",
          label: "Refund",
          type: "row",
          handler: async () => {
            throw Object.assign(new Error("Enter what the user paid."), { statusCode: 400 });
          },
        }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Orders], globals: [], db }));

    const res = await app.request("/api/collections/orders/actions/refund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "order-1" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message ?? body.error).toContain("Enter what the user paid.");
  });

  it("falls back to 500 when a throwing handler carries no statusCode", async () => {
    const db = new InMemoryAdapter();
    db.seed("orders", [{ id: "order-1", status: "pending" }]);

    const Orders = defineCollection({
      slug: "orders",
      fields: [{ name: "status", type: "text" }],
      actions: [
        defineAction({
          name: "refund",
          label: "Refund",
          type: "row",
          handler: async () => {
            throw new Error("Boom");
          },
        }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Orders], globals: [], db }));

    const res = await app.request("/api/collections/orders/actions/refund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "order-1" }),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message ?? body.error).toContain("Boom");
  });

  it("reports per-row statuses (not hardcoded 500) for bulk action failures", async () => {
    const db = new InMemoryAdapter();
    db.seed("orders", [
      { id: "order-1", status: "pending" },
      { id: "order-2", status: "pending" },
    ]);

    const Orders = defineCollection({
      slug: "orders",
      fields: [{ name: "status", type: "text" }],
      actions: [
        defineAction({
          name: "refund",
          label: "Refund",
          type: "row",
          handler: async () => {
            throw Object.assign(new Error("Enter what the user paid."), { statusCode: 400 });
          },
        }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Orders], globals: [], db }));

    const res = await app.request("/api/collections/orders/actions/refund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: ["order-1", "order-2"] }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failed).toBe(2);
    for (const row of body.results) {
      expect(row.status).toBe(400);
      expect(String(row.error)).toContain("Enter what the user paid.");
    }
  });
});

describe("Header actions (type: 'header')", () => {
  it("executes a view-scoped header action without requiring document IDs", async () => {
    const db = new InMemoryAdapter();
    const handlerFn = vi.fn().mockResolvedValue({ recomputed: 42 });

    const Reports = defineCollection({
      slug: "reports",
      fields: [{ name: "name", type: "text" }],
      views: [
        defineView({
          slug: "all",
          label: "All Reports",
          layout: "table",
          actions: [
            defineAction({
              name: "recomputeAll",
              label: "Recompute All",
              type: "header",
              handler: handlerFn,
            }),
          ],
        }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Reports], globals: [], db }));

    const res = await app.request("/api/collections/reports/views/all/actions/recomputeAll", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: { scope: "daily" } }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ recomputed: 42 });
    expect(handlerFn).toHaveBeenCalledTimes(1);
    expect(handlerFn).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: null,
        docs: [],
        input: { scope: "daily" },
        collection: { slug: "reports", label: "reports" },
      }),
    );
  });

  it("returns { success: true } when a header action handler returns void or undefined", async () => {
    const db = new InMemoryAdapter();
    const Reports = defineCollection({
      slug: "reports",
      fields: [{ name: "name", type: "text" }],
      views: [
        defineView({
          slug: "all",
          label: "All Reports",
          layout: "table",
          actions: [
            defineAction({
              name: "syncExternal",
              label: "Sync External",
              type: "header",
              handler: async () => {},
            }),
          ],
        }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Reports], globals: [], db }));

    const res = await app.request("/api/collections/reports/views/all/actions/syncExternal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });

  it("propagates error.statusCode from a throwing header action handler", async () => {
    const db = new InMemoryAdapter();
    const Reports = defineCollection({
      slug: "reports",
      fields: [{ name: "name", type: "text" }],
      views: [
        defineView({
          slug: "all",
          label: "All Reports",
          layout: "table",
          actions: [
            defineAction({
              name: "recomputeAll",
              label: "Recompute",
              type: "header",
              handler: async () => {
                throw Object.assign(new Error("Invalid sync configuration"), { statusCode: 422 });
              },
            }),
          ],
        }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Reports], globals: [], db }));

    const res = await app.request("/api/collections/reports/views/all/actions/recomputeAll", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toEqual({ error: true, message: "Invalid sync configuration" });
  });

  it("enforces action-level access control on header actions", async () => {
    const db = new InMemoryAdapter();
    const Reports = defineCollection({
      slug: "reports",
      fields: [{ name: "name", type: "text" }],
      views: [
        defineView({
          slug: "all",
          label: "All Reports",
          layout: "table",
          actions: [
            defineAction({
              name: "adminRecompute",
              label: "Recompute",
              type: "header",
              access: { update: () => false },
              handler: async () => ({ done: true }),
            }),
          ],
        }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Reports], globals: [], db }));

    const res = await app.request("/api/collections/reports/views/all/actions/adminRecompute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain('Access denied: action "adminRecompute"');
  });

  it("still rejects row actions with 400 when document IDs are omitted", async () => {
    const db = new InMemoryAdapter();
    const Reports = defineCollection({
      slug: "reports",
      fields: [{ name: "name", type: "text" }],
      views: [
        defineView({
          slug: "all",
          label: "All Reports",
          layout: "table",
          actions: [
            defineAction({
              name: "deleteReport",
              label: "Delete",
              type: "row",
              mutation: { name: "deleted" },
            }),
          ],
        }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Reports], globals: [], db }));

    const res = await app.request("/api/collections/reports/views/all/actions/deleteReport", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Provide an `id` or an `ids` array of documents to act on.");
  });
});

