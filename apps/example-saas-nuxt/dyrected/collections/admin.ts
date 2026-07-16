import { defineCollection, defineMultiSelectField, defineTextField } from "@dyrected/core";

export const Admin = defineCollection({
  slug: "admin",
  labels: { plural: "Admins", singular: "Admin" },
  auth: true,
  admin: {
    useAsTitle: "firstName",
    icon: "UserCog",
  },
  fields: [
    defineTextField({
      label: "First name",
      name: "firstName",
    }),
    defineTextField({
      label: "Last name",
      name: "lastName",
    }),
    defineMultiSelectField({
      name: "roles",
      label: "Roles",
      defaultValue: ["viewer"],
      access: {
        read: { policy: "hasRole", params: { role: "admin" } },
        update: { policy: "hasRole", params: { role: "admin" } },
      },
      options: [
        { label: "Admin", value: "admin" },
        { label: "Publisher", value: "publisher" },
        { label: "Editor", value: "editor" },
        { label: "Viewer", value: "viewer" },
      ],
    }),
  ],
});
