import { defineCollection } from "@dyrected/core";

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
    { name: "name", type: "text", label: "Project name", required: true },
    {
      name: "owner",
      type: "relationship",
      label: "Owner",
      relationTo: "users",
      required: true,
      admin: { readOnly: true },
    },
  ],
});
