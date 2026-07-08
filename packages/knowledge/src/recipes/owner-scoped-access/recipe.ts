import { defineCollection, defineRelationshipField, defineTextField } from "@dyrected/core";

export const Projects = defineCollection({
  slug: "projects",
  access: {
    read: ({ user }) => (user ? { owner: { equals: user.sub } } : false),
    create: ({ user }) => Boolean(user),
    update: ({ user }) => (user ? { owner: { equals: user.sub } } : false),
    delete: ({ user }) => (user ? { owner: { equals: user.sub } } : false),
  },
  hooks: {
    beforeChange: [
      ({ data, operation, user }) => {
        if (operation !== "create") return data;
        if (!user) throw new Error("Authentication is required to create a project.");
        return { ...data, owner: user.sub };
      },
    ],
  },
  fields: [
    defineTextField({ name: "name", label: "Project name", required: true }),
    defineRelationshipField({
      name: "owner",
      label: "Owner",
      relationTo: "users",
      required: true,
      admin: { readOnly: true },
    }),
  ],
});
