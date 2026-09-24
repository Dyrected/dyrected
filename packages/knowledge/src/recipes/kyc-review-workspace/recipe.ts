import {
  defineCollection,
  defineTextField,
  defineEmailField,
  defineSelectField,
  defineDateTimeField,
  defineView,
  defineAction,
  defineWorkspace,
} from "@dyrected/core";

export const approveAction = defineAction({
  name: "approve",
  label: "Approve",
  icon: "ShieldCheck",
  type: "row",
  confirm: "Approve this investor's identity verification?",
  mutation: { kycStatus: "approved", reviewedAt: "now()" },
});

export const rejectAction = defineAction({
  name: "reject",
  label: "Reject",
  icon: "ShieldX",
  type: "row",
  confirm: "Reject this investor's identity verification?",
  mutation: { kycStatus: "rejected", reviewedAt: "now()" },
});

export const Investors = defineCollection({
  slug: "investors",
  fields: [
    defineTextField({ name: "name", label: "Full Name", required: true }),
    defineEmailField({ name: "email", label: "Email", required: true }),
    defineSelectField({
      name: "kycStatus",
      label: "KYC Status",
      options: ["pending", "approved", "rejected"],
      defaultValue: "pending",
    }),
    defineDateTimeField({ name: "reviewedAt", label: "Reviewed At" }),
  ],
});

export const kycReviewWorkspace = defineWorkspace({
  slug: "kyc-review",
  label: "KYC Review",
  icon: "ShieldAlert",
  group: { name: "Compliance", icon: "Scale", defaultExpanded: true },
  access: ["admin", "compliance"],
  badge: {
    aggregate: {
      collection: "investors",
      where: { kycStatus: { equals: "pending" } },
    },
    variant: "warning",
  },
  views: [
    defineView({
      collection: "investors",
      slug: "pending",
      label: "Pending",
      icon: "Clock",
      layout: "table",
      filter: { kycStatus: { equals: "pending" } },
      columns: ["name", "email", "kycStatus"],
      sort: { field: "name", direction: "asc" },
      actions: [approveAction, rejectAction],
    }),
    defineView({
      collection: "investors",
      slug: "approved",
      label: "Approved",
      icon: "ShieldCheck",
      layout: "table",
      filter: { kycStatus: { equals: "approved" } },
      columns: ["name", "email", "reviewedAt"],
    }),
    defineView({
      collection: "investors",
      slug: "rejected",
      label: "Rejected",
      icon: "ShieldX",
      layout: "table",
      filter: { kycStatus: { equals: "rejected" } },
      columns: ["name", "email", "reviewedAt"],
    }),
  ],
});
