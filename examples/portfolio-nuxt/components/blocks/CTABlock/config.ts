import { type Block } from "@dyrected/core";

export const CTABlockConfig: Block = {
  slug: "callToAction",
  labels: { singular: "Call to Action", plural: "Calls to Action" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "description", type: "textarea" },
    { name: "buttonLabel", type: "text" },
    { name: "buttonLink", type: "url" },
    {
      name: "theme",
      type: "select",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
        { label: "Dark", value: "dark" },
      ],
    },
  ],
};
