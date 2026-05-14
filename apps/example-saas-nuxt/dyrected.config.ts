import { defineCollection, defineGlobal, defineConfig } from "@dyrected/core";
import { SqliteAdapter } from "@dyrected/db-sqlite";
import { LocalStorageAdapter } from "@dyrected/storage-local";
import path from "node:path";

const media = defineCollection({
  slug: "media",
  upload: true,
  fields: [{ name: "alt", type: "text", label: "Alt Text" }],
});

const pages = defineCollection({
  slug: "pages",
  admin: { useAsTitle: "title", group: "Content" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    {
      name: "seo",
      type: "object",
      fields: [
        { name: "metaTitle", type: "text" },
        { name: "metaDescription", type: "textarea" },
        { name: "ogImage", type: "relationship", relationTo: "media" },
      ],
    },
    {
      name: "layout",
      type: "blocks",
      blocks: [
        {
          slug: "hero",
          labels: { singular: "Hero", plural: "Heroes" },
          fields: [
            { name: "heading", type: "text", required: true },
            { name: "subheading", type: "textarea" },
            { name: "image", type: "relationship", relationTo: "media" },
            { name: "ctaLabel", type: "text" },
            { name: "ctaLink", type: "text" },
          ],
        },
        {
          slug: "features",
          labels: { singular: "Features Grid", plural: "Features Grids" },
          fields: [
            { name: "heading", type: "text" },
            {
              name: "items",
              type: "array",
              fields: [
                { name: "icon", type: "textarea", label: "SVG Icon Path" },
                { name: "title", type: "text", required: true },
                { name: "description", type: "textarea" },
              ],
            },
          ],
        },
        {
          slug: "richContent",
          labels: { singular: "Rich Content", plural: "Rich Content Blocks" },
          fields: [{ name: "content", type: "richText", required: true }],
        },
        {
          slug: "cta",
          labels: { singular: "CTA Banner", plural: "CTA Banners" },
          fields: [
            { name: "heading", type: "text", required: true },
            { name: "description", type: "textarea" },
            { name: "buttonLabel", type: "text" },
            { name: "buttonLink", type: "text" },
          ],
        },
        {
          slug: "pricing",
          labels: { singular: "Pricing Grid", plural: "Pricing Grids" },
          fields: [
            { name: "heading", type: "text" },
            {
              name: "plans",
              type: "array",
              fields: [
                { name: "name", type: "text", required: true },
                { name: "price", type: "text" },
                { name: "features", type: "array", fields: [{ name: "text", type: "text" }] },
                { name: "ctaLabel", type: "text" },
                { name: "ctaLink", type: "text" },
              ],
            },
          ],
        },
        {
          slug: "timeline",
          labels: { singular: "Timeline", plural: "Timelines" },
          fields: [
            {
              name: "items",
              type: "array",
              fields: [
                { name: "year", type: "text", required: true },
                { name: "title", type: "text", required: true },
                { name: "description", type: "textarea" },
              ],
            },
          ],
        },
      ],
    },
  ],
});

const blog = defineCollection({
  slug: "blog",
  admin: { useAsTitle: "title", group: "Content" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "content", type: "richText", required: true },
    { name: "featuredImage", type: "relationship", relationTo: "media" },
    { name: "publishedDate", type: "date", defaultValue: () => new Date().toISOString() },
  ],
});

const settings = defineGlobal({
  slug: "settings",
  label: "Site Settings",
  fields: [
    { name: "siteName", type: "text" },
    { name: "tagline", type: "text" },
    { name: "logo", type: "relationship", relationTo: "media" },
    { name: "footerText", type: "textarea" },
  ],
});

export default defineConfig({
  collections: [media, pages, blog],
  globals: [settings],
  db: new SqliteAdapter({
    filename: "dyrected.db",
  }),
  storage: new LocalStorageAdapter({
    uploadDir: path.resolve(process.cwd(), "public/uploads"),
    staticUrlPrefix: "/uploads",
  }),
});
