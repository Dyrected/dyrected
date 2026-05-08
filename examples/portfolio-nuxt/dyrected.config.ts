import { defineCollection, defineGlobal, defineConfig } from "@dyrected/core";
import { SqliteAdapter } from "@dyrected/db-sqlite";
import { PostgresAdapter } from "@dyrected/db-postgres";

// ── Media ──────────────────────────────────────────
const media = defineCollection({
  slug: "media",
  labels: { singular: "Media Item", plural: "Media" },
  upload: true,
  fields: [
    { name: "alt", type: "text", label: "Alt Text" },
    { name: "caption", type: "textarea", label: "Caption" },
  ],
});

// ── Pages with blocks ───────────────────────────────
const pages = defineCollection({
  slug: "pages",
  labels: { singular: "Page", plural: "Pages" },
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
      label: "Page Layout",
      blocks: [
        {
          slug: "hero",
          labels: { singular: "Hero", plural: "Heroes" },
          fields: [
            { name: "heading", type: "text", required: true },
            { name: "subheading", type: "textarea" },
            {
              name: "heroType",
              type: "select",
              defaultValue: "split",
              options: [
                { label: "Split (Image Right)", value: "split" },
                { label: "Centered (No Image)", value: "centered" },
                { label: "Full Background", value: "full" },
              ],
              admin: { layout: "radio", direction: "horizontal" },
            },
            {
              name: "image",
              type: "relationship",
              relationTo: "media",
              admin: { condition: 'heroType != "centered"' },
            },
            { name: "ctaLabel", type: "text" },
            { name: "ctaLink", type: "url" },
          ],
        },
        {
          slug: "richContent",
          labels: { singular: "Rich Content", plural: "Rich Content Blocks" },
          fields: [{ name: "content", type: "richText", required: true }],
        },
        {
          slug: "imageGallery",
          labels: { singular: "Image Gallery", plural: "Image Galleries" },
          fields: [
            { name: "title", type: "text" },
            {
              name: "images",
              type: "array",
              fields: [
                { name: "image", type: "relationship", relationTo: "media" },
                { name: "caption", type: "text" },
              ],
            },
            {
              name: "columns",
              type: "select",
              options: [
                { label: "2 Columns", value: "2" },
                { label: "3 Columns", value: "3" },
                { label: "4 Columns", value: "4" },
              ],
            },
          ],
        },
        {
          slug: "callToAction",
          labels: { singular: "Call to Action", plural: "Calls to Action" },
          fields: [
            { name: "heading", type: "text", required: true },
            { name: "description", type: "textarea" },
            { name: "buttonLabel", type: "text" },
            { name: "buttonLink", type: "url" },
            {
              name: "theme",
              type: "select",
              options: [
                { label: "Primary", value: "primary" },
                { label: "Secondary", value: "secondary" },
                { label: "Dark", value: "dark" },
              ],
            },
          ],
        },
        {
          slug: "testimonial",
          labels: { singular: "Testimonial", plural: "Testimonials" },
          fields: [
            { name: "message", type: "textarea", required: true },
            { name: "authorName", type: "text", required: true },
            { name: "authorDesignation", type: "text", required: true },
            { name: "avatar", type: "relationship", relationTo: "media" },
          ],
        },
      ],
    },
  ],
});

// ── Posts ───────────────────────────────────────────
const posts = defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  admin: { useAsTitle: "title", group: "Content" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "excerpt", type: "textarea" },
    { name: "content", type: "richText" },
    { name: "image", type: "relationship", relationTo: "media" },
    { name: "publishedAt", type: "date" },
    {
      name: "status",
      type: "select",
      defaultValue: "draft",
      admin: { layout: "radio", direction: "horizontal" },
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
    },
  ],
});

// ── Inquiries ────────────────────────────────────────
const inquiries = defineCollection({
  slug: "inquiries",
  labels: { singular: "Inquiry", plural: "Inquiries" },
  admin: { group: "Feedback", useAsTitle: "name" },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "email", type: "email", required: true },
    {
      name: "type",
      type: "select",
      options: [
        { label: "Prayer Request", value: "prayer" },
        { label: "General Inquiry", value: "general" },
      ],
    },
    { name: "message", type: "textarea", required: true },
    { name: "createdAt", type: "date" },
  ],
});

// ── Comments ─────────────────────────────────────────
const comments = defineCollection({
  slug: "comments",
  labels: { singular: "Comment", plural: "Comments" },
  admin: { group: "Feedback", useAsTitle: "author" },
  fields: [
    { name: "author", type: "text", required: true },
    { name: "text", type: "textarea", required: true },
    { name: "postSlug", type: "text", required: true },
    { name: "createdAt", type: "date" },
  ],
});

// ── Globals ─────────────────────────────────────────
const navigation = defineGlobal({
  slug: "navigation",
  label: "Navigation",
  fields: [
    {
      name: "menuItems",
      type: "array",
      fields: [
        { name: "label", type: "text" },
        { name: "url", type: "url" },
        { name: "page", type: "relationship", relationTo: "pages" },
        { name: "openInNewTab", type: "boolean", defaultValue: false },
      ],
    },
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

const db = process.env.DATABASE_URL
  ? new PostgresAdapter({ url: process.env.DATABASE_URL })
  : new SqliteAdapter({ filename: process.env.DB_FILENAME || "dyrected.db" });

export default defineConfig({
  collections: [media, pages, posts, inquiries, comments],
  globals: [navigation, settings],
  db,
  admin: {
    branding: {
      primaryColor: "#4f46e5",
    },
  },
});
