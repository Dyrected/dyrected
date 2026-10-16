import type { Context } from "hono";
import type { DyrectedContext } from "../app.js";
import { getFunctionRuntime, type FunctionSurface } from "../runtime/function-runtime.js";
import { executeFieldAfterRead, executeFieldBeforeChange, runCollectionHooks } from "../utils/hooks.js";

/**
 * Controller-facing hook helpers. They are the hook functions from `utils/hooks`, bound to the runtime
 * configured on the app (`config.functionRuntime`), so every controller call site runs user functions
 * through the same seam without threading the runtime by hand.
 */

type HookArgs = Parameters<typeof runCollectionHooks>;

/** The hooks of one lifecycle point on a collection or global, with enough identity to label each call. */
export interface HookSet {
  hooks: HookArgs[0];
  kind: "collection" | "global";
  slug: string;
  name: string;
}

export function hookSet(
  kind: HookSet["kind"],
  owner: { slug: string; hooks?: object },
  name: string,
): HookSet {
  return { hooks: (owner.hooks as Record<string, HookArgs[0]> | undefined)?.[name], kind, slug: owner.slug, name };
}

export function runHooks(c: Context<DyrectedContext>, set: HookSet, args: HookArgs[1], options: HookArgs[2] = {}) {
  return runCollectionHooks(set.hooks, args, {
    ...options,
    runtime: options.runtime ?? getFunctionRuntime(c.get("config")),
    invocationSurface: `${set.kind}.${set.name}` as FunctionSurface,
    path: options.path ?? `${set.kind}:${set.slug}.hooks.${set.name}`,
    ...(set.kind === "collection" ? { collection: set.slug } : { global: set.slug }),
  });
}

export function runFieldBeforeChange(
  c: Context<DyrectedContext>,
  ...[fields, data, originalDoc, user, db, pathPrefix]: Parameters<typeof executeFieldBeforeChange>
) {
  return executeFieldBeforeChange(fields, data, originalDoc, user, db, pathPrefix, getFunctionRuntime(c.get("config")));
}

export function runFieldAfterRead(
  c: Context<DyrectedContext>,
  ...[fields, doc, user, db]: Parameters<typeof executeFieldAfterRead>
) {
  return executeFieldAfterRead(fields, doc, user, db, getFunctionRuntime(c.get("config")));
}
