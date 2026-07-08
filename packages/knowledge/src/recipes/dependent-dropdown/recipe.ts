import { defineCollection, defineSelectField } from "@dyrected/core";

export const Locations = defineCollection({
  slug: "locations",
  fields: [
    defineSelectField({
      name: "country",
      label: "Country",
      required: true,
      options: [
        { label: "Nigeria", value: "ng" },
        { label: "United States", value: "us" },
      ],
    }),
    defineSelectField({
      name: "region",
      label: "State or region",
      required: true,
      options: [],
      admin: {
        hooks: {
          options: ({ siblingData }) => {
            if (siblingData.country === "ng") return ["Lagos", "Abuja", "Oyo"];
            if (siblingData.country === "us")
              return ["California", "New York", "Texas"];
            return [];
          },
        },
      },
    }),
  ],
});
