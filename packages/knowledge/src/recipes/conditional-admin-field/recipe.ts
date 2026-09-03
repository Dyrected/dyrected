import { defineCollection, defineNumberField, defineTextField, when } from "@dyrected/core";

export const Orders = defineCollection({
  slug: "orders",
  fields: [
    defineTextField({ name: "couponCode", label: "Coupon code" }),
    defineNumberField({
      name: "discountPercent",
      label: "Discount percentage",
      admin: { condition: when.fieldNotEmpty("couponCode") },
    }),
  ],
});
