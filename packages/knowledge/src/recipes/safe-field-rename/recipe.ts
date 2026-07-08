import { defineCollection, defineTextField } from "@dyrected/core";

export const Customers = defineCollection({
  slug: "customers",
  fields: [
    defineTextField({
      name: "fullName",
      label: "Full name",
      renameTo: "name",
      defaultValue: "",
      required: true,
    }),
  ],
});
