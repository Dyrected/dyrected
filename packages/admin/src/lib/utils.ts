import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const customTwMerge = extendTailwindMerge({
  prefix: "dy-",
});

/**
 * Merges Tailwind class names, resolving conflicts with the `dy-` prefix.
 * Drop-in replacement for `clsx` that handles Dyrected's scoped Tailwind build.
 */
export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
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

  // 2. Resolve object or string
  let targetUrl = "";
  if (typeof val === "object" && val !== null) {
    targetUrl = val.url || val.filename || "";
  } else {
    targetUrl = String(val);
  }

  if (!targetUrl) {
    return "";
  }

  if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://") || targetUrl.startsWith("/")) {
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
