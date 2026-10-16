import { isFunctionRef, type FunctionRef } from "./function-runtime.js";

/**
 * Splits a config into static data plus functions, and back.
 *
 * `extractFunctionRefs` replaces every function in a config with a `FunctionRef` (`{ $fn: "<path>" }`) and
 * returns the functions keyed by that path. The static half is JSON-serialisable, so it can be stored and
 * shipped; the functions travel separately (for example as a bundled module). `hydrateFunctionRefs` is the
 * inverse for runtimes that want the functions back in place.
 */
export interface ExtractedConfig<T> {
  /** The config with every function replaced by a `FunctionRef`. JSON-serialisable. */
  schema: T;
  /** Every extracted function, keyed by the path in its `FunctionRef`. */
  functions: Map<string, (...args: any[]) => unknown>;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export interface ExtractOptions {
  /**
   * Top-level config keys to leave out entirely. A hosting platform supplies its own database, storage and
   * mailer, so a bundler omits `db`, `storage` and similar keys instead of shipping them.
   */
  omit?: readonly string[];
}

export function extractFunctionRefs<T>(config: T, options: ExtractOptions = {}): ExtractedConfig<T> {
  const functions = new Map<string, (...args: any[]) => unknown>();
  const seen = new WeakSet<object>();

  const walk = (value: unknown, path: string): unknown => {
    if (typeof value === "function") {
      functions.set(path, value as (...args: any[]) => unknown);
      return { $fn: path } satisfies FunctionRef;
    }
    if (Array.isArray(value)) {
      return value.map((item, index) => walk(item, path ? `${path}.${index}` : String(index)));
    }
    if (isPlainObject(value)) {
      // Cycles can't be expressed in JSON; the second visit is dropped rather than looping forever.
      if (seen.has(value)) return undefined;
      seen.add(value);
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(value)) {
        if (path === "" && options.omit?.includes(key)) continue;
        const next = walk(child, path ? `${path}.${key}` : key);
        if (next !== undefined) out[key] = next;
      }
      return out;
    }
    // Class instances (database adapters, storage clients, services) are not config data. They stay out of
    // the schema; the platform provides its own.
    if (value && typeof value === "object") return undefined;
    return value;
  };

  return { schema: walk(config, "") as T, functions };
}

export function hydrateFunctionRefs<T>(
  schema: T,
  resolve: (id: string) => ((...args: any[]) => unknown) | undefined,
): T {
  const walk = (value: unknown): unknown => {
    if (isFunctionRef(value)) return resolve(value.$fn) ?? value;
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, walk(child)]));
    }
    return value;
  };
  return walk(schema) as T;
}
