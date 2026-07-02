import { defineGlobal } from "@dyrected/core";
import { Media } from "../collections/media.ts";

export const Settings = defineGlobal({
  slug: "settings",
  label: "Site Settings",
  fields: [
    { name: "siteName", type: "text", label: "Site Name" },
    { name: "tagline", type: "text", label: "Tagline" },
    { name: "logo", type: "relationship", relationTo: Media.slug, label: "Logo Image" },
    {
      name: "logoInitials",
      type: "text",
      label: "Logo Initials",
      admin: { description: 'Shown as a badge when no logo image is uploaded (e.g. "ST").' },
    },
    { name: "footerText", type: "textarea", label: "Footer Text" },
  ],
  initialData: {
    siteName: "SnackTrack Pro",
    tagline: "Enterprise snack management.",
    logoInitials: "ST",
  },
  admin: { icon: "Settings" },
});
