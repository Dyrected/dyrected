import { defineCollection, defineGlobal, defineConfig } from "@dyrected/core";
import { SqliteAdapter } from "@dyrected/db-sqlite";
import { LocalStorageAdapter } from "@dyrected/storage-local";
import path from "node:path";

const Media = defineCollection({
  slug: "media",
  upload: true,
  fields: [{ name: "alt", type: "text", label: "Alt Text" }],
});

const Admin = defineCollection({
  slug: "admin",
  auth: true,
  admin: {
    useAsTitle: "firstName",
    icon: "UserCog",
  },
  fields: [
    {
      label: "First name",
      name: "firstName",
      type: "text",
    },
    {
      label: "Last name",
      name: "lastName",
      type: "text",
    },
    {
      name: "roles",
      type: "radio",
      label: "Roles",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
        { label: "Viewer", value: "viewer" },
      ],
      admin: { direction: "horizontal" },
    },
  ],
});

const Products = defineCollection({
  slug: "products",
  labels: { plural: "Products", singular: "Product" },
  admin: {
    group: "Content",
    defaultColumns: ["title", "price", "featured", "publishedAt"],
    useAsTitle: "title",
    icon: "Boxes",
  },
  fields: [
    { label: "Title", name: "title", type: "text", required: true },
    {
      label: "Slug",
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      hooks: {
        beforeChange: [({ value }) => value?.toLowerCase()],
      },
      admin: {
        hooks: {
          onChange: ({ value, siblingData }) => {
            const titleSlug = ((siblingData?.title as string) || "").toLowerCase().replace(/\s/g, "-");
            if (titleSlug.includes(value)) return titleSlug;
            return value;
          },
        },
      },
    },
    { label: "Description", name: "description", type: "textarea" },
    { label: "Price", name: "price", type: "number" },
    { label: "Image", name: "image", type: "relationship", relationTo: Media.slug, hasMany: true },
    { label: "Featured", name: "featured", type: "boolean", defaultValue: false },
    { label: "Published At", name: "publishedAt", type: "date" },
  ],
});

const Pages = defineCollection({
  slug: "pages",
  admin: {
    useAsTitle: "title",
    group: "Content",
    previewUrl: "slug == 'home' ? '/' : '/' + slug",
    defaultColumns: ["title", "slug", "updatedAt"],
    urlPattern: "/{slug}",
    icon: "ListCheck",
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
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
    {
      admin: {
        tab: "Page Layout",
      },
      name: "layout",
      type: "blocks",
      blocks: [
        {
          slug: "hero",
          labels: { singular: "Hero", plural: "Heroes" },
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
          fields: [{ name: "content", type: "richText", required: true }],
        },
        {
          slug: "cta",
          labels: { singular: "CTA Banner", plural: "CTA Banners" },
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
          fields: [
            { name: "heading", type: "text" },
            { name: "items", type: "array", fields: [{ name: "name", type: "text" }] },
          ],
        },
        {
          slug: "stats",
          labels: { singular: "Stats Grid", plural: "Stats Grids" },
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
          fields: [
            { name: "heading", type: "text", label: "Heading" },
            { name: "subheading", type: "text", label: "Subheading" },
          ],
        },
      ],
    },
  ],
});

const Authors = defineCollection({
  slug: "authors",
  admin: {
    useAsTitle: "name",
    group: "Content",
    icon: "Users",
  },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "bio", type: "textarea" },
    { name: "avatar", type: "relationship", relationTo: Media.slug },
    {
      name: "blogPosts",
      type: "join",
      collection: "blog",
      on: "author",
      label: "Blog Posts",
      admin: {
        description: "Blog posts written by this author",
      },
    },
    {
      name: "country",
      type: "select",
      options: async () => {
        const cache = globalThis as any as { __dyrectedCountryOptions?: { label: string; value: string }[] };
        if (cache.__dyrectedCountryOptions) return cache.__dyrectedCountryOptions;
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2");
        if (!response.ok) return [];
        const data = (await response.json()) as Array<{ name: { common: string }; cca2: string }>;
        if (!Array.isArray(data)) return [];
        cache.__dyrectedCountryOptions = data
          .map((country) => ({ label: country.name.common, value: country.cca2 }))
          .sort((a, b) => a.label.localeCompare(b.label));
        return cache.__dyrectedCountryOptions;
      },
      admin: { width: "50%" },
    },
    {
      name: "state",
      type: "select",
      options: [],
      admin: {
        width: "50%",
        hooks: {
          options: async ({ siblingData }) => {
            const country = Array.isArray(siblingData?.country) ? siblingData.country[0] : siblingData?.country;
            if (!country) return [];

            const iso2 = String(country).toUpperCase();
            const cache = ((globalThis as any).__dyrectedRegionOptionsByCountry ??= {});
            if (cache[iso2]) return cache[iso2];

            cache[iso2] = fetch("https://countriesnow.space/api/v0.1/countries/states", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ iso2 }),
            })
              .then(async (response) => {
                if (!response.ok) return [];

                const data = (await response.json()) as {
                  error: boolean;
                  data?: { states?: Array<{ name: string; state_code?: string }> };
                };

                if (data.error || !data.data?.states) return [];

                return data.data.states
                  .map((state) => ({ label: state.name, value: state.state_code || state.name }))
                  .sort((a, b) => a.label.localeCompare(b.label));
              })
              .catch(() => {
                delete cache[iso2];
                return [];
              });

            return cache[iso2];
          },
        },
      },
    },
  ],
});

const Blog = defineCollection({
  slug: "blog",
  admin: {
    useAsTitle: "title",
    group: "Content",
    previewUrl: "'/blog/' + slug",
    urlPattern: "/blog/{slug}",
    icon: "File",
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "content", type: "richText", required: true },
    { name: "featuredImage", type: "relationship", relationTo: Media.slug },
    { name: "author", type: "relationship", relationTo: Authors.slug },
    { name: "publishedDate", type: "date", defaultValue: () => new Date().toISOString() },
  ],
});

const Settings = defineGlobal({
  slug: "settings",
  label: "Site Settings",
  fields: [
    { name: "siteName", type: "text" },
    { name: "tagline", type: "text" },
    { name: "logo", type: "relationship", relationTo: Media.slug },
    { name: "footerText", type: "textarea" },
  ],
  admin: { icon: "Settings" },
});

const Navigation = defineGlobal({
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
  admin: { icon: "Navigation" },
});

const RsvpGroups = defineCollection({
  slug: "rsvp-groups",
  labels: { plural: "RSVP Groups", singular: "RSVP Group" },
  hooks: {
    afterRead: [
      ({ doc }) => ({
        ...doc,
        rsvpLink: `/rsvp?group=${doc.slug}`,
      }),
    ],
  },
  admin: {
    useAsTitle: "name",
    group: "Events",
  },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    {
      name: "rsvpLink",
      type: "text",
      label: "RSVP Link",
      admin: {
        component: "rsvpLink",
        readOnly: true,
      },
    },
  ],
});

export default defineConfig({
  collections: [Admin, Media, Pages, Blog, Products, Authors, RsvpGroups],
  globals: [Settings, Navigation],
  db: new SqliteAdapter({
    filename: "dyrected.db",
  }),
  storage: new LocalStorageAdapter({
    uploadDir: path.resolve(process.cwd(), "public/uploads"),
    staticUrlPrefix: "/uploads",
  }),
  admin: {
    branding: {
      logoText: "Acme CMS", // replaces the Dyrected logo
    },
  },
});
