import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDyrectedApp } from "../app.js";
import { InMemoryAdapter } from "./mocks.js";
import { defineCollection, defineConfig, defineGlobal } from "../index.js";

describe("Backend Dynamic Option Queries", () => {
  let db: InMemoryAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    db = new InMemoryAdapter();
  });

  it("should serialize static options as-is and dynamic options to { _dynamic: true }", async () => {
    const dynamicResolver = () => [{ label: "Dynamic", value: "dyn" }];

    const posts = defineCollection({
      slug: "posts",
      fields: [
        {
          name: "staticSelect",
          type: "select",
          options: [{ label: "Static", value: "stat" }],
        },
        {
          name: "dynamicSelect",
          type: "select",
          options: dynamicResolver,
        },
      ],
    });

    const config = defineConfig({
      collections: [posts],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);
    const res = await app.request("/api/schemas");
    expect(res.status).toBe(200);

    const body = await res.json();
    const fields = body.collections[0].fields;

    const staticField = fields.find((f: any) => f.name === "staticSelect");
    const dynamicField = fields.find((f: any) => f.name === "dynamicSelect");

    expect(staticField.options).toEqual([{ label: "Static", value: "stat" }]);
    expect(dynamicField.options).toEqual({ _dynamic: true });
  });

  it("should serialize client-side admin option hooks as strings", async () => {
    const optionHook = ({ siblingData }: { siblingData: Record<string, unknown> }) => {
      if (siblingData.country === "us") return [{ label: "California", value: "CA" }];
      return [];
    };

    const posts = defineCollection({
      slug: "posts",
      fields: [
        {
          name: "state",
          type: "select",
          options: [],
          admin: {
            hooks: {
              options: optionHook,
            },
          },
        },
      ],
    });

    const config = defineConfig({
      collections: [posts],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);
    const res = await app.request("/api/schemas");
    expect(res.status).toBe(200);

    const body = await res.json();
    const stateField = body.collections[0].fields.find((f: any) => f.name === "state");

    expect(stateField.options).toEqual([]);
    expect(typeof stateField.admin.hooks.options).toBe("string");
    expect(stateField.admin.hooks.options).toContain("California");
  });

  it("should preserve declarative admin onChange hooks in serialized schemas", async () => {
    const posts = defineCollection({
      slug: "posts",
      fields: [
        {
          name: "slug",
          type: "text",
          admin: {
            hooks: {
              onChange: "siblingData.title != null ? siblingData.title : value",
            },
          },
        },
      ],
    });

    const config = defineConfig({
      collections: [posts],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);
    const res = await app.request("/api/schemas");
    expect(res.status).toBe(200);

    const body = await res.json();
    const slugField = body.collections[0].fields.find((f: any) => f.name === "slug");

    expect(slugField.admin.hooks.onChange).toBe(
      "siblingData.title != null ? siblingData.title : value",
    );
  });

  it("should tag functional admin onChange hooks so the admin can sandbox them", async () => {
    const posts = defineCollection({
      slug: "posts",
      fields: [
        {
          name: "slug",
          type: "text",
          admin: {
            hooks: {
              onChange: ({ siblingData }: { siblingData: Record<string, unknown> }) => siblingData.title,
            },
          },
        },
      ],
    });

    const config = defineConfig({
      collections: [posts],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);
    const res = await app.request("/api/schemas");
    expect(res.status).toBe(200);

    const body = await res.json();
    const slugField = body.collections[0].fields.find((f: any) => f.name === "slug");

    expect(typeof slugField.admin.hooks.onChange).toBe("string");
    expect(slugField.admin.hooks.onChange.startsWith("__dyrected_fn__:")).toBe(true);
  });

  it("should fail schema serialization when dynamic config includes invalid declarative hook context", async () => {
    const config = defineConfig({
      collections: [],
      globals: [],
      db,
      onSchemaFetch: async () => ({
        collections: [
          defineCollection({
            slug: "posts",
            fields: [
              {
                name: "slug",
                type: "text",
                admin: {
                  hooks: {
                    onChange: "doc.title",
                  },
                },
              },
            ],
          }),
        ],
      }),
    });

    const app = await createDyrectedApp(config);
    const res = await app.request("/api/schemas", {
      headers: { "X-Site-Id": "site-1" },
    });

    expect(res.status).toBe(500);
  });

  it("should resolve option values from options function or options config object via GET options route", async () => {
    const posts = defineCollection({
      slug: "posts",
      fields: [
        {
          name: "country",
          type: "select",
          options: async ({ req }) => {
            const search = req.query.search || "";
            const list = [
              { label: "Canada", value: "ca" },
              { label: "United States", value: "us" },
            ];
            return list.filter((item) =>
              item.label.toLowerCase().includes(search.toLowerCase())
            );
          },
        },
        {
          name: "state",
          type: "select",
          options: {
            resolve: async ({ req }) => {
              const country = req.query.country || "us";
              if (country === "us") {
                return [{ label: "California", value: "CA" }];
              }
              return [{ label: "Ontario", value: "ON" }];
            },
          },
        },
      ],
    });

    const config = defineConfig({
      collections: [posts],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);

    // Test search filter on country select
    const resCountry = await app.request("/api/dyrected/options/posts/country?search=Can");
    expect(resCountry.status).toBe(200);
    const countryData = await resCountry.json();
    expect(countryData).toEqual([{ label: "Canada", value: "ca" }]);

    // Test dependent lookup on state select for country=ca
    const resStateCa = await app.request("/api/dyrected/options/posts/state?country=ca");
    expect(resStateCa.status).toBe(200);
    const stateDataCa = await resStateCa.json();
    expect(stateDataCa).toEqual([{ label: "Ontario", value: "ON" }]);

    // Test default/us lookup on state select
    const resStateUs = await app.request("/api/dyrected/options/posts/state");
    expect(resStateUs.status).toBe(200);
    const stateDataUs = await resStateUs.json();
    expect(stateDataUs).toEqual([{ label: "California", value: "CA" }]);
  });

  it("should cache resolver results for cacheTTL seconds and re-run after expiry", async () => {
    const resolve = vi.fn(async () => [{ label: "Cached", value: "c" }]);

    const posts = defineCollection({
      slug: "posts",
      fields: [
        {
          name: "cached",
          type: "select",
          options: { resolve, cacheTTL: 60 },
        },
      ],
    });

    const config = defineConfig({ collections: [posts], globals: [], db });
    const app = await createDyrectedApp(config);

    const now = 1_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);

    // First call runs the resolver.
    const r1 = await app.request("/api/dyrected/options/posts/cached?country=ca");
    expect(await r1.json()).toEqual([{ label: "Cached", value: "c" }]);
    expect(resolve).toHaveBeenCalledTimes(1);

    // Same query within the TTL is served from cache — resolver not re-run.
    nowSpy.mockReturnValue(now + 30_000);
    const r2 = await app.request("/api/dyrected/options/posts/cached?country=ca");
    expect(await r2.json()).toEqual([{ label: "Cached", value: "c" }]);
    expect(resolve).toHaveBeenCalledTimes(1);

    // A different query is a different cache key — resolver runs again.
    const r3 = await app.request("/api/dyrected/options/posts/cached?country=us");
    expect(await r3.json()).toEqual([{ label: "Cached", value: "c" }]);
    expect(resolve).toHaveBeenCalledTimes(2);

    // After the TTL elapses, the original query re-runs the resolver.
    nowSpy.mockReturnValue(now + 61_000);
    const r4 = await app.request("/api/dyrected/options/posts/cached?country=ca");
    expect(await r4.json()).toEqual([{ label: "Cached", value: "c" }]);
    expect(resolve).toHaveBeenCalledTimes(3);

    nowSpy.mockRestore();
  });
});
