import {
  defineCollection,
  defineTextField,
  defineBooleanField,
  defineNumberField,
  defineSelectField,
  defineView,
} from "@dyrected/core";

export const rsvpMetricsView = defineView({
  slug: "rsvp-overview",
  label: "RSVP Overview",
  layout: "table",
  columns: ["guestName", "attending", "outfitCount"],
  metrics: [
    {
      label: "Total Attending",
      color: "emerald",
      aggregate: { count: "*", where: { attending: { equals: true } } },
    },
    {
      label: "Outfit Revenue",
      color: "rose",
      format: "currency",
      currency: "USD",
      aggregate: {
        sum: "outfitCount",
        cast: "number",
        where: { outfitStatus: { in: ["paid", "collected"] } },
      },
      transform: "value * 150",
      subMetrics: [
        {
          label: "Paid Units",
          aggregate: { sum: "outfitCount", cast: "number", where: { outfitStatus: { equals: "paid" } } },
        },
      ],
    },
    {
      label: "Attendance Rate",
      color: "purple",
      aggregates: {
        totalGuests: { count: "*" },
        confirmed: { count: "*", where: { attending: { equals: true } } },
      },
      expression: "math.round((aggregates.confirmed / aggregates.totalGuests) * 100, 1)",
      format: "percent",
    },
  ],
});

export const EventRsvps = defineCollection({
  slug: "event-rsvps",
  fields: [
    defineTextField({ name: "guestName", label: "Guest Name", required: true }),
    defineBooleanField({ name: "attending", label: "Attending" }),
    defineSelectField({
      name: "outfitStatus",
      label: "Outfit Status",
      options: ["requested", "paid", "collected"],
    }),
    defineNumberField({ name: "outfitCount", label: "Outfits", defaultValue: 1 }),
  ],
  views: [rsvpMetricsView],
});
