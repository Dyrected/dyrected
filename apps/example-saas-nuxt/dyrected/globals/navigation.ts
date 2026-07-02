import { defineGlobal } from "@dyrected/core";
import { navigationSeed } from "../seed.ts";

export const Navigation = defineGlobal({
  slug: "navigation",
  label: "Navigation",
  fields: [
    {
      label: "Navigation Links",
      name: "navLinks",
      type: "array",
      fields: [
        { name: "title", type: "text" },
        { name: "url", type: "url" },
      ],
    },
    { label: "Call to Action", name: "ctaButton", type: "url" },
  ],
  initialData: navigationSeed,
  admin: { icon: "Navigation" },
});
