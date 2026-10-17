import { loadCommandEnv } from "./env.js";

/** Where and as whom a command talks to Dyrected Cloud. Shared by `sync:schema`, `deploy` and `secrets`. */
export interface CloudTarget {
  apiKey: string;
  siteId: string;
  apiUrl: string;
}

export interface CloudTargetOptions {
  apiKey?: string;
  siteId?: string;
  url?: string;
  envPath?: string;
}

export async function resolveCloudTarget(options: CloudTargetOptions, cwd = process.cwd()): Promise<CloudTarget> {
  await loadCommandEnv({ cwd, envPath: options.envPath });

  const apiKey = options.apiKey || process.env.DYRECTED_API_KEY;
  const siteId = options.siteId || process.env.DYRECTED_SITE_ID;
  if (!apiKey || !siteId) {
    throw new Error("Set DYRECTED_API_KEY and DYRECTED_SITE_ID (or pass --api-key and --site-id) to talk to Dyrected Cloud.");
  }

  const apiUrl = (
    options.url ||
    process.env.DYRECTED_URL ||
    process.env.NEXT_PUBLIC_DYRECTED_URL ||
    process.env.NUXT_PUBLIC_DYRECTED_URL ||
    process.env.VITE_DYRECTED_URL ||
    "https://cloud.dyrected.com"
  ).replace(/\/$/, "");

  return { apiKey, siteId, apiUrl };
}

export class CloudRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: any,
  ) {
    super(message);
    this.name = "CloudRequestError";
  }
}

export async function cloudRequest<T = any>(
  target: CloudTarget,
  path: string,
  init: { method?: string; body?: unknown } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const response = await fetchImpl(`${target.apiUrl}/cloud/workspaces/sites/${target.siteId}${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", "X-API-Key": target.apiKey },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new CloudRequestError(body?.message || response.statusText || `Request failed (${response.status})`, response.status, body);
  }
  return body as T;
}
