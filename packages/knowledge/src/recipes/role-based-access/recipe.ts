import { defineCollection } from "@dyrected/core";

export const Articles = defineCollection({
  slug: "articles",
  access: {
    read: () => true,
    create: ({ user }) => user?.roles?.some((role) => role === "editor" || role === "admin") ?? false,
    update: ({ user }) => user?.roles?.some((role) => role === "editor" || role === "admin") ?? false,
    delete: ({ user }) => user?.roles?.includes("admin") ?? false,
  },
  fields: [{ name: "title", type: "text", label: "Title", required: true }],
});
