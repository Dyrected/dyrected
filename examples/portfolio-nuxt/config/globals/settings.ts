import { defineGlobal } from "@dyrected/core";

export const settings = defineGlobal({
  slug: "settings",
  label: "Site Settings",
  fields: [
    { name: "siteName", type: "text" },
    { name: "tagline", type: "text" },
    { name: "logo", type: "relationship", relationTo: "media" },
    { name: "homePage", type: "relationship", relationTo: "pages" },
    { name: "footerText", type: "textarea" },
  ],
});
