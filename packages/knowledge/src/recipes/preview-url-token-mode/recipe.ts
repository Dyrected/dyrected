import { defineCollection, defineTextField, expr } from "@dyrected/core";

export const Docs = defineCollection({
  slug: "docs",
  admin: {
    useAsTitle: "title",
    previewUrl: expr.ifElse("slug", expr.concat("/docs/", "slug"), null),
    previewMode: "postMessage",
    urlPattern: "/docs/{slug}",
  },
  fields: [
    defineTextField({ name: "title", label: "Title", required: true }),
    defineTextField({ name: "slug", label: "Slug", required: true, unique: true }),
  ],
});
