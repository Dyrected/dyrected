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
        {
          label: "Choose Link Type",
          name: "linkType",
          type: "select",
          options: [
            { label: "Page", value: "page" },
            { label: "URL", value: "url" },
          ],
          admin: { layout: "radio", direction: "horizontal" },
          defaultValue: "page",
        },
        { name: "url", type: "url", admin: { condition: "linkType === 'url'" } },
        {
          name: "page",
          type: "relationship",
          relationTo: "pages",
          admin: { condition: "linkType === 'page'" },
        },
        {
          name: "openInNewTab",
          type: "boolean",
          defaultValue: false,
        },
      ],
    },
  ],
});
