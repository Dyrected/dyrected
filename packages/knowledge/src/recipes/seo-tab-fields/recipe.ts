import { defineCollection, defineTab, defineTextField, defineTextareaField, defineUrlField } from "@dyrected/core";

export const Pages = defineCollection({
  slug: "pages",
  admin: { useAsTitle: "title" },
  fields: [
    defineTextField({ name: "title", label: "Title", required: true }),
    defineTextField({ name: "slug", label: "Slug", required: true, unique: true }),
    ...defineTab({
      label: "SEO",
      fields: [
        defineTextField({ name: "metaTitle", label: "Meta title" }),
        defineTextareaField({ name: "metaDescription", label: "Meta description" }),
        defineUrlField({ name: "canonicalUrl", label: "Canonical URL" }),
      ],
    }),
  ],
});
