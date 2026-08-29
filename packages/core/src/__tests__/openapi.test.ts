import { describe, expect, it } from "vitest";
import { defineCollection, defineConfig, defineGlobal } from "../index.js";
import { generateOpenApi } from "../utils/openapi.js";
import { publishingWorkflow } from "../workflows.js";

const config = defineConfig({
  collections: [
    defineCollection({
      slug: "users",
      auth: true,
      fields: [{ name: "name", type: "text", label: "Name" }],
    }),
    defineCollection({
      slug: "media",
      upload: true,
      fields: [{ name: "alt", type: "text", label: "Alternative text" }],
    }),
    defineCollection({
      slug: "posts",
      audit: true,
      workflow: publishingWorkflow(),
      fields: [{ name: "title", type: "text", label: "Title" }],
    }),
  ],
  globals: [
    defineGlobal({
      slug: "settings",
      fields: [{ name: "siteName", type: "text", label: "Site name" }],
    }),
  ],
  storage: {
    upload: async ({ filename, mimeType }) => ({
      filename,
      mimeType,
      url: filename,
    }),
    delete: async () => {},
    getURL: ({ filename }) => filename,
  },
});

describe("OpenAPI generation", () => {
  it("covers every public route family for a maximal config", () => {
    const spec = generateOpenApi(config);
    const paths = Object.keys(spec.paths);

    expect(paths).toEqual(
      expect.arrayContaining([
        "/api/schemas",
        "/api/openapi.json",
        "/api/docs",
        "/api/dyrected/options/{collection}/{field}",
        "/api/preferences/{key}",
        "/api/preview-token",
        "/api/preview-data",
        "/api/audit",
        "/api/collections/posts",
        "/api/collections/posts/__audit",
        "/api/collections/posts/{id}",
        "/api/collections/posts/delete-many",
        "/api/collections/posts/aggregate",
        "/api/collections/posts/{id}/transitions/{transition}",
        "/api/collections/posts/{id}/workflow-history",
        "/api/collections/users/login",
        "/api/collections/users/accept-invite",
        "/api/collections/users/{id}/change-password",
        "/api/collections/media/media",
        "/api/collections/media/media/{filename}",
        "/api/globals/settings",
        "/api/media/{filename}",
        "/api/ai/chat",
        "/api/ai/threads",
        "/api/ai/threads/{threadId}",
        "/api/ai/threads/{threadId}/messages",
        "/api/ai/actions/{actionId}",
        "/api/ai/actions/{actionId}/execute",
        "/api/ai/actions/{actionId}/reject",
        "/api/ai/rag/reindex",
        "/api/ai/rag/search",
      ]),
    );

    expect(spec.paths["/api/collections/posts/aggregate"]?.post?.summary).toBe("Aggregate posts");
    expect(spec.paths["/api/collections/posts"]?.get?.tags).toEqual(["Collection: posts"]);
    expect(spec.paths["/api/collections/posts"]?.get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "search",
          in: "query",
        }),
      ]),
    );
    expect(spec.paths["/api/collections/users/login"]?.post?.tags).toEqual(["Collection: users"]);
    expect(spec.paths["/api/globals/settings"]?.get?.tags).toEqual(["Global: settings"]);
  });

  it("describes all FieldType variants used by the schema generator", () => {
    const spec = generateOpenApi(
      defineConfig({
        collections: [
          defineCollection({
            slug: "fields",
            fields: [
              { name: "when", type: "datetime", label: "When" },
              { name: "clock", type: "time", label: "Clock" },
              { name: "icon", type: "icon", label: "Icon" },
              {
                name: "images",
                type: "image",
                label: "Images",
                relationTo: "media",
                hasMany: true,
              },
            ],
          }),
        ],
        globals: [],
      }),
    );
    const properties = spec.components.schemas.fields.properties;
    expect(properties.when.format).toBe("date-time");
    expect(properties.clock.format).toBe("time");
    expect(properties.icon.type).toBe("string");
    expect(properties.images.type).toBe("array");
  });
});
