import { defineCollection } from "@dyrected/core";

export const Locations = defineCollection({
  slug: "locations",
  fields: [
    {
      name: "country",
      type: "select",
      label: "Country",
      required: true,
      options: [
        { label: "Nigeria", value: "ng" },
        { label: "United States", value: "us" },
      ],
    },
    {
      name: "region",
      type: "select",
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
    },
  ],
});
