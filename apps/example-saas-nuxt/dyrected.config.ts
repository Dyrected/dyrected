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
  admin: {
    useAsTitle: "title",
    group: "Content",
    previewUrl: "slug == 'home' ? '/' : '/' + slug",
    defaultColumns: ["title", "slug", "updatedAt", "action"],
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    {
      name: "seo",
      type: "object",
      admin: {
        tab: "SEO",
      },
      fields: [
        { name: "metaTitle", type: "text" },
        { name: "metaDescription", type: "textarea" },
        { name: "ogImage", type: "relationship", relationTo: "media" },
      ],
    },
    {
      admin: {
        tab: "Page Layout",
      },
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
            { name: "ctaLink", type: "url" },
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
            { name: "buttonLink", type: "url" },
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
                { name: "ctaLink", type: "url" },
              ],
            },
          ],
        },
        {
          slug: "logos",
          labels: { singular: "Logo Bar", plural: "Logo Bars" },
          fields: [
            { name: "heading", type: "text" },
            { name: "items", type: "array", fields: [{ name: "name", type: "text" }] },
          ],
        },
        {
          slug: "stats",
          labels: { singular: "Stats Grid", plural: "Stats Grids" },
          fields: [
            {
              name: "items",
              type: "array",
              fields: [
                { name: "value", type: "text", required: true },
                { name: "label", type: "text", required: true },
              ],
            },
          ],
        },
        {
          slug: "team",
          labels: { singular: "Team Grid", plural: "Team Grids" },
          fields: [
            { name: "heading", type: "text" },
            {
              name: "members",
              type: "array",
              fields: [
                { name: "name", type: "text", required: true },
                { name: "role", type: "text" },
                { name: "bio", type: "textarea" },
                { name: "initials", type: "text" },
              ],
            },
          ],
        },
        {
          slug: "press",
          labels: { singular: "Press Mentions", plural: "Press Mentions" },
          fields: [
            {
              name: "items",
              type: "array",
              fields: [
                { name: "publication", type: "text", required: true },
                { name: "quote", type: "textarea", required: true },
                { name: "date", type: "text" },
              ],
            },
          ],
        },
        {
          slug: "faq",
          labels: { singular: "FAQ Accordion", plural: "FAQ Accordions" },
          fields: [
            { name: "heading", type: "text" },
            {
              name: "items",
              type: "array",
              fields: [
                { name: "question", type: "text", required: true },
                { name: "answer", type: "textarea", required: true },
              ],
            },
          ],
        },
        {
          slug: "testimonial",
          labels: { singular: "Testimonial", plural: "Testimonials" },
          fields: [
            { name: "quote", type: "textarea", required: true },
            { name: "author", type: "text", required: true },
            { name: "role", type: "text" },
            { name: "initials", type: "text" },
          ],
        },
        {
          slug: "comparison",
          labels: { singular: "Comparison Table", plural: "Comparison Tables" },
          fields: [
            { name: "heading", type: "text" },
            {
              name: "rows",
              type: "array",
              fields: [
                { name: "feature", type: "text", required: true },
                { name: "snacktrack", type: "boolean" },
                { name: "competitorA", type: "text", label: "Competitor A Value/Status" },
                { name: "competitorB", type: "text", label: "Competitor B Value/Status" },
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
        {
          slug: "contactForm",
          labels: { singular: "Contact Form", plural: "Contact Forms" },
          fields: [
            { name: "heading", type: "text", label: "Heading" },
            { name: "subheading", type: "text", label: "Subheading" },
          ],
        },
      ],
    },
  ],
});

const blog = defineCollection({
  slug: "blog",
  admin: {
    useAsTitle: "title",
    group: "Content",
    previewUrl: "'/blog/' + slug",
  },
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
