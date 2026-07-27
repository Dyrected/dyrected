import { defineCollection, defineMultiSelectField, defineTextField } from "@dyrected/core";
import { policy } from "../access-policies.js";

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
        read: policy("isAdmin"),
        update: policy("isAdmin"),
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
