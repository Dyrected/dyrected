import { defineCollection, defineTextField, defineTextareaField } from "@dyrected/core";

export const Media = defineCollection({
  slug: "media",
  upload: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxFileSize: 10 * 1024 * 1024,
  },
  fields: [
    defineTextField({ name: "alt", label: "Alternative text", required: true }),
    defineTextareaField({ name: "caption", label: "Caption" }),
  ],
});
