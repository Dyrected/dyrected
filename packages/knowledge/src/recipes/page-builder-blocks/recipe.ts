import { defineCollection } from "@dyrected/core";
import type { Block } from "@dyrected/core";

export const HeroBlock = {
  slug: "hero",
  labels: { singular: "Hero", plural: "Heroes" },
  fields: [
    { name: "heading", type: "text", label: "Heading", required: true },
    { name: "body", type: "textarea", label: "Body" },
  ],
} satisfies Block;

export const CallToActionBlock = {
  slug: "callToAction",
  labels: { singular: "Call to action", plural: "Calls to action" },
  fields: [
    { name: "label", type: "text", label: "Link label", required: true },
    { name: "url", type: "url", label: "URL", required: true },
  ],
} satisfies Block;

export const Pages = defineCollection({
  slug: "pages",
  fields: [
    { name: "title", type: "text", label: "Title", required: true },
    {
      name: "layout",
      type: "blocks",
      label: "Page layout",
      blocks: [HeroBlock, CallToActionBlock],
    },
  ],
});
