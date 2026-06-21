import { defineCollection, publishingWorkflow } from "@dyrected/core";

export const Posts = defineCollection({
  slug: "posts",
  workflow: publishingWorkflow(),
  fields: [
    { name: "title", type: "text", label: "Title", required: true },
    { name: "body", type: "richText", label: "Body", required: true },
  ],
});
