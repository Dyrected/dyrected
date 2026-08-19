import { defineCollection, displaySection, displayField } from "@dyrected/core";
import { Media } from "./media.js";
import { Authors } from "./authors.js";
import { blogSeed } from "../seed.js";
import { policy } from "../access-policies.js";

export const Blog = defineCollection({
  slug: "blog",
  labels: { plural: "Articles", singular: "Article" },
  access: {
    read: true,
    create: policy("isAuthenticated"),
    update: policy("isAuthenticated"),
    delete: policy("isAdmin"),
  },
  admin: {
    useAsTitle: "title",
    group: "Content",
    previewUrl: "'/blog/' + slug",
    urlPattern: "/blog/{slug}",
    defaultColumns: ["title", "status", "tags", "views", "publishedDate"],
    icon: "File",
  },
  detail: [
    displaySection(
      "Article Header",
      [
        displayField("title", { span: 8, editable: true }),
        displayField("status", { span: 2, display: "badge", editable: true }),
        displayField("views", { span: 2, editable: true }),
        displayField("slug", { span: 6, display: "copyable" }),
        displayField("publishedDate", { span: 6, display: "relative", editable: true }),
      ],
      { span: 8 },
    ),
    displaySection(
      "Author & Taxonomy",
      [
        displayField("author", { span: 12 }),
        displayField("tags", { span: 12, display: "tags" }),
        displayField("featuredImage", { span: 12, display: "image" }),
      ],
      { span: 4 },
    ),
    displaySection("Article Content", [displayField("content", { span: 12 })], { span: 12 }),
  ],
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: {
        hooks: {
          onChange: "siblingData.title != null ? siblingData.title : value",
        },
      },
    },
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
