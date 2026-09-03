import { defineCollection, defineNumberField, defineTextField, expr } from "@dyrected/core";

export const Orders = defineCollection({
  slug: "orders",
  fields: [
    defineTextField({ name: "couponCode", label: "Coupon code" }),
    defineNumberField({
      name: "discountPercent",
      label: "Discount percentage",
      admin: { condition: expr.notEmpty("couponCode") },
    }),
  ],
});
