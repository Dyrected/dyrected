import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { DyrectedContext } from "../app.js";

/**
 * Extracts the list of allowed site IDs for a given authenticated user or token payload.
 * Checks common tenant membership properties: `allowedSites`, `siteIds`, `siteAccess`, and singular `siteId`.
 */
export function getAllowedSitesForUser(
  user?: Record<string, unknown> | null,
  payload?: Record<string, unknown> | null,
): string[] | undefined {
  const raw =
    user?.allowedSites ??
    user?.siteIds ??
    user?.siteAccess ??
    (user?.siteId ? [user.siteId] : undefined) ??
    payload?.allowedSites ??
    payload?.siteIds ??
    payload?.siteAccess ??
    (payload?.siteId ? [payload.siteId] : undefined);

  if (Array.isArray(raw)) {
    return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  }
  return undefined;
}

/**
 * Checks whether an authenticated user is permitted to access a given site ID.
 * If the user has no tenant restrictions configured, access is unrestricted (returns true).
 */
export function isSiteAuthorized(
  user: Record<string, unknown> | null | undefined,
  payload: Record<string, unknown> | null | undefined,
  requestedSiteId: string | undefined,
): boolean {
  const allowedSites = getAllowedSitesForUser(user, payload);
  if (!allowedSites || allowedSites.length === 0) {
    // Unrestricted / platform admin
    return true;
  }
  if (!requestedSiteId) {
    return false;
  }
  return allowedSites.includes(requestedSiteId);
}

/**
 * Resolves the authorized site ID for the current request.
 * Prioritizes `c.get("siteId")` (set upstream) and `X-Site-Id` header.
 * Enforces that restricted users cannot spoof or access unauthorized site IDs.
 *
 * @throws HTTPException(403) if the user is not authorized for the requested site.
 */
export function resolveAuthorizedSiteId(c: Context<DyrectedContext>): string {
  const user = typeof c.get === "function" ? (c.get("user") as Record<string, unknown> | undefined) : undefined;
  const tokenPayload = typeof c.get === "function" ? (c.get("authTokenPayload") as Record<string, unknown> | undefined) : undefined;
  const requestedSiteId =
    (typeof c.req?.header === "function" ? c.req.header("X-Site-Id") : undefined) ||
    (typeof c.get === "function" ? c.get("siteId") : undefined);

  const allowedSites = getAllowedSitesForUser(user, tokenPayload);
  if (Array.isArray(allowedSites) && allowedSites.length > 0) {
    if (!requestedSiteId) {
      // Default to user's primary/first allowed site
      return allowedSites[0];
    }
    if (!allowedSites.includes(requestedSiteId)) {
      throw new HTTPException(403, {
        message: `Forbidden: User is not authorized to access site "${requestedSiteId}".`,
      });
    }
    return requestedSiteId;
  }

  return requestedSiteId || "default";
}
