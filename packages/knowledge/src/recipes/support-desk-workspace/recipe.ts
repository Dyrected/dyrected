import {
  defineCollection,
  defineTextField,
  defineTextareaField,
  defineSelectField,
  defineDateTimeField,
  defineView,
  defineAction,
  defineWorkspace,
} from "@dyrected/core";

export const resolveAction = defineAction({
  name: "resolve",
  label: "Resolve",
  icon: "CheckCircle2",
  type: "row",
  mutation: { status: "resolved", resolvedAt: "now()" },
});

export const Tickets = defineCollection({
  slug: "tickets",
  fields: [
    defineTextField({ name: "subject", label: "Subject", required: true }),
    defineTextareaField({ name: "message", label: "Message" }),
    defineSelectField({
      name: "priority",
      label: "Priority",
      options: ["low", "normal", "urgent"],
      defaultValue: "normal",
    }),
    defineSelectField({
      name: "status",
      label: "Status",
      options: ["open", "resolved"],
      defaultValue: "open",
    }),
    defineDateTimeField({ name: "resolvedAt", label: "Resolved At" }),
  ],
});

export const supportDeskWorkspace = defineWorkspace({
  slug: "support-desk",
  label: "Support Desk",
  icon: "LifeBuoy",
  group: { name: "Support", icon: "Headset", defaultExpanded: true },
  badge: {
    aggregate: {
      collection: "tickets",
      where: { status: { equals: "open" } },
    },
    variant: "info",
  },
  views: [
    defineView({
      collection: "tickets",
      slug: "open",
      label: "Open",
      icon: "Inbox",
      layout: "table",
      filter: { status: { equals: "open" } },
      columns: ["subject", "priority", "status"],
      sort: { field: "priority", direction: "desc" },
      actions: [resolveAction],
    }),
    defineView({
      collection: "tickets",
      slug: "urgent",
      label: "Urgent",
      icon: "Siren",
      layout: "table",
      filter: { status: { equals: "open" }, priority: { equals: "urgent" } },
      columns: ["subject", "priority"],
      badge: {
        aggregate: {
          collection: "tickets",
          where: { status: { equals: "open" }, priority: { equals: "urgent" } },
        },
        variant: "destructive",
      },
      actions: [resolveAction],
    }),
    defineView({
      collection: "tickets",
      slug: "resolved",
      label: "Resolved",
      icon: "Archive",
      layout: "table",
      filter: { status: { equals: "resolved" } },
      columns: ["subject", "resolvedAt"],
    }),
  ],
});
