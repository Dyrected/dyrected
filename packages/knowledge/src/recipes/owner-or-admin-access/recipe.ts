import { defineCollection, defineRelationshipField, defineTextField } from "@dyrected/core";

const ownerConstraint = (user?: { sub?: string; roles?: string[] }) => {
  if (user?.roles?.includes("admin")) return true;
  return user?.sub ? { owner: { equals: user.sub } } : false;
};

export const Tickets = defineCollection({
  slug: "tickets",
  access: {
    read: ({ user }) => ownerConstraint(user),
    create: ({ user }) => Boolean(user?.sub),
    update: ({ user }) => ownerConstraint(user),
    delete: ({ user }) => ownerConstraint(user),
  },
  hooks: {
    beforeChange: [
      ({ data, operation, user }) => {
        if (operation !== "create") return data;
        if (!user?.sub) throw new Error("Authentication is required.");
        return { ...data, owner: user.sub };
      },
    ],
  },
  fields: [
    defineTextField({ name: "subject", label: "Subject", required: true }),
    defineRelationshipField({
      name: "owner",
      label: "Owner",
      relationTo: "users",
      required: true,
      admin: { readOnly: true },
    }),
  ],
});
