import { describe, expect, it } from "vitest";
import { generateTypes } from "../cli/src/utils/type-generator.js";

describe("generated Dyrected schema types", () => {
  it("covers every common field family without collapsing known values to any", () => {
    const output = generateTypes({
      collections: [
        {
          slug: "blog-posts",
          auth: true,
          upload: true,
          fields: [
            { name: "content", type: "richText" },
            { name: "metadata", type: "json" },
            { name: "publishedAt", type: "datetime" },
            { name: "tags", type: "multiSelect" },
            { name: "category", type: "select", options: async () => [] },
            {
              name: "authors",
              type: "relationship",
              relationTo: "users",
              hasMany: true,
            },
          ],
        },
        { slug: "users", fields: [{ name: "name", type: "text" }] },
      ],
      globals: [
        {
          slug: "site-settings",
          fields: [{ name: "launch-time", type: "time" }],
        },
      ],
    });

    expect(output).toContain("content?: Record<string, unknown>");
    expect(output).toContain("metadata?: Record<string, unknown>");
    expect(output).toContain("publishedAt?: string");
    expect(output).toContain("tags?: string[]");
    expect(output).toContain("category?: string");
    expect(output).toContain("authors?: Array<Users | string>");
    expect(output).toContain("email: string");
    expect(output).toContain("filename: string");
    expect(output).toContain('"blog-posts": BlogPosts');
    expect(output).toContain('"launch-time"?: string');
  });
});
