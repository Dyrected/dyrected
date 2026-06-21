import { defineCollection } from "@dyrected/core";

export const Orders = defineCollection({
  slug: "orders",
  fields: [
    { name: "couponCode", type: "text", label: "Coupon code" },
    {
      name: "discountPercent",
      type: "number",
      label: "Discount percentage",
      admin: { condition: "couponCode != null && couponCode != ''" },
    },
  ],
});
