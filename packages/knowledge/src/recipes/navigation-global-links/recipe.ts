import { defineArrayField, defineGlobal, defineTextField, defineUrlField } from "@dyrected/core";

export const Navigation = defineGlobal({
  slug: "navigation",
  label: "Navigation",
  fields: [
    defineArrayField({
      name: "items",
      label: "Navigation items",
      fields: [
        defineTextField({ name: "label", label: "Label", required: true }),
        defineUrlField({ name: "link", label: "Link", required: true }),
        defineArrayField({
          name: "children",
          label: "Child links",
          fields: [
            defineTextField({ name: "label", label: "Label", required: true }),
            defineUrlField({ name: "link", label: "Link", required: true }),
          ],
        }),
      ],
    }),
  ],
});
