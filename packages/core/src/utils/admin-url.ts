import type { Context } from "hono";

/** Path the admin UI is assumed to be mounted at when nothing else is configured. */
export const DEFAULT_ADMIN_PATH = "/admin";

/**
 * Resolves the URL of the admin UI used as the base for emailed links
 * (invites, password resets).
 *
 * Precedence: `config.admin.adminUrl` → `DYRECTED_ADMIN_URL` env var →
 * the base URL the client sent (the page the admin is running on) → `/admin`.
 * Relative values are resolved against the incoming request's origin.
 */
export function resolveAdminUrl(
  c: Context,
  config: { admin?: { adminUrl?: string } },
  clientUrl?: unknown,
): string {
  const configured =
    config.admin?.adminUrl?.trim() ||
    process.env.DYRECTED_ADMIN_URL?.trim() ||
    (typeof clientUrl === "string" ? clientUrl.trim() : "") ||
    DEFAULT_ADMIN_PATH;

  try {
    return new URL(configured, c.req.url).toString();
  } catch {
    return configured;
  }
}

/** Appends a query param to a URL that may already carry a query string. */
export function appendQueryParam(url: string, key: string, value: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

/**
 * Resolves an action URL (invite, password reset) prioritizing explicit client/collection URLs
 * over the default Dyrected admin panel URL.
 */
export function resolveActionUrl(
  c: Context,
  config: { admin?: { adminUrl?: string } },
  customUrl?: string,
): string {
  if (customUrl && typeof customUrl === "string" && customUrl.trim().length > 0) {
    try {
      return new URL(customUrl.trim(), c.req.url).toString();
    } catch {
      return customUrl.trim();
    }
  }
  return resolveAdminUrl(c, config);
}
