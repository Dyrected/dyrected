import { defineGlobal } from "@dyrected/core";

export const navigation = defineGlobal({
  slug: "navigation",
  label: "Navigation",
  fields: [
    {
      name: "menuItems",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "url", type: "url" },
        { name: "page", type: "relationship", relationTo: "pages" },
        { name: "openInNewTab", type: "boolean", defaultValue: false },
      ],
    },
  ],
});
