import { defineCollection, defineTextField, when } from "@dyrected/core";

export const toSlug = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const Posts = defineCollection({
  slug: "posts",
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === "create" || data.title !== undefined) {
          return { ...data, slug: toSlug(data.title) };
        }
        return data;
      },
    ],
  },
  fields: [
    defineTextField({ name: "title", label: "Title", required: true }),
    defineTextField({
      name: "slug",
      label: "Slug",
      required: true,
      unique: true,
      promoted: true,
      admin: {
        hooks: {
          onChange: when.then(
            when.fieldEmpty("value"),
            when.then(when.fieldNotEmpty("siblingData.title"), when.slugify("siblingData.title"), "value"),
            "value",
          ),
        },
      },
    }),
  ],
});
