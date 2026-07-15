import { defineCollection, defineTextField } from "@dyrected/core";

const getWorkspaceId = (user?: unknown) => {
  if (!user || typeof user !== "object") return undefined;
  const workspaceId = (user as Record<string, unknown>).workspaceId;
  return typeof workspaceId === "string" && workspaceId.length > 0
    ? workspaceId
    : undefined;
};

export const Projects = defineCollection({
  slug: "projects",
  access: {
    read: ({ user }) =>
      getWorkspaceId(user)
        ? { workspaceId: { equals: getWorkspaceId(user) } }
        : false,
    create: ({ user }) => Boolean(getWorkspaceId(user)),
    update: ({ user }) =>
      getWorkspaceId(user)
        ? { workspaceId: { equals: getWorkspaceId(user) } }
        : false,
    delete: ({ user }) =>
      user?.roles?.includes("admin")
        ? true
        : getWorkspaceId(user)
          ? { workspaceId: { equals: getWorkspaceId(user) } }
          : false,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, user }) => {
        if (operation !== "create") return data;
        const workspaceId = getWorkspaceId(user);
        if (!workspaceId) {
          throw new Error("A workspace is required to create a project.");
        }
        return { ...data, workspaceId };
      },
    ],
  },
  fields: [
    defineTextField({ name: "name", label: "Project name", required: true }),
    defineTextField({
      name: "workspaceId",
      label: "Workspace ID",
      required: true,
      admin: { readOnly: true },
    }),
  ],
});
