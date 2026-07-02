import { defineCollection } from "@dyrected/core";

export const Admin = defineCollection({
  slug: "admin",
  labels: { plural: "Admins", singular: "Admin" },
  auth: true,
  admin: {
    useAsTitle: "firstName",
    icon: "UserCog",
  },
  fields: [
    {
      label: "First name",
      name: "firstName",
      type: "text",
    },
    {
      label: "Last name",
      name: "lastName",
      type: "text",
    },
    {
      name: "roles",
      type: "radio",
      label: "Roles",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
        { label: "Viewer", value: "viewer" },
      ],
      admin: { direction: "horizontal" },
    },
  ],
});
