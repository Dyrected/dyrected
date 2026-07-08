import { defineBlock, defineBlocksField, defineCollection, defineTextField, defineTextareaField, defineUrlField } from "@dyrected/core";

export const HeroBlock = defineBlock({
  slug: "hero",
  labels: { singular: "Hero", plural: "Heroes" },
  fields: [
    defineTextField({ name: "heading", label: "Heading", required: true }),
    defineTextareaField({ name: "body", label: "Body" }),
  ],
});

export const CallToActionBlock = defineBlock({
  slug: "callToAction",
  labels: { singular: "Call to action", plural: "Calls to action" },
  fields: [
    defineTextField({ name: "label", label: "Link label", required: true }),
    defineUrlField({ name: "url", label: "URL", required: true }),
  ],
});

export const Pages = defineCollection({
  slug: "pages",
  fields: [
    defineTextField({ name: "title", label: "Title", required: true }),
    defineBlocksField({
      name: "layout",
      label: "Page layout",
      blocks: [HeroBlock, CallToActionBlock],
    }),
  ],
});
