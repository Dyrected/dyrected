import { defineCollection } from "@dyrected/core";
import { Media } from "./media.ts";
import { productsSeed } from "../seed.ts";

export const Products = defineCollection({
  slug: "products",
  labels: { plural: "Products", singular: "Product" },
  admin: {
    group: "Content",
    defaultColumns: ["title", "price", "featured", "publishedAt"],
    useAsTitle: "title",
    icon: "Boxes",
  },
  fields: [
    { label: "Title", name: "title", type: "text", required: true },
    {
      label: "Slug",
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      hooks: {
        beforeChange: [({ value }) => value?.toLowerCase()],
      },
      admin: {
        hooks: {
          onChange: ({ value, siblingData }) => {
            const titleSlug = ((siblingData?.title as string) || "").toLowerCase().replace(/\s/g, "-");
            if (titleSlug.includes(value)) return titleSlug;
            return value;
          },
        },
      },
    },
    { label: "Description", name: "description", type: "textarea" },
    { label: "Price", name: "price", type: "number" },
    { label: "Image", name: "image", type: "relationship", relationTo: Media.slug, hasMany: true },
    { label: "Featured", name: "featured", type: "boolean", defaultValue: false },
    { label: "Published At", name: "publishedAt", type: "date" },
  ],
  initialData: productsSeed,
});
