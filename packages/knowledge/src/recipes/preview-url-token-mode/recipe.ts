import { defineCollection, defineTextField, when } from "@dyrected/core";

export const Docs = defineCollection({
  slug: "docs",
  admin: {
    useAsTitle: "title",
    previewUrl: when.then("slug", when.concat("/docs/", "slug"), null),
    previewMode: "postMessage",
    urlPattern: "/docs/{slug}",
  },
  fields: [
    defineTextField({ name: "title", label: "Title", required: true }),
    defineTextField({ name: "slug", label: "Slug", required: true, unique: true }),
  ],
});
