import { defineCollection, defineConfig, defineGlobal } from "@dyrected/core";
import { SqliteAdapter } from "@dyrected/db-sqlite";

const media = defineCollection({
  slug: "media",
  labels: { singular: "Media", plural: "Media" },
  upload: true,
  fields: [{ name: "alt", type: "text" }],
});

const pages = defineCollection({
  slug: "pages",
  labels: { singular: "Page", plural: "Pages" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true },
    { name: "content", type: "richText" },
    { name: "featuredImage", type: "relationship", relationTo: "media" },
  ],
});

const posts = defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  upload: true,
  fields: [
    { name: "title", type: "text", required: true },
    { name: "content", type: "richText" },
  ],
});

const comments = defineCollection({
  slug: "comments",
  labels: { singular: "Comment", plural: "Comments" },
  fields: [
    { name: "author", type: "text", required: true },
    { name: "text", type: "textarea", required: true },
    { name: "postSlug", type: "text", required: true },
    { name: "createdAt", type: "date" },
  ],
  admin: {
    useAsTitle: "author",
    group: "Content",
  },
});

const inquiries = defineCollection({
  slug: "inquiries",
  labels: { singular: "Inquiry/Prayer Request", plural: "Inquiries" },
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
  admin: {
    useAsTitle: "name",
    group: "Content",
  },
});

const navigation = defineGlobal({
  slug: "navigation",
  label: "Navigation",
  fields: [
    {
      name: "menuItems",
      type: "array",
      fields: [
        { name: "label", type: "text" },
        {
          name: "navType",
          type: "select",
          options: [
            { label: "Internal", value: "internal" },
            { label: "External", value: "external" },
          ],
          defaultValue: "internal",
          admin: {
            description: "Select the type of navigation link",
            layout: "radio",
            direction: "horizontal",
          },
        },
        {
          name: "link",
          label: "Link to page",
          type: "relationship",
          relationTo: "pages",
          admin: { condition: 'navType == "internal"' },
        },
        {
          name: "url",
          label: "URL",
          type: "url",
          admin: { condition: 'navType == "external"' },
        },
      ],
    },
  ],
});

const settings = defineGlobal({
  slug: "settings",
  label: "Site Settings",
  fields: [
    { name: "siteName", type: "text" },
    { name: "logo", type: "relationship", relationTo: "media" },
    { name: "footerText", type: "textarea" },
  ],
});

export default defineConfig({
  collections: [media, pages, posts, comments, inquiries],
  globals: [navigation, settings],
  db: new SqliteAdapter({
    filename: "dyrected.db",
  }),
});
