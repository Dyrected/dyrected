import { defineCollection, defineTextField, defineTextareaField } from "@dyrected/core";

export const Documents = defineCollection({
  slug: "documents",
  admin: { useAsTitle: "title" },
  upload: {
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    maxFileSize: 20 * 1024 * 1024,
  },
  fields: [
    defineTextField({ name: "title", label: "Title", required: true }),
    defineTextareaField({ name: "summary", label: "Summary" }),
  ],
});
