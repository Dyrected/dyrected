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

export const GuestResponses = defineCollection({
  slug: "guest-responses",
  labels: { singular: "Guest response", plural: "Guest Responses" },
  fields: [
    { name: "name", type: "text", label: "Full Name", required: true },
    { name: "attending", type: "boolean", label: "Attending" },
    { name: "guestCount", type: "number", label: "Plus-Ones" },
    {
      name: "asoebiStatus",
      type: "select",
      label: "Asoebi Status",
      options: ["requested", "paid", "collected"],
    },
    { name: "appointmentDate", type: "datetime", label: "Tasting Date" },
    { name: "checkedIn", type: "boolean", label: "Checked In" },
    { name: "checkedInAt", type: "datetime", label: "Checked In At" },
  ],
  views: [
    {
      slug: "attending-guests",
      label: "Attending Guests",
      layout: "table",
      filter: { attending: { equals: true } },
      columns: ["name", "guestCount", "checkedIn"],
      actions: [
        {
          name: "checkIn",
          label: "Check In",
          type: "row",
          mutation: { checkedIn: true, checkedInAt: "now()" },
        },
      ],
      metrics: [
        {
          label: "Total Attending",
          color: "emerald",
          aggregate: { count: "*", where: { attending: { equals: true } } },
        },
      ],
    },
    {
      slug: "asoebi-pipeline",
      label: "Asoebi Fulfillment",
      layout: "kanban",
      groupBy: "asoebiStatus",
      columns: ["name", "asoebiStatus"],
    },
    {
      slug: "tasting-schedule",
      label: "Tasting Schedule",
      layout: "calendar",
      dateField: "appointmentDate",
      columns: ["name", "guestCount"],
    },
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
  collections: [Users, Media, Posts, GuestResponses],
  globals: [Settings],
  storage,
});

