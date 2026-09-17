import { describe, it, expect } from "vitest";
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
});
