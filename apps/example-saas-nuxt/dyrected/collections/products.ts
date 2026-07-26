import { defineCollection } from "@dyrected/core";
import { Media } from "./media.js";
import { productsSeed } from "../seed.js";

export const Products = defineCollection({
  slug: "products",
  labels: { plural: "Products", singular: "Product" },
  admin: {
    group: "Content",
    defaultColumns: ["title", "sku", "price", "status", "rating", "featured", "publishedAt"],
    useAsTitle: "title",
    icon: "Boxes",
  },
  fields: [
    { label: "Title", name: "title", type: "text", required: true },
    {
      label: "SKU",
      name: "sku",
      type: "text",
      // Renders as a monospace pill in the list — good for codes and IDs.
      admin: { format: "code" },
    },
    {
      label: "Slug",
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      hooks: {
        beforeChange: ["lower(value)"],
      },
      admin: {
        hooks: {
          onChange:
            "value == '' || value == null ? (siblingData.title != null ? slugify(siblingData.title) : value) : value",
        },
      },
    },
    {
      label: "Description",
      name: "description",
      type: "textarea",
      // Keep long copy from stretching the list column.
      admin: { format: { type: "truncate", length: 80 } },
    },
    {
      label: "Price",
      name: "price",
      type: "number",
      // Formats the raw number as a currency amount.
      admin: { format: { type: "currency", currency: "USD" } },
    },
    {
      label: "Discount",
      name: "discount",
      type: "number",
      defaultValue: 0,
      // Stored as 0–100, so scaling is off (10 → "10%").
      admin: { format: { type: "percent", scale: false } },
    },
    {
      label: "Rating",
      name: "rating",
      type: "number",
      min: 0,
      max: 5,
      // Renders as stars instead of a number.
      admin: { format: { type: "rating", max: 5 } },
    },
    {
      label: "Stock",
      name: "stock",
      type: "number",
      defaultValue: 0,
      // Abbreviates large counts (1200 → "1.2K").
      admin: { format: "compact" },
    },
    {
      label: "Status",
      name: "status",
      type: "select",
      defaultValue: "active",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Active", value: "active" },
        { label: "Archived", value: "archived" },
      ],
      // Colored status badge in the list.
      admin: {
        format: {
          type: "badge",
          tones: { draft: "neutral", active: "success", archived: "danger" },
        },
      },
    },
    {
      label: "Featured",
      name: "featured",
      type: "boolean",
      defaultValue: false,
      // Custom labels + tones instead of the default Yes/No.
      admin: {
        format: {
          type: "boolean",
          true: { label: "Featured", tone: "success" },
          false: { label: "Standard", tone: "neutral" },
        },
      },
    },
    {
      label: "Metadata",
      name: "metadata",
      type: "json",
      // Shows a compact key count rather than the raw blob.
      admin: { format: "summary" },
    },
    { label: "Image", name: "image", type: "relationship", relationTo: Media.slug, hasMany: true },
    {
      label: "Published At",
      name: "publishedAt",
      type: "date",
      // Shows "3 days ago" style relative dates.
      admin: { format: "relative" },
    },
  ],
  initialData: productsSeed,
});
