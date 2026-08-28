import {
  defineCollection,
  defineTextField,
  defineNumberField,
  defineSelectField,
  defineConfig,
} from "@dyrected/core";

export const Orders = defineCollection({
  slug: "orders",
  labels: { singular: "Customer Order", plural: "Customer Orders" },
  fields: [
    defineTextField({ name: "orderNumber", label: "Reference #", required: true }),
    defineTextField({ name: "customerName", label: "Customer Name", required: true }),
    defineTextField({ name: "customerContact", label: "Phone / Handle", required: true }),
    defineTextField({ name: "itemDescription", label: "Item Details", required: true }),
    defineNumberField({ name: "quantity", label: "Quantity", required: true }),
    defineNumberField({ name: "subtotal", label: "Subtotal", required: true }),
    defineNumberField({ name: "depositPaid", label: "Deposit Paid", defaultValue: 0 }),
    defineNumberField({ name: "balanceDue", label: "Balance Due", required: true }),
    defineSelectField({
      name: "status",
      label: "Order Status",
      options: [
        { label: "Quote Sent", value: "quote" },
        { label: "Deposit Confirmed", value: "depositPaid" },
        { label: "In Production", value: "inProduction" },
        { label: "Completed", value: "completed" },
      ],
      defaultValue: "quote",
    }),
  ],
});

export const PricingRules = defineCollection({
  slug: "pricing-rules",
  labels: { singular: "Pricing Rule", plural: "Pricing Rules" },
  fields: [
    defineTextField({ name: "itemSlug", label: "Item Identifier", required: true }),
    defineNumberField({ name: "unitPrice", label: "Unit Rate", required: true }),
    defineNumberField({ name: "minimumOrder", label: "Minimum Quantity", defaultValue: 100 }),
  ],
});

import type { DyrectedConfig } from "@dyrected/core";

export const config: DyrectedConfig = {
  collections: [Orders, PricingRules],
  globals: [],
  ai: {
    systemPrompt: "Parse chat transcripts, calculate 70% deposit requirements, and propose order records.",
  },
};
