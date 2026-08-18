import { describe, it, expect, beforeEach } from "vitest";
import { createDyrectedApp } from "../app.js";
import { defineConfig, defineCollection } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

describe("POST /api/collections/:slug/aggregate", () => {
  let db: InMemoryAdapter;

  beforeEach(() => {
    db = new InMemoryAdapter();
    db.seed("rsvp_records", [
      { id: "1", tenantId: "tenant_A", status: "attending", yards: "3" },
      { id: "2", tenantId: "tenant_A", status: "attending", yards: "5" },
      { id: "3", tenantId: "tenant_A", status: "declined", yards: "2" },
      { id: "4", tenantId: "tenant_B", status: "attending", yards: "10" },
    ]);
  });

  it("calculates statistics successfully on happy path", async () => {
    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "rsvp_records",
          fields: [
            { name: "tenantId", type: "text" },
            { name: "status", type: "text" },
            { name: "yards", type: "text" },
          ],
        }),
      ],
      globals: [],
      db,
    });
    const app = await createDyrectedApp(config);

    const res = await app.request("/api/collections/rsvp_records/aggregate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        total: { count: "*" },
        attending: { count: "*", where: { status: { equals: "attending" } } },
        totalYards: { sum: "yards", cast: "number" },
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(4);
    expect(data.attending).toBe(3);
    expect(data.totalYards).toBe(20);
  });

  it("enforces access.read gate and returns 403 when access is denied", async () => {
    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "rsvp_records",
          access: {
            read: () => false,
          },
          fields: [
            { name: "status", type: "text" },
            { name: "yards", type: "text" },
          ],
        }),
      ],
      globals: [],
      db,
    });
    const app = await createDyrectedApp(config);

    const res = await app.request("/api/collections/rsvp_records/aggregate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        total: { count: "*" },
      }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe(true);
    expect(data.message).toContain("Access denied: read on rsvp_records");
  });

  it("merges row-level constraints from access.read into all named aggregates", async () => {
    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "rsvp_records",
          access: {
            read: () => ({ tenantId: { equals: "tenant_A" } }),
          },
          fields: [
            { name: "tenantId", type: "text" },
            { name: "status", type: "text" },
            { name: "yards", type: "text" },
          ],
        }),
      ],
      globals: [],
      db,
    });
    const app = await createDyrectedApp(config);

    const res = await app.request("/api/collections/rsvp_records/aggregate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        total: { count: "*" },
        attending: { count: "*", where: { status: { equals: "attending" } } },
        totalYards: { sum: "yards", cast: "number" },
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    // Only tenant_A documents (3 total, 2 attending, 3+5+2=10 yards)
    expect(data.total).toBe(3);
    expect(data.attending).toBe(2);
    expect(data.totalYards).toBe(10);
  });

  it("sanitizes where clauses and strips unknown fields from aggregate where clauses", async () => {
    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "rsvp_records",
          fields: [
            { name: "status", type: "text" },
          ],
        }),
      ],
      globals: [],
      db,
    });
    const app = await createDyrectedApp(config);

    const res = await app.request("/api/collections/rsvp_records/aggregate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filtered: {
          count: "*",
          where: {
            status: { equals: "attending" },
            maliciousField: { equals: "hack" }, // Not in schema, should be stripped
          },
        },
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.filtered).toBe(3); // 3 attending records
  });

  it("returns 400 for invalid request bodies (array, invalid JSON, non-object operations)", async () => {
    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "rsvp_records",
          fields: [{ name: "status", type: "text" }],
        }),
      ],
      globals: [],
      db,
    });
    const app = await createDyrectedApp(config);

    // Array body
    const arrayRes = await app.request("/api/collections/rsvp_records/aggregate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ count: "*" }]),
    });
    expect(arrayRes.status).toBe(400);

    // Primitive operation
    const primRes = await app.request("/api/collections/rsvp_records/aggregate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: "count" }),
    });
    expect(primRes.status).toBe(400);

    // Malformed JSON
    const malformedRes = await app.request("/api/collections/rsvp_records/aggregate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect(malformedRes.status).toBe(400);
  });
});
