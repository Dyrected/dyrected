import { defineCollection, defineNumberField, defineSelectField, defineTextField } from "@dyrected/core";

export function calculateOrderTotals(item: Record<string, any> = {}) {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  const discount = Number(item.discount) || 0;
  const subtotal = quantity * unitPrice;
  const total = Math.max(0, subtotal - discount);
  return { subtotal, total };
}

export const Orders = defineCollection({
  slug: "orders",
  hooks: {
    beforeChange: [
      ({ data, doc, operation }) => {
        const merged = { ...(doc || {}), ...data };
        const { total } = calculateOrderTotals(merged);
        return {
          ...data,
          totalAmount: total,
        };
      },
    ],
  },
  fields: [
    defineNumberField({
      name: "quantity",
      label: "Quantity",
      required: true,
      defaultValue: 1,
    }),
    defineNumberField({
      name: "unitPrice",
      label: "Unit Price (₦)",
      required: true,
      defaultValue: 10000,
    }),
    defineNumberField({
      name: "discount",
      label: "Discount (₦)",
      defaultValue: 0,
    }),
    defineNumberField({
      name: "totalAmount",
      label: "Total Amount (₦)",
      admin: {
        readOnly: true,
        hooks: {
          onChange: ({ siblingData }) => calculateOrderTotals(siblingData).total,
        },
      },
    }),
    defineSelectField({
      name: "paymentStatus",
      label: "Payment Status",
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Partial", value: "partial" },
        { label: "Paid", value: "paid" },
      ],
    }),
    defineNumberField({
      name: "amountPaid",
      label: "Amount Paid (₦)",
      admin: {
        hooks: {
          onChange: ({ value, siblingData }) => {
            const { total } = calculateOrderTotals(siblingData);
            const status = siblingData.paymentStatus;

            if (status === "pending") return 0;
            if (status === "paid") return total;
            if (status === "partial") {
              if (typeof value === "number" && value > 0 && value !== total) {
                return value;
              }
              return total;
            }
            return value;
          },
        },
      },
    }),
  ],
});
