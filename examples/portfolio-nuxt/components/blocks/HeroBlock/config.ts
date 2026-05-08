import { type Block } from "@dyrected/core";

export const HeroBlockConfig: Block = {
  slug: "hero",
  labels: { singular: "Hero", plural: "Heroes" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "subheading", type: "textarea" },
    {
      name: "heroType",
      type: "select",
      defaultValue: "split",
      options: [
        { label: "Split (Image Right)", value: "split" },
        { label: "Centered (No Image)", value: "centered" },
        { label: "Full Background", value: "full" },
      ],
      admin: { layout: "radio", direction: "horizontal" },
    },
    {
      name: "image",
      type: "relationship",
      relationTo: "media",
      admin: { condition: 'heroType != "centered"' },
    },
    { name: "ctaLabel", type: "text" },
    { name: "ctaLink", type: "url" },
  ],
};
