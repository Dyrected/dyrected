import { defineCollection, defineJoinField, defineRelationshipField, defineTextField } from "@dyrected/core";

export const Users = defineCollection({
  slug: "users",
  auth: true,
  fields: [
    defineTextField({ name: "name", label: "Name", required: true }),
    defineJoinField({
      name: "posts",
      label: "Posts",
      collection: "posts",
      on: "author",
      limit: 20,
    }),
  ],
});

export const Posts = defineCollection({
  slug: "posts",
  fields: [
    defineTextField({ name: "title", label: "Title", required: true }),
    defineRelationshipField({
      name: "author",
      label: "Author",
      relationTo: "users",
      required: true,
    }),
  ],
});
