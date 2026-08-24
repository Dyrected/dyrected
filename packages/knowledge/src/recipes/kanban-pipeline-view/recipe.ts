import {
  defineCollection,
  defineTextField,
  defineBooleanField,
  defineNumberField,
  defineSelectField,
  defineView,
  defineAction,
} from "@dyrected/core";

export const markPaidAction = defineAction({
  name: "markPaid",
  label: "Mark Paid",
  icon: "CheckCircle2",
  type: "row",
  mutation: { status: "paid", paidAt: "now()" },
});

export const markCollectedAction = defineAction({
  name: "markCollected",
  label: "Mark Collected",
  icon: "PackageCheck",
  type: "row",
  mutation: { status: "collected", collectedAt: "now()" },
});

export const fulfillmentPipelineView = defineView({
  slug: "fulfillment-pipeline",
  label: "Order Fulfillment",
  icon: "Shirt",
  layout: "kanban",
  groupBy: "status",
  columns: ["customerName", "itemSize", "quantity"],
  actions: [markPaidAction, markCollectedAction],
});

export const Orders = defineCollection({
  slug: "orders",
  fields: [
    defineTextField({ name: "customerName", label: "Customer Name", required: true }),
    defineSelectField({
      name: "status",
      label: "Order Status",
      options: ["requested", "paid", "collected"],
      defaultValue: "requested",
    }),
    defineSelectField({
      name: "itemSize",
      label: "Size",
      options: ["S", "M", "L", "XL", "XXL"],
    }),
    defineNumberField({ name: "quantity", label: "Quantity", defaultValue: 1 }),
  ],
  views: [fulfillmentPipelineView],
});
