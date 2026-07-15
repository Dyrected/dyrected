import { defineEmailField, defineGlobal, defineTextField, defineUrlField } from "@dyrected/core";

export const SiteSettings = defineGlobal({
  slug: "site-settings",
  label: "Site settings",
  initialData: {
    siteName: "Acme Studio",
    supportEmail: "hello@example.com",
  },
  fields: [
    defineTextField({ name: "siteName", label: "Site name", required: true }),
    defineTextField({ name: "tagline", label: "Tagline", defaultValue: "" }),
    defineEmailField({
      name: "supportEmail",
      label: "Support email",
      required: true,
    }),
    defineUrlField({
      name: "primaryCta",
      label: "Primary call to action",
    }),
  ],
});
