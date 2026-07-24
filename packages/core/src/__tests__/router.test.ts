import { describe, it, expect } from "vitest";
import { createDyrectedApp } from "../app.js";
import {
  defineBlock,
  defineBlocksField,
  defineConfig,
  defineCollection,
  defineGlobal,
  defineTextField,
} from "../index.js";
import { MockDatabaseAdapter } from "./mocks.js";

describe("Dynamic Router", async () => {
  const config = defineConfig({
    blocks: [
      defineBlock({
        slug: "hero",
        fields: [defineTextField({ name: "heading", label: "Heading" })],
      }),
    ],
    collections: [
      defineCollection({
        slug: "posts",
        admin: { icon: "Newspaper" },
        fields: [
          { name: "title", type: "text" },
          defineBlocksField({
            name: "layout",
            label: "Layout",
            blockReferences: ["hero"],
          }),
        ],
      }),
    ],
    globals: [
      defineGlobal({
        slug: "settings",
        admin: { icon: "Settings2" },
        fields: [{ name: "siteName", type: "text" }],
      }),
    ],
    db: new MockDatabaseAdapter(),
  });

  const app = await createDyrectedApp(config);

  it("should expose the schema endpoint", async () => {
    const res = await app.request("/api/schemas");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.collections).toHaveLength(1);
    expect(data.collections[0].slug).toBe("posts");
    expect(data.collections[0].admin.icon).toBe("Newspaper");
    expect(data.globals[0].slug).toBe("settings");
    expect(data.globals[0].admin.icon).toBe("Settings2");
    expect(data.blocks).toHaveLength(1);
    expect(data.blocks[0].slug).toBe("hero");
    expect(data.adminHealth).toMatchObject({
      emailConfigured: false,
      authCollectionConfigured: false,
      uploadCollectionConfigured: false,
    });
    expect(data.configDiagnostics).toEqual([]);
    const layoutField = data.collections[0].fields.find(
      (field: any) => field.name === "layout",
    );
    expect(layoutField.blockReferences).toEqual(["hero"]);
    expect(layoutField.blocks).toBeUndefined();
  });

  it("should register collection routes", async () => {
    const res = await app.request("/api/collections/posts");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.docs).toBeDefined();
    expect(Array.isArray(data.docs)).toBe(true);
  });

  it("should register global routes", async () => {
    const res = await app.request("/api/globals/settings");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({}); // Empty object from MockDatabaseAdapter
  });

  it("should return 404 for non-existent collections", async () => {
    const res = await app.request("/api/collections/missing");
    expect(res.status).toBe(404);
  });
});
