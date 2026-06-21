import { defineCollection } from "@dyrected/core";

export const Media = defineCollection({
  slug: "media",
  upload: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxFileSize: 10 * 1024 * 1024,
  },
  fields: [
    { name: "alt", type: "text", label: "Alternative text", required: true },
    { name: "caption", type: "textarea", label: "Caption" },
  ],
});
