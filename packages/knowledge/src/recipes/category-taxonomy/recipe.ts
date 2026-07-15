import { defineCollection, defineRelationshipField, defineTextField } from "@dyrected/core";

export const Categories = defineCollection({
  slug: "categories",
  admin: { useAsTitle: "title", urlPattern: "/categories/{slug}" },
  fields: [
    defineTextField({ name: "title", label: "Title", required: true }),
    defineTextField({ name: "slug", label: "Slug", required: true, unique: true }),
  ],
});

export const Posts = defineCollection({
  slug: "posts",
  admin: { useAsTitle: "title", urlPattern: "/blog/{slug}" },
  fields: [
    defineTextField({ name: "title", label: "Title", required: true }),
    defineTextField({ name: "slug", label: "Slug", required: true, unique: true }),
    defineRelationshipField({
      name: "categories",
      label: "Categories",
      relationTo: "categories",
      hasMany: true,
    }),
  ],
});
