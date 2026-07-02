import { defineCollection } from "@dyrected/core";

export const Media = defineCollection({
  slug: "media",
  labels: { plural: "Media", singular: "Media" },
  upload: true,
  fields: [{ name: "alt", type: "text", label: "Alt Text" }],
});
