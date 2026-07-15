import { defineBooleanField, defineCollection, defineTextField } from "@dyrected/core";

export const Announcements = defineCollection({
  slug: "announcements",
  access: {
    read: ({ user }) =>
      user?.roles?.includes("admin") ? true : { archived: { equals: false } },
    create: ({ user }) => Boolean(user),
    update: ({ user }) => Boolean(user),
    delete: () => false,
  },
  fields: [
    defineTextField({ name: "title", label: "Title", required: true }),
    defineBooleanField({
      name: "archived",
      label: "Archived",
      defaultValue: false,
    }),
  ],
});
