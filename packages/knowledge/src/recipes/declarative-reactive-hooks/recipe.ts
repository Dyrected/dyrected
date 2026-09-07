import {
  defineCollection,
  defineNumberField,
  defineSelectField,
  defineTextField,
  expr,
} from "@dyrected/core";

export const Invoices = defineCollection({
  slug: "invoices",
  fields: [
    defineTextField({
      name: "title",
      label: "Invoice Title",
      required: true,
    }),

    defineTextField({
      name: "slug",
      label: "Slug",
      required: true,
      admin: {
        hooks: {
          onChange: expr.ifElse(
            expr.empty("value"),
            expr.slugify("siblingData.title"),
            "value"
          ),
        },
      },
    }),

    defineSelectField({
      name: "planTier",
      label: "Plan Tier",
      defaultValue: "standard",
      options: [
        { label: "Free Trial", value: "trial" },
        { label: "Standard", value: "standard" },
        { label: "Enterprise", value: "enterprise" },
      ],
    }),

    defineNumberField({
      name: "basePrice",
      label: "Base Price (₦)",
      admin: {
        readOnly: true,
        hooks: {
          onChange: expr.match()
            .case(expr.sibling("planTier").equals("trial"), 0)
            .case(expr.sibling("planTier").equals("standard"), 25000)
            .case(expr.sibling("planTier").equals("enterprise"), 100000)
            .otherwise(25000),
        },
      },
    }),

    defineTextField({
      name: "referenceCode",
      label: "Payment Reference",
      admin: {
        readOnly: true,
        hooks: {
          onChange: expr.concat(
            "INV-",
            expr.upper("siblingData.planTier"),
            "-",
            expr.slugify("siblingData.title")
          ),
        },
      },
    }),
  ],
});
