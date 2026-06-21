import { defineCollection } from "@dyrected/core";

export const Users = defineCollection({
  slug: "users",
  auth: true,
  fields: [
    { name: "name", type: "text", label: "Name", required: true },
    {
      name: "posts",
      type: "join",
      label: "Posts",
      collection: "posts",
      on: "author",
      limit: 20,
    },
  ],
});

export const Posts = defineCollection({
  slug: "posts",
  fields: [
    { name: "title", type: "text", label: "Title", required: true },
    {
      name: "author",
      type: "relationship",
      label: "Author",
      relationTo: "users",
      required: true,
    },
  ],
});
