import { defineCollection } from "@dyrected/core";
import { Media } from "./media.ts";
import { Authors } from "./authors.ts";
import { blogSeed } from "../seed.ts";

export const Blog = defineCollection({
  slug: "blog",
  labels: { plural: "Articles", singular: "Article" },
  access: {
    read: true,
    create: { policy: "hasRole", params: { roles: ["admin", "editor"] } },
    update: { policy: "hasRole", params: { roles: ["admin", "editor"] } },
    delete: { policy: "hasRole", params: { role: "admin" } },
  },
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
  initialData: blogSeed,
});
