import { defineCollection } from "@dyrected/core";

export const comments = defineCollection({
  slug: "comments",
  labels: { singular: "Comment", plural: "Comments" },
  admin: { useAsTitle: "comment", group: "Admin" },
  fields: [
    { name: "post", type: "relationship", relationTo: "posts", required: true },
    { name: "author", type: "relationship", relationTo: "users" },
    { name: "comment", type: "textarea", required: true },
  ],
});
