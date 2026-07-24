import type { AccessPolicyResolver, AuthenticatedUser } from "@dyrected/core";

type ExampleSaasUser = AuthenticatedUser & {
  roles?: string[];
};

type ExampleSaasAccessPolicy = AccessPolicyResolver<Record<string, unknown>, ExampleSaasUser> | string | boolean;

const hasRole = (user: ExampleSaasUser | undefined, role: string) => user?.roles?.includes(role) ?? false;

const getParamRoles = (params: Record<string, unknown> | undefined) => {
  const roles = Array.isArray(params?.roles)
    ? params.roles.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  const role = typeof params?.role === "string" ? [params.role] : [];
  return [...new Set([...roles, ...role])];
};

export const exampleSaasAccessPolicies: Record<string, ExampleSaasAccessPolicy> = {
  isAuthenticated: "user != null",
  isAdmin: "user != null && user.roles && 'admin' in user.roles",
  canManageContent:
    "user != null && user.roles && ('admin' in user.roles || 'editor' in user.roles || 'publisher' in user.roles)",
  hasRole: ({ user, params }) => {
    const roles = getParamRoles(params);
    return roles.length > 0 ? roles.some((role) => hasRole(user, role)) : false;
  },
};
