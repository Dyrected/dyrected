import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only understands Tailwind v4-style prefixed utilities
 * ("dy:h-8"), while the Dyrected build emits dash-prefixed classes ("dy-h-8").
 * Class strings are therefore normalized into colon syntax before conflict
 * resolution and restored afterwards, so overrides passed via `cn` reliably
 * win over component base classes.
 */
const PREFIX = "dy";

const twMerge = extendTailwindMerge({ prefix: PREFIX });

function toColonSyntax(className: string): string {
  // Token boundaries: string start, whitespace, or a variant separator ("hover:dy-flex").
  return className.replace(/(^|\s|:)dy-/g, "$1dy:");
}

function toDashSyntax(className: string): string {
  return className.replace(/(^|\s|:)dy:/g, "$1dy-");
}

/**
 * Merges Tailwind class names, resolving conflicts between the design
 * system's dash-prefixed utilities. Drop-in replacement for `clsx` — later
 * arguments win over earlier conflicting classes.
 */
export function cn(...inputs: ClassValue[]) {
  const raw = clsx(inputs);
  if (!raw.includes(`${PREFIX}-`)) return raw;
  return toDashSyntax(twMerge(toColonSyntax(raw)));
}

/**
 * Resolves a media field value to an absolute URL.
 *
 * Handles three input shapes:
 * - A fully-qualified URL (`https://...`) — returned as-is.
 * - A root-relative path (`/uploads/...`) — origin prepended from `baseUrl`.
 * - A bare filename or storage path (`default/photo.jpg`) — prefixed with `/api/media/`.
 *
 * Bare strings that look like document IDs (no extension, no slash) are returned
 * as an empty string so they are not treated as media assets.
 *
 * @param val - A media field value: a URL string, storage path, or a document object with a `url` or `filename` property.
 * @param baseUrl - The Dyrected backend base URL, used to build the origin for relative paths.
 * @returns A fully-qualified URL string, or `""` if the value cannot be resolved.
 */
export function getMediaUrl(val: string | any, baseUrl: string) {
  if (!val) {
    return "";
  }

  // 1. Get the base origin (e.g., "http://localhost:5000" from "http://localhost:5000/api")
  let baseOrigin = "";
  if (baseUrl) {
    if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
      try {
        baseOrigin = new URL(baseUrl).origin;
      } catch {
        const match = baseUrl.match(/^(https?:\/\/[^\/]+)/);
        baseOrigin = match ? match[1] : baseUrl;
      }
    } else {
      baseOrigin = baseUrl;
    }
  }

  // Helper to ensure base and path are joined correctly
  const prependBase = (urlPath: string) => {
    if (urlPath.startsWith("http://") || urlPath.startsWith("https://")) {
      return urlPath;
    }
    const cleanPath = urlPath.startsWith("/") ? urlPath : "/" + urlPath;
    // For "/uploads/..." we use baseOrigin (which is the root host of the backend)
    if (cleanPath.startsWith("/uploads/")) {
      return `${baseOrigin.endsWith("/") ? baseOrigin.slice(0, -1) : baseOrigin}${cleanPath}`;
    }
    // For other paths, we can use baseUrl as the prefix
    const basePrefix = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    // If the path already has the basePrefix pathname (e.g., "/api/media/...") then we don't duplicate it.
    try {
      const baseObj = new URL(basePrefix);
      const basePathname = baseObj.pathname === "/" ? "" : baseObj.pathname;
      if (basePathname && cleanPath.startsWith(basePathname)) {
        return `${baseObj.origin}${cleanPath}`;
      }
    } catch {
      if (basePrefix && cleanPath.startsWith(basePrefix)) {
        return cleanPath;
      }
    }
    return `${basePrefix}${cleanPath}`;
  };

  // 2. Direct object URL resolution (never reconstruct if url is already provided)
  let targetUrl = "";
  if (typeof val === "object" && val !== null) {
    if (val.url && typeof val.url === "string" && val.url.trim().length > 0) {
      const directUrl = val.url.trim();
      // If it looks like a valid URL or path, just return it as is if it has a host, or if it starts with a known protocol/slash
      if (
        directUrl.startsWith("http://") ||
        directUrl.startsWith("https://") ||
        directUrl.startsWith("/") ||
        directUrl.startsWith("blob:") ||
        directUrl.startsWith("data:")
      ) {
        return directUrl;
      }
      // If the url contains a dot and a slash (like a domain), or doesn't look like an internal relative path, return it
      if (directUrl.includes("/") && directUrl.includes(".")) {
        return directUrl.startsWith("//") ? directUrl : `https://${directUrl}`;
      }
      return prependBase(directUrl);
    }
    targetUrl = val.filename || val.src || "";
  } else {
    targetUrl = String(val).trim();
  }

  if (!targetUrl) {
    return "";
  }

  if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://") || targetUrl.startsWith("/") || targetUrl.startsWith("blob:") || targetUrl.startsWith("data:")) {
    return targetUrl;
  }

  // Bare relationship ids are not media URLs. Only treat strings that look like
  // filenames or storage paths as media assets.
  if (!targetUrl.includes("/") && !/\.[a-z0-9]+($|\?)/i.test(targetUrl)) {
    return "";
  }

  // If it is a filename without a leading slash (like "default/Screenshot.jpg"), prepend "/media/"
  return prependBase(`/api/media/${targetUrl}`);
}

/**
 * Strips the directory prefix from a filename / storage path, returning only the last component (the actual filename).
 * E.g., "dyrected_cloud/j95sv/bcuul/WhatsApp Image 2026-06-20 at 12" -> "WhatsApp Image 2026-06-20 at 12"
 */
export function getDisplayFilename(filename?: string): string {
  if (!filename) return "";
  const parts = filename.split("/");
  return parts[parts.length - 1];
}

/**
 * Resolves the site URL, overriding it with the current origin during local development on localhost/127.0.0.1.
 */
export function getSiteUrl(configuredSiteUrl?: string): string {
  if (typeof window !== "undefined") {
    // Cloud Dashboard always serves site admin views under "/sites/[siteId]" paths.
    // In this context, we must always use the site's configured domain name.
    const isCloudDashboard = window.location.pathname.startsWith("/sites/");
    if (isCloudDashboard) {
      return configuredSiteUrl || "";
    }

    // In the consumer dashboard (running directly within the client app),
    // the current host URL (window.location.origin) is the correct site URL.
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal) {
      return window.location.origin;
    }
  }
  return configuredSiteUrl || (typeof window !== "undefined" ? window.location.origin : "");
}

/**
 * Determines whether a collection or global schema has Detail View enabled.
 *
 * Detail views are opt-in (`false` by default). They are enabled when:
 * - `detail: true` (automatic summary layout)
 * - `detail: [...]` (custom array of display items)
 * - `detail: { ... }` (custom detail layout object)
 */
export function hasDetailView(schema: any): boolean {
  if (!schema || schema.detail === false || schema.detail === undefined || schema.detail === null) {
    return false;
  }
  if (schema.detail === true) {
    return true;
  }
  if (Array.isArray(schema.detail)) {
    return schema.detail.length > 0;
  }
  return typeof schema.detail === "object";
}

