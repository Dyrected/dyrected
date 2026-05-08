import { type Block } from "@dyrected/core";

export const RichContentBlockConfig: Block = {
  slug: "richContent",
  labels: { singular: "Rich Content", plural: "Rich Content Blocks" },
  fields: [{ name: "content", type: "richText", required: true }],
};
