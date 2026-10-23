import type { AdminComponents } from "../types/admin-components";

/**
 * Loading a components bundle from a URL (`componentsUrl`).
 *
 * A host that cannot import your components at build time, such as the Cloud-hosted admin, loads them at run
 * time instead: it downloads one ES module, checks it against an integrity hash, and merges the registry it
 * exports with any components passed in directly.
 *
 * The bundle must use this admin's copy of React, not its own, or hooks break. Bundles built with
 * `dyrected bundle` import React and the admin's public API from `globalThis.__DYRECTED_SHARED__`, which
 * `installSharedModules` fills in before the module runs.
 */

export const SHARED_MODULES_GLOBAL = "__DYRECTED_SHARED__";

export type RemoteComponentsErrorCode = "FETCH_FAILED" | "INTEGRITY_FAILED" | "INVALID_INTEGRITY" | "INVALID_MODULE" | "INSECURE_URL";

export class RemoteComponentsError extends Error {
  readonly code: RemoteComponentsErrorCode;

  constructor(message: string, code: RemoteComponentsErrorCode) {
    super(message);
    this.name = "RemoteComponentsError";
    this.code = code;
  }
}

const ALGORITHMS = { sha256: "SHA-256", sha384: "SHA-384", sha512: "SHA-512" } as const;

/**
 * Checks bytes against a Subresource Integrity string (`sha384-<base64>`). Several space-separated hashes are
 * allowed, and any one matching is enough, as in the browser's own rule. Only the strongest algorithm present
 * is considered, so a weak hash cannot be offered to downgrade the check.
 */
export async function verifyIntegrity(bytes: ArrayBuffer, integrity: string): Promise<boolean> {
  const entries = integrity
    .trim()
    .split(/\s+/)
    .map((token) => {
      const [algorithm, ...rest] = token.split("-");
      return { algorithm: algorithm as keyof typeof ALGORITHMS, digest: rest.join("-").split("?")[0] };
    })
    .filter((entry) => entry.algorithm in ALGORITHMS && entry.digest);

  if (entries.length === 0) {
    throw new RemoteComponentsError(`Unsupported integrity value "${integrity}". Use sha256-, sha384- or sha512-.`, "INVALID_INTEGRITY");
  }

  const strongest = (["sha512", "sha384", "sha256"] as const).find((algorithm) => entries.some((entry) => entry.algorithm === algorithm))!;
  const hash = new Uint8Array(await crypto.subtle.digest(ALGORITHMS[strongest], bytes));
  const actual = btoa(String.fromCharCode(...hash));

  return entries.filter((entry) => entry.algorithm === strongest).some((entry) => constantTimeEqual(entry.digest, actual));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface LoadRemoteComponentsOptions {
  url: string;
  /** SRI string for the bundle. Strongly recommended: without it you trust whatever the URL serves. */
  integrity?: string;
  /** Modules the bundle imports from the host instead of bundling (React and the admin's public API). */
  shared: Record<string, unknown>;
  signal?: AbortSignal;
  /** Test seams. */
  fetchImpl?: typeof fetch;
  importModule?: (objectUrl: string) => Promise<unknown>;
  /** Allow http: URLs (local development). */
  allowInsecure?: boolean;
}

/**
 * Downloads, verifies and evaluates a components bundle, returning the registry it exports (the default export,
 * or a named `components` export).
 *
 * The bytes that were verified are the bytes that run: the module is imported from a Blob made from them, never
 * re-fetched from the URL, so a server cannot serve one thing to the check and another to the import.
 */
export async function loadRemoteComponents(options: LoadRemoteComponentsOptions): Promise<AdminComponents> {
  const { url, integrity, shared, signal } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const importModule = options.importModule ?? ((objectUrl: string) => import(/* @vite-ignore */ objectUrl));

  const parsed = new URL(url, typeof location === "undefined" ? undefined : location.href);
  if (parsed.protocol !== "https:" && !(options.allowInsecure && parsed.protocol === "http:")) {
    throw new RemoteComponentsError("Components must be loaded over https.", "INSECURE_URL");
  }

  let response: Response;
  try {
    response = await fetchImpl(parsed.toString(), { signal, credentials: "omit", cache: "force-cache" });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new RemoteComponentsError(`Could not download components: ${(error as Error)?.message ?? error}`, "FETCH_FAILED");
  }
  if (!response.ok) {
    throw new RemoteComponentsError(`Could not download components (HTTP ${response.status}).`, "FETCH_FAILED");
  }

  const bytes = await response.arrayBuffer();
  if (integrity && !(await verifyIntegrity(bytes, integrity))) {
    throw new RemoteComponentsError("The components bundle does not match its integrity hash and was not loaded.", "INTEGRITY_FAILED");
  }

  installSharedModules(shared);
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: "text/javascript" }));
  try {
    const mod = (await importModule(objectUrl)) as { default?: unknown; components?: unknown };
    const registry = mod.default ?? mod.components;
    if (!registry || typeof registry !== "object") {
      throw new RemoteComponentsError("The components bundle must export its registry as the default export.", "INVALID_MODULE");
    }
    return registry as AdminComponents;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function installSharedModules(shared: Record<string, unknown>): void {
  const target = globalThis as unknown as Record<string, Record<string, unknown>>;
  target[SHARED_MODULES_GLOBAL] = { ...(target[SHARED_MODULES_GLOBAL] ?? {}), ...shared };
}

const REGISTRY_KEYS = ["fields", "dashboard", "collectionList", "collectionView", "forms", "viewLayouts", "pages", "customComponents"] as const;

/**
 * Combines registries. `override` wins per key, so a component passed directly to the admin replaces a loaded one
 * with the same key, while keys only the bundle defines still apply.
 */
export function mergeComponents(base: AdminComponents | undefined, override: AdminComponents | undefined): AdminComponents | undefined {
  if (!base) return override;
  if (!override) return base;
  const merged: Record<string, unknown> = { ...base, ...override };
  for (const key of REGISTRY_KEYS) {
    if (base[key] || override[key]) merged[key] = { ...(base[key] as object), ...(override[key] as object) };
  }
  return merged as AdminComponents;
}
