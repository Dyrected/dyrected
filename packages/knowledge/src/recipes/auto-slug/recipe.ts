import { defineCollection } from "@dyrected/core";

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
    { name: "title", type: "text", label: "Title", required: true },
    {
      name: "slug",
      type: "text",
      label: "Slug",
      required: true,
      unique: true,
      promoted: true,
      admin: {
        hooks: {
          onChange: ({ siblingData }) => toSlug(siblingData.title),
        },
      },
    },
  ],
});
