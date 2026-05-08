import { defineCollection } from "@dyrected/core";

export const inquiries = defineCollection({
  slug: "inquiries",
  labels: { singular: "Inquiry", plural: "Inquiries" },
  admin: { useAsTitle: "subject", group: "Admin" },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "email", type: "email", required: true },
    { name: "subject", type: "text" },
    { name: "message", type: "textarea", required: true },
  ],
});
