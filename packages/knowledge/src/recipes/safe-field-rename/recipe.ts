import { defineCollection } from "@dyrected/core";

export const Customers = defineCollection({
  slug: "customers",
  fields: [
    {
      name: "fullName",
      type: "text",
      label: "Full name",
      renameTo: "name",
      defaultValue: "",
      required: true,
    },
  ],
});
