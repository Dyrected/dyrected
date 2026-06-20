import { defineCollection } from "../../index.js";
import { publishingWorkflow } from "../../workflows.js";

/** Shared by workflow integration tests and the documentation type-check. */
export const EditorialPosts = defineCollection({
  slug: "posts",
  workflow: publishingWorkflow(),
  fields: [
    { name: "title", type: "text", required: true },
    { name: "body", type: "richText" },
  ],
});
