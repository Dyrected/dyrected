import { defineCollection } from "@dyrected/core";

export const Events = defineCollection({
  slug: "events",
  hooks: {
    beforeChange: [
      ({ data, doc }) => {
        const startsAt = data.startsAt ?? doc?.startsAt;
        const endsAt = data.endsAt ?? doc?.endsAt;

        const start = startsAt ? new Date(startsAt) : undefined;
        const end = endsAt ? new Date(endsAt) : undefined;

        if (start && Number.isNaN(start.getTime())) {
          throw new Error("The event start time must be a valid date.");
        }
        if (end && Number.isNaN(end.getTime())) {
          throw new Error("The event end time must be a valid date.");
        }
        if (start && end && end <= start) {
          throw new Error("The event end time must be after its start time.");
        }

        return data;
      },
    ],
  },
  fields: [
    { name: "title", type: "text", label: "Title", required: true },
    {
      name: "startsAt",
      type: "datetime",
      label: "Starts at",
      required: true,
    },
    {
      name: "endsAt",
      type: "datetime",
      label: "Ends at",
      required: true,
    },
  ],
});
