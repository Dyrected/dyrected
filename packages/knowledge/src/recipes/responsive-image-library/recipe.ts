import { defineCollection, defineTextField, defineTextareaField } from "@dyrected/core";

export const Media = defineCollection({
  slug: "media",
  admin: { useAsTitle: "alt" },
  upload: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxFileSize: 10 * 1024 * 1024,
    adminThumbnail: "card",
    imageSizes: [
      { name: "card", width: 640, height: 480, fit: "cover" },
      { name: "hero", width: 1600, height: 900, fit: "cover" },
    ],
  },
  fields: [
    defineTextField({ name: "alt", label: "Alternative text", required: true }),
    defineTextareaField({ name: "caption", label: "Caption" }),
  ],
});
