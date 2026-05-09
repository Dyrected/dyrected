import { defineCollection } from "@dyrected/core";

export const users = defineCollection({
  slug: "users",
  labels: { singular: "User", plural: "Users" },
  auth: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "roles", "createdAt"],
  },
  fields: [
    {
      name: "email",
      type: "email",
      label: "Email",
      required: true,
      unique: true,
    },
    {
      name: "password",
      type: "text", // The auth controller handles hashing
      label: "Password",
      required: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: "roles",
      type: "select",
      label: "Roles",
      hasMany: true,
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
        { label: "User", value: "user" },
      ],
      defaultValue: ["user"],
    },
  ],
});
