import {
  defineCollection,
  defineNumberField,
  defineSelectField,
  defineTextField,
  when,
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
          onChange: when.then(
            when.fieldEmpty("value"),
            when.slugify("siblingData.title"),
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
          onChange: when.match()
            .case(when.sibling("planTier").equals("trial"), 0)
            .case(when.sibling("planTier").equals("standard"), 25000)
            .case(when.sibling("planTier").equals("enterprise"), 100000)
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
          onChange: when.concat(
            "INV-",
            when.upper("siblingData.planTier"),
            "-",
            when.slugify("siblingData.title")
          ),
        },
      },
    }),
  ],
});
