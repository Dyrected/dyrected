import { defineCollection, defineRichTextField, defineTextField, publishingWorkflow } from "@dyrected/core";

export const Posts = defineCollection({
  slug: "posts",
  workflow: publishingWorkflow(),
  fields: [
    defineTextField({ name: "title", label: "Title", required: true }),
    defineRichTextField({ name: "body", label: "Body", required: true }),
  ],
});
