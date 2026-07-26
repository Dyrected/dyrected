import { defineCollection } from "@dyrected/core";
import { Media } from "./media.js";
import { pagesSeed } from "../seed.js";

export const Pages = defineCollection({
  slug: "pages",
  labels: { plural: "Pages", singular: "Page" },
  access: {
    read: true,
    create: { policy: "canManageContent" },
    update: { policy: "canManageContent" },
    delete: { policy: "isAdmin" },
  },
  admin: {
    useAsTitle: "title",
    group: "Content",
    previewUrl: "slug == 'home' ? '/' : '/' + slug",
    defaultColumns: ["title", "slug", "updatedAt"],
    urlPattern: "/{slug}",
    icon: "ListCheck",
  },
  drafts: true,
  /*workflow: {
    transitions: [
      {
        name: "submit-for-review",
        label: "Submit for Review",
        from: "draft",
        to: "in-review",
      },
      {
        name: "approve",
        label: "Approve",
        from: "in-review",
        to: "published",
      },
      {
        name: "reject",
        label: "Reject",
        from: "in-review",
        to: "draft",
        requireComment: true,
      },
      {
        name: "close",
        label: "Close",
        from: "published",
        to: "draft",
        unpublish: true,
        requireComment: true,
      },
    ],
    states: [
      { name: "draft", label: "Draft" },
      { name: "in-review", label: "In Review" },
      { name: "published", label: "Published", published: true },
    ],
    initialState: "draft",
    draftState: "draft",
  },*/
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: {
        hooks: {
          onChange: "siblingData.title != null ? siblingData.title : value",
        },
      },
    },
    {
      admin: {
        tab: "Layout",
      },
      name: "layout",
      type: "blocks",
      blocks: [
        {
          slug: "hero",
          labels: { singular: "Hero", plural: "Heroes" },
          icon: "LayoutTemplate",
          description: "Full-width headline, subtext & call-to-action",
          variants: [
            {
              slug: "centered",
              label: "Centered",
              icon: "AlignCenterVertical",
              description: "Text stacked & centered, CTA below",
            },
            {
              slug: "split",
              label: "Split",
              icon: "AlignVerticalJustifyCenter",
              description: "Left-aligned copy in a narrower column",
            },
          ],
          fields: [
            { name: "heading", type: "text", required: true },
            { name: "subheading", type: "textarea" },
            { name: "image", type: "relationship", relationTo: Media.slug },
            { name: "ctaLabel", type: "text" },
            { name: "ctaLink", type: "url" },
          ],
        },
        {
          slug: "features",
          labels: { singular: "Features Grid", plural: "Features Grids" },
          icon: "LayoutGrid",
          description: "Grid of feature highlights with icons",
          fields: [
            { name: "heading", type: "text" },
            {
              name: "items",
              type: "array",
              fields: [
                { name: "icon", type: "icon", label: "Icon" },
                { name: "title", type: "text", required: true },
                { name: "description", type: "textarea" },
              ],
            },
          ],
        },
        {
          slug: "richContent",
          labels: { singular: "Rich Content", plural: "Rich Content Blocks" },
          icon: "FileText",
          description: "Free-form rich text content",
          fields: [{ name: "content", type: "richText", required: true }],
        },
        {
          slug: "cta",
          labels: { singular: "CTA Banner", plural: "CTA Banners" },
          icon: "Megaphone",
          description: "Conversion-focused banner with a button",
          fields: [
            { name: "heading", type: "text", required: true },
            { name: "description", type: "textarea" },
            { name: "buttonLabel", type: "text" },
            { name: "buttonLink", type: "url" },
          ],
        },
        {
          slug: "pricing",
          labels: { singular: "Pricing Grid", plural: "Pricing Grids" },
          icon: "CircleDollarSign",
          description: "Side-by-side pricing plans",
          fields: [
            { name: "heading", type: "text" },
            {
              name: "plans",
              type: "array",
              fields: [
                { name: "name", type: "text", required: true },
                { name: "price", type: "text" },
                { name: "features", type: "array", fields: [{ name: "text", type: "text" }] },
                { name: "ctaLabel", type: "text" },
                { name: "ctaLink", type: "url" },
              ],
            },
          ],
        },
        {
          slug: "logos",
          labels: { singular: "Logo Bar", plural: "Logo Bars" },
          icon: "Images",
          description: "Row of customer or partner logos",
          fields: [
            { name: "heading", type: "text" },
            { name: "items", type: "array", fields: [{ name: "name", type: "text" }] },
          ],
        },
        {
          slug: "stats",
          labels: { singular: "Stats Grid", plural: "Stats Grids" },
          icon: "ChartBar",
          description: "Key metrics and headline numbers",
          fields: [
            {
              name: "items",
              type: "array",
              fields: [
                { name: "value", type: "text", required: true },
                { name: "label", type: "text", required: true },
              ],
            },
          ],
        },
        {
          slug: "team",
          labels: { singular: "Team Grid", plural: "Team Grids" },
          icon: "Users",
          description: "Meet-the-team member cards",
          fields: [
            { name: "heading", type: "text" },
            {
              name: "members",
              type: "array",
              fields: [
                { name: "name", type: "text", required: true },
                { name: "role", type: "text" },
                { name: "bio", type: "textarea" },
                { name: "initials", type: "text" },
              ],
            },
          ],
        },
        {
          slug: "press",
          labels: { singular: "Press Mentions", plural: "Press Mentions" },
          icon: "Newspaper",
          description: "Press mentions and media quotes",
          fields: [
            {
              name: "items",
              type: "array",
              fields: [
                { name: "publication", type: "text", required: true },
                { name: "quote", type: "textarea", required: true },
                { name: "date", type: "text" },
              ],
            },
          ],
        },
        {
          slug: "faq",
          labels: { singular: "FAQ Accordion", plural: "FAQ Accordions" },
          icon: "CircleQuestionMark",
          description: "Frequently asked questions accordion",
          fields: [
            { name: "heading", type: "text" },
            {
              name: "items",
              type: "array",
              fields: [
                { name: "question", type: "text", required: true },
                { name: "answer", type: "textarea", required: true },
              ],
            },
          ],
        },
        {
          slug: "testimonial",
          labels: { singular: "Testimonial", plural: "Testimonials" },
          icon: "Quote",
          description: "Single customer testimonial quote",
          fields: [
            { name: "quote", type: "textarea", required: true },
            { name: "author", type: "text", required: true },
            { name: "role", type: "text" },
            { name: "initials", type: "text" },
          ],
        },
        {
          slug: "comparison",
          labels: { singular: "Comparison Table", plural: "Comparison Tables" },
          icon: "Table2",
          description: "Feature comparison against competitors",
          fields: [
            { name: "heading", type: "text" },
            {
              name: "rows",
              type: "array",
              fields: [
                { name: "feature", type: "text", required: true },
                { name: "snacktrack", type: "boolean" },
                { name: "competitorA", type: "text", label: "Competitor A Value/Status" },
                { name: "competitorB", type: "text", label: "Competitor B Value/Status" },
              ],
            },
          ],
        },
        {
          slug: "timeline",
          labels: { singular: "Timeline", plural: "Timelines" },
          icon: "History",
          description: "Chronological milestones",
          fields: [
            {
              name: "items",
              type: "array",
              fields: [
                { name: "year", type: "text", required: true },
                { name: "title", type: "text", required: true },
                { name: "description", type: "textarea" },
              ],
            },
          ],
        },
        {
          slug: "contactForm",
          labels: { singular: "Contact Form", plural: "Contact Forms" },
          icon: "Mail",
          description: "Contact form heading & fields",
          fields: [
            { name: "heading", type: "text", label: "Heading" },
            { name: "subheading", type: "text", label: "Subheading" },
          ],
        },
      ],
    },
    {
      name: "seo",
      type: "object",
      admin: {
        tab: "SEO",
      },
      fields: [
        { name: "metaTitle", type: "text" },
        { name: "metaDescription", type: "textarea" },
        { name: "ogImage", type: "relationship", relationTo: Media.slug },
      ],
    },
  ],
  initialData: pagesSeed,
});
