import {
  defineCollection,
  defineConfig,
  defineGlobal,
  publishingWorkflow,
} from "@dyrected/core";
import type { StorageAdapter } from "@dyrected/core";

const storage: StorageAdapter = {
  async upload({ filename, mimeType }) {
    return { filename, mimeType, url: `/uploads/${filename}` };
  },
  async delete() {},
  getURL: ({ filename }) => `/uploads/${filename}`,
};

export const Users = defineCollection({
  slug: "users",
  labels: { singular: "User", plural: "Users" },
  auth: true,
  fields: [{ name: "name", type: "text", label: "Name", required: true }],
});

export const Media = defineCollection({
  slug: "media",
  labels: { singular: "Media item", plural: "Media" },
  upload: true,
  fields: [{ name: "alt", type: "text", label: "Alternative text" }],
});

export const Posts = defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  audit: true,
  workflow: publishingWorkflow(),
  fields: [
    { name: "title", type: "text", label: "Title", required: true },
    { name: "publishedAt", type: "datetime", label: "Published at" },
    {
      name: "author",
      type: "relationship",
      label: "Author",
      relationTo: "users",
    },
    { name: "hero", type: "image", label: "Hero image", relationTo: "media" },
  ],
});

export const Settings = defineGlobal({
  slug: "settings",
  label: "Site settings",
  fields: [
    { name: "siteName", type: "text", label: "Site name", required: true },
  ],
});

export default defineConfig({
  collections: [Users, Media, Posts],
  globals: [Settings],
  storage,
});
