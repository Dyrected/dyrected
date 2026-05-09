import { defineCollection } from "@dyrected/core";

export const posts = defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  admin: { 
    useAsTitle: "title", 
    group: "Content",
    previewUrl: "'/blog/' + slug"
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "content", type: "richText", required: true },
    { name: "author", type: "relationship", relationTo: "users" },
    { name: "featuredImage", type: "relationship", relationTo: "media" },
    {
      name: "status",
      type: "select",
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
    },
  ],
});
