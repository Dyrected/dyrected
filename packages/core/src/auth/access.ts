import type { DyrectedConfig } from "../types/index.js";
import type { AccessFunctionArgs, AccessResult, AccessRule, NamedAccessPolicy } from "../types/access.js";
import { evaluateAccess } from "./jexl.js";

function isNamedAccessPolicy(value: unknown): value is NamedAccessPolicy {
  return !!value && typeof value === "object" && "policy" in value && typeof (value as { policy?: unknown }).policy === "string";
}

export async function resolveAccess<TDoc extends object = Record<string, unknown>>(
  config: DyrectedConfig,
  access: AccessRule<TDoc> | undefined | null,
  args: AccessFunctionArgs<TDoc>,
): Promise<AccessResult | undefined> {
  if (access === undefined || access === null) return undefined;

  if (typeof access === "boolean" || typeof access === "string") {
    return evaluateAccess(access, args);
  }

  if (typeof access === "function") {
    try {
      return await access(args);
    } catch (err) {
      console.error("[dyrected/core] Functional access check failed:", err);
      return false;
    }
  }

  if (isNamedAccessPolicy(access)) {
    const resolver = config.accessPolicies?.[access.policy];
    if (!resolver) {
      console.error(`[dyrected/core] Unknown access policy "${access.policy}".`);
      return false;
    }

    try {
      return await resolver({ ...args, params: access.params });
    } catch (err) {
      console.error(`[dyrected/core] Access policy "${access.policy}" failed:`, err);
      return false;
    }
  }

  return false;
}

export async function isAccessAllowed<TDoc extends object = Record<string, unknown>>(
  config: DyrectedConfig,
  access: AccessRule<TDoc> | undefined | null,
  args: AccessFunctionArgs<TDoc>,
): Promise<boolean> {
  const result = await resolveAccess(config, access, args);
  if (result === undefined) return true;
  return typeof result === "boolean" ? result : !!result;
}
