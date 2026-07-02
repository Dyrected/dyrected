import { defineGlobal } from "@dyrected/core";

export const Footer = defineGlobal({
  slug: "footer",
  label: "Footer",
  fields: [
    {
      name: "description",
      type: "textarea",
      label: "Description",
      admin: { description: "Short paragraph shown under the logo." },
    },
    {
      name: "columns",
      type: "array",
      label: "Link Columns",
      fields: [
        { name: "heading", type: "text", label: "Heading" },
        {
          name: "links",
          type: "array",
          label: "Links",
          fields: [
            // A `url` field carries both its label and href, so no separate label field.
            { name: "link", type: "url", label: "Link" },
          ],
        },
      ],
    },
    { name: "copyright", type: "text", label: "Copyright" },
    {
      name: "badges",
      type: "array",
      label: "Badges",
      admin: { description: "Compliance / certification line, joined with bullets." },
      fields: [{ name: "text", type: "text", label: "Text" }],
    },
  ],
  initialData: {
    description: "Enterprise-grade AI-powered office snack inventory management. SOC 2 Type II certified.",
    columns: [
      {
        heading: "Product",
        links: [
          { link: { url: "/features", label: "Features" } },
          { link: { url: "/pricing", label: "Pricing" } },
          { link: { url: "#", label: "Changelog" } },
          { link: { url: "#", label: "Roadmap" } },
        ],
      },
      {
        heading: "Company",
        links: [
          { link: { url: "/about", label: "About" } },
          { link: { url: "/blog", label: "Blog" } },
          { link: { url: "#", label: "Careers" } },
          { link: { url: "/contact", label: "Contact" } },
        ],
      },
      {
        heading: "Legal",
        links: [
          { link: { url: "#", label: "Privacy Policy" } },
          { link: { url: "#", label: "Terms of Service" } },
          { link: { url: "#", label: "Snack Data Policy" } },
          { link: { url: "#", label: "Cookie Preferences" } },
        ],
      },
    ],
    copyright: "© 2026 SnackTrack Pro, Inc. All snacks reserved.",
    badges: [{ text: "SOC 2 Type II" }, { text: "GDPR Compliant" }, { text: "ISO 9001 Snack Certified" }],
  },
  admin: { icon: "PanelBottom" },
});
