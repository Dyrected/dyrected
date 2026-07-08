import { defineCollection, defineTextField } from "@dyrected/core";

export const Articles = defineCollection({
  slug: "articles",
  access: {
    read: () => true,
    create: ({ user }) => user?.roles?.some((role) => role === "editor" || role === "admin") ?? false,
    update: ({ user }) => user?.roles?.some((role) => role === "editor" || role === "admin") ?? false,
    delete: ({ user }) => user?.roles?.includes("admin") ?? false,
  },
  fields: [defineTextField({ name: "title", label: "Title", required: true })],
});
