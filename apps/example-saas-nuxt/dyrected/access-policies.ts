import type { AccessPolicyResolver, AuthenticatedUser, NamedAccessPolicy } from "@dyrected/core";

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

// Defined without an explicit Record annotation so TypeScript preserves the
// literal key union — that's what makes `PolicyName` and `policy()` work.
const _policies = {
  isAuthenticated: "user != null",
  isAdmin: "user != null && user.role && (user.role == 'admin' || user.role == 'owner')",
  canManageContent: "user != null && (user.role == 'owner' || user.role == 'admin' || user.role == 'editor')",
  hasRole: ({ user, params }: Parameters<AccessPolicyResolver<Record<string, unknown>, ExampleSaasUser>>[0]) => {
    const roles = getParamRoles(params);
    return roles.length > 0 ? roles.some((role) => hasRole(user, role)) : false;
  },
} satisfies Record<string, ExampleSaasAccessPolicy>;

export const exampleSaasAccessPolicies: Record<string, ExampleSaasAccessPolicy> = _policies;

/** Union of every policy name defined for this app. */
export type PolicyName = keyof typeof _policies;

/**
 * Typed helper for referencing a named access policy in a collection.
 * Provides autocomplete and catches typos at compile time.
 *
 * @example
 * import { policy } from "../access-policies.js";
 *
 * access: {
 *   update: policy("canManageContent"),
 *   delete: policy("isAdmin"),
 * }
 */
export function policy(name: PolicyName): NamedAccessPolicy;
export function policy(name: PolicyName, params: Record<string, unknown>): NamedAccessPolicy;
export function policy(name: PolicyName, params?: Record<string, unknown>): NamedAccessPolicy {
  return params !== undefined ? { policy: name, params } : { policy: name };
}

