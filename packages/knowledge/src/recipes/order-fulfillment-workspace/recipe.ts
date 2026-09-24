import {
  defineCollection,
  defineTextField,
  defineNumberField,
  defineSelectField,
  defineDateTimeField,
  defineView,
  defineAction,
  defineWorkspace,
} from "@dyrected/core";

export const markPaidAction = defineAction({
  name: "markPaid",
  label: "Mark Paid",
  icon: "CircleDollarSign",
  type: "row",
  mutation: { status: "paid", paidAt: "now()" },
});

export const markShippedAction = defineAction({
  name: "markShipped",
  label: "Mark Shipped",
  icon: "Truck",
  type: "row",
  mutation: { status: "shipped", shippedAt: "now()" },
});

export const Orders = defineCollection({
  slug: "orders",
  fields: [
    defineTextField({ name: "customerName", label: "Customer Name", required: true }),
    defineSelectField({
      name: "status",
      label: "Status",
      options: ["requested", "paid", "shipped"],
      defaultValue: "requested",
    }),
    defineNumberField({ name: "total", label: "Order Total", defaultValue: 0 }),
    defineDateTimeField({ name: "paidAt", label: "Paid At" }),
    defineDateTimeField({ name: "shippedAt", label: "Shipped At" }),
  ],
});

export const orderFulfillmentWorkspace = defineWorkspace({
  slug: "order-fulfillment",
  label: "Fulfillment",
  icon: "PackageCheck",
  group: { name: "Operations", icon: "Briefcase", defaultExpanded: true },
  badge: {
    aggregate: {
      collection: "orders",
      where: { status: { equals: "requested" } },
    },
    variant: "warning",
  },
  views: [
    defineView({
      collection: "orders",
      slug: "pipeline",
      label: "Pipeline",
      icon: "Kanban",
      layout: "kanban",
      groupBy: "status",
      columns: ["customerName", "total"],
      actions: [markPaidAction, markShippedAction],
      metrics: [
        {
          label: "Open Orders",
          color: "amber",
          aggregate: { count: "*", where: { status: { in: ["requested", "paid"] } } },
        },
        {
          label: "Revenue Collected",
          color: "emerald",
          format: "currency",
          currency: "USD",
          aggregate: {
            sum: "total",
            cast: "number",
            where: { status: { in: ["paid", "shipped"] } },
          },
        },
      ],
    }),
    defineView({
      collection: "orders",
      slug: "awaiting-payment",
      label: "Awaiting Payment",
      icon: "Hourglass",
      layout: "table",
      filter: { status: { equals: "requested" } },
      columns: ["customerName", "total", "status"],
      sort: { field: "customerName", direction: "asc" },
      actions: [markPaidAction],
    }),
  ],
});
