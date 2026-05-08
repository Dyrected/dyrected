import { defineCollection } from "@dyrected/core";
import { HeroBlockConfig } from "../../components/blocks/HeroBlock/config.ts";
import { RichContentBlockConfig } from "../../components/blocks/RichContentBlock/config.ts";
import { GalleryBlockConfig } from "../../components/blocks/GalleryBlock/config.ts";
import { CTABlockConfig } from "../../components/blocks/CTABlock/config.ts";
import { TestimonialBlockConfig } from "../../components/blocks/TestimonialBlock/config.ts";

export const pages = defineCollection({
  slug: "pages",
  labels: { singular: "Page", plural: "Pages" },
  admin: { useAsTitle: "title", group: "Content" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    {
      name: "seo",
      type: "object",
      fields: [
        { name: "metaTitle", type: "text" },
        { name: "metaDescription", type: "textarea" },
        { name: "ogImage", type: "relationship", relationTo: "media" },
      ],
    },
    {
      name: "layout",
      type: "blocks",
      label: "Page Layout",
      blocks: [HeroBlockConfig, RichContentBlockConfig, GalleryBlockConfig, CTABlockConfig, TestimonialBlockConfig],
    },
  ],
});
