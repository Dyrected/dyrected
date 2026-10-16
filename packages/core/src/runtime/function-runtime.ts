/**
 * The function runtime seam.
 *
 * Every user-authored function Dyrected calls (hooks, access rules, action handlers, tasks, computed
 * values) goes through `FunctionRuntime.invoke`. Self-hosted apps use the in-process default, which just
 * calls the function. A hosting platform can supply another runtime (for example one that runs the
 * function inside an isolate) without forking the dispatcher, so ordering, error mapping and access
 * semantics stay identical everywhere.
 */

/**
 * A serialisable pointer to a config function. A bundler replaces each function in a config with one of
 * these, and ships the functions separately as a map of `id -> function`.
 *
 * @example
 * { $fn: "collections.orders.hooks.beforeChange.0" }
 */
export interface FunctionRef {
  $fn: string;
}

export function isFunctionRef(value: unknown): value is FunctionRef {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { $fn?: unknown }).$fn === "string" &&
    Object.keys(value as object).length === 1
  );
}

/** Where in the framework a function is being called from. Runtimes use it to pick budgets and label logs. */
export type FunctionSurface =
  | "collection.beforeRead"
  | "collection.afterRead"
  | "collection.beforeChange"
  | "collection.afterChange"
  | "collection.beforeDelete"
  | "collection.afterDelete"
  | "collection.beforeTrash"
  | "collection.afterTrash"
  | "collection.beforeRestore"
  | "collection.afterRestore"
  | "global.beforeRead"
  | "global.afterRead"
  | "global.beforeChange"
  | "global.afterChange"
  | "field.beforeChange"
  | "field.afterRead"
  | "access"
  | "access.policy"
  | "action"
  | "task"
  | "computed"
  | "resolver";

export interface InvocationContext {
  surface: FunctionSurface;
  /**
   * Dotted path of the function in the config, when known (for example `collections.orders.hooks.beforeChange`).
   * Used for logs and error messages; it is not an identity, since the same path can hold several functions.
   */
  path?: string;
  collection?: string;
  global?: string;
  operation?: "create" | "update" | "delete" | "read" | "restore" | "trash";
}

export interface FunctionRuntime {
  /**
   * Calls a config function.
   *
   * @param fn - The function itself, or a `FunctionRef` that this runtime knows how to resolve.
   * @param args - Positional arguments, exactly as the framework would pass them in-process.
   * @param ctx - Where the call comes from.
   * @returns Whatever the function returned (awaited).
   * @throws The function's own error, unchanged, so error mapping matches in-process behaviour. Runtimes
   * that enforce budgets throw {@link FunctionTimeoutError} or {@link FunctionLimitError}.
   */
  invoke<T = unknown>(fn: FunctionRef | ((...args: any[]) => unknown), args: unknown[], ctx: InvocationContext): Promise<T>;
}

/** A function exceeded its CPU or wall-clock budget. Maps to HTTP 504 with a code clients can match on. */
export class FunctionTimeoutError extends Error {
  readonly code = "FUNCTION_TIMEOUT";
  readonly statusCode = 504;
  constructor(
    readonly functionPath: string,
    readonly budget: "cpu" | "wall",
    readonly limitMs: number,
  ) {
    super(`Function "${functionPath}" exceeded its ${budget} time limit of ${limitMs}ms.`);
    this.name = "FunctionTimeoutError";
  }
}

/** A function exceeded a non-time limit (memory, output size, egress). Maps to HTTP 500. */
export class FunctionLimitError extends Error {
  readonly code = "FUNCTION_LIMIT_EXCEEDED";
  readonly statusCode = 500;
  constructor(
    readonly functionPath: string,
    readonly limit: "memory" | "output" | "egress",
  ) {
    super(`Function "${functionPath}" exceeded its ${limit} limit.`);
    this.name = "FunctionLimitError";
  }
}

/** A `FunctionRef` could not be resolved to a function (missing from the bundle, or no registry given). */
export class UnresolvedFunctionRefError extends Error {
  readonly code = "FUNCTION_UNRESOLVED";
  constructor(readonly ref: string) {
    super(`Function reference "${ref}" could not be resolved. Was it included in the deployed bundle?`);
    this.name = "UnresolvedFunctionRefError";
  }
}

export interface InProcessRuntimeOptions {
  /** Resolves `FunctionRef`s to functions. Without one, refs are rejected. */
  registry?: ReadonlyMap<string, (...args: any[]) => unknown> | Record<string, (...args: any[]) => unknown>;
}

/** Calls functions directly in the current process. This is the default and adds no overhead. */
export function createInProcessRuntime(options: InProcessRuntimeOptions = {}): FunctionRuntime {
  const lookup = (id: string) =>
    options.registry instanceof Map ? options.registry.get(id) : (options.registry as Record<string, any> | undefined)?.[id];

  return {
    async invoke<T>(fn: FunctionRef | ((...args: any[]) => unknown), args: unknown[]) {
      const resolved = typeof fn === "function" ? fn : lookup(fn.$fn);
      if (typeof resolved !== "function") {
        throw new UnresolvedFunctionRefError(isFunctionRef(fn) ? fn.$fn : String(fn));
      }
      return (await resolved(...args)) as T;
    },
  };
}

export const defaultFunctionRuntime: FunctionRuntime = createInProcessRuntime();

/** The runtime configured for an app, or the in-process default. */
export function getFunctionRuntime(config: { functionRuntime?: FunctionRuntime } | undefined | null): FunctionRuntime {
  return config?.functionRuntime ?? defaultFunctionRuntime;
}
