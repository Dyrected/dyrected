import { describe, expect, it } from "vitest";
import { sanitizeSchemaForCloudSync } from "../sync-schema.js";

describe("sanitizeSchemaForCloudSync", () => {
  it("preserves supported declarative hooks and strips function hooks", () => {
    const beforeReadHook = () => ({ status: { equals: "published" } });
    const afterChangeHook = () => undefined;
    const fieldBeforeChangeHook = () => "value";
    const adminOnChangeHook = () => "slug";
    const adminOptionsHook = () => [];

    const { payload, warnings } = sanitizeSchemaForCloudSync({
      collections: [
        {
          slug: "posts",
          hooks: {
            beforeRead: [
              "{ status: { equals: 'published' } }",
              beforeReadHook,
            ],
            afterRead: ["{ title: doc.title + '!' }"],
            beforeChange: ["{ slug: data.title }"],
            afterChange: [afterChangeHook],
          },
          fields: [
            {
              name: "title",
              type: "text",
              hooks: {
                beforeChange: ["value", fieldBeforeChangeHook],
                afterRead: [() => "masked"],
              },
              admin: {
                hooks: {
                  onChange: "siblingData.title",
                  options: adminOptionsHook,
                },
              },
            },
          ],
        },
      ],
      globals: [
        {
          slug: "settings",
          hooks: {
            beforeChange: ["{ siteName: 'Cloud' }"],
            afterChange: [afterChangeHook],
          },
          fields: [],
        },
      ],
    });

    expect(payload.collections[0].hooks).toEqual({
      beforeRead: ["{ status: { equals: 'published' } }"],
      afterRead: ["{ title: doc.title + '!' }"],
      beforeChange: ["{ slug: data.title }"],
    });
    expect(payload.collections[0].fields[0].hooks).toEqual({
      beforeChange: ["value"],
    });
    expect(payload.collections[0].fields[0].admin.hooks).toEqual({
      onChange: "siblingData.title",
    });
    expect(payload.globals[0].hooks).toEqual({
      beforeChange: ["{ siteName: 'Cloud' }"],
    });
    expect(warnings).toEqual([
      "collections[0].hooks.beforeRead[1]",
      "collections[0].hooks.afterChange[0]",
      "collections[0].fields[0].hooks.beforeChange[1]",
      "collections[0].fields[0].hooks.afterRead[0]",
      "collections[0].fields[0].admin.hooks.options",
      "globals[0].hooks.afterChange[0]",
    ]);
  });
});
