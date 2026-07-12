import { defineCollection } from "@dyrected/core";
import { Media } from "./media.ts";
import { Authors } from "./authors.ts";
import { blogSeed } from "../seed.ts";

export const Blog = defineCollection({
  slug: "blog",
  labels: { plural: "Articles", singular: "Article" },
  access: {
    read: true,
    create: { policy: "hasRole", params: { roles: ["admin", "editor"] } },
    update: { policy: "hasRole", params: { roles: ["admin", "editor"] } },
    delete: { policy: "hasRole", params: { role: "admin" } },
  },
  admin: {
    useAsTitle: "title",
    group: "Content",
    previewUrl: "'/blog/' + slug",
    // Server-side preview: the admin hands the draft to the frontend as a
    // signed token on the URL, and the blog route redeems it during its server
    // render (see app/pages/blog/[...slug].vue). No click-to-edit in this mode.
    previewMode: "token",
    urlPattern: "/blog/{slug}",
    defaultColumns: ["title", "status", "tags", "views", "publishedDate"],
    icon: "File",
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "published",
      options: [
        { label: "Draft", value: "draft" },
        { label: "In review", value: "in-review" },
        { label: "Published", value: "published" },
      ],
      admin: {
        format: {
          type: "badge",
          tones: { draft: "neutral", "in-review": "warning", published: "success" },
        },
      },
    },
    {
      name: "tags",
      label: "Tags",
      type: "multiSelect",
      options: [
        { label: "Insights", value: "insights" },
        { label: "Product", value: "product" },
        { label: "Operations", value: "operations" },
      ],
      admin: {
        format: {
          type: "badge",
          tones: { insights: "info", product: "primary", operations: "warning" },
        },
      },
    },
    {
      name: "views",
      label: "Views",
      type: "number",
      defaultValue: 0,
      // Abbreviates large view counts (12500 → "12.5K").
      admin: { format: "compact" },
    },
    { name: "content", type: "richText", required: true },
    { name: "featuredImage", type: "relationship", relationTo: Media.slug },
    { name: "author", type: "relationship", relationTo: Authors.slug },
    {
      name: "publishedDate",
      type: "date",
      defaultValue: () => new Date().toISOString(),
      // Shows "3 days ago" style relative dates in the list.
      admin: { format: "relative" },
    },
  ],
  initialData: blogSeed,
});
