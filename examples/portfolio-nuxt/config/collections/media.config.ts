import { defineCollection } from "@dyrected/core";

export const media = defineCollection({
  slug: "media",
  labels: { singular: "Media Item", plural: "Media" },
  upload: true,
  fields: [
    { name: "alt", type: "text", label: "Alt Text" },
    { name: "caption", type: "textarea", label: "Caption" },
  ],
});
