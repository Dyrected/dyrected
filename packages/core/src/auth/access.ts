import type { AuthenticatedUser, DyrectedConfig } from "../types/index.js";
import type { AccessFunctionArgs, AccessPolicyResolver, AccessResult, AccessRule, NamedAccessPolicy } from "../types/access.js";
import { evaluateAccess } from "./jexl.js";
import { getFunctionRuntime, isFunctionRef } from "../runtime/function-runtime.js";

function isNamedAccessPolicy(value: unknown): value is NamedAccessPolicy {
  return !!value && typeof value === "object" && "policy" in value && typeof (value as { policy?: unknown }).policy === "string";
}

export async function resolveAccess<
  TDoc extends object = Record<string, unknown>,
  TUser extends AuthenticatedUser = AuthenticatedUser,
>(
  config: DyrectedConfig<TUser>,
  access: AccessRule<TDoc, TUser> | undefined | null,
  args: AccessFunctionArgs<TDoc, TUser>,
): Promise<AccessResult | undefined> {
  if (access === undefined || access === null) return undefined;

  if (typeof access === "boolean" || typeof access === "string") {
    return evaluateAccess(access, { ...args, config });
  }

  if (typeof access === "function" || isFunctionRef(access)) {
    try {
      return await getFunctionRuntime(config).invoke<AccessResult | undefined>(access as any, [args], { surface: "access" });
    } catch (err) {
      console.error("[dyrected:access] Functional access check failed:", err);
      return false;
    }
  }

  if (isNamedAccessPolicy(access)) {
    const policy = config.accessPolicies?.[access.policy];
    if (policy === undefined) {
      console.error(`[dyrected:access] Unknown access policy "${access.policy}"`);
      return false;
    }

    // A policy defined as a Jexl string or boolean is evaluated the same way as
    // an inline rule of that shape.
    if (typeof policy === "string" || typeof policy === "boolean") {
      return evaluateAccess(policy, { ...args, config });
    }

    try {
      const resolver = policy as AccessPolicyResolver<TDoc, TUser>;
      return await getFunctionRuntime(config).invoke<AccessResult | undefined>(
        resolver as any,
        [{ ...args, params: access.params }],
        { surface: "access.policy", path: `accessPolicies.${access.policy}` },
      );
    } catch (err) {
      console.error(`[dyrected:access] Access policy "${access.policy}" failed:`, err);
      return false;
    }
  }

  return false;
}

export async function isAccessAllowed<
  TDoc extends object = Record<string, unknown>,
  TUser extends AuthenticatedUser = AuthenticatedUser,
>(
  config: DyrectedConfig<TUser>,
  access: AccessRule<TDoc, TUser> | undefined | null,
  args: AccessFunctionArgs<TDoc, TUser>,
): Promise<boolean> {
  const result = await resolveAccess(config, access, args);
  if (result === undefined) return true;
  return typeof result === "boolean" ? result : !!result;
}
