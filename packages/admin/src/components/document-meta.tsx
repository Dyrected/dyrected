import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useDyrected } from "../providers/dyrected-context";
import type { CollectionConfig, GlobalConfig } from "@dyrected/core";

/** Turn a slug like `blog-posts` into a readable `Blog Posts` fallback. */
function humanize(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Derive a human page label from the current admin path, e.g. "Posts",
 * "New Post", "Edit Post", or "Dashboard". Uses the collection/global labels
 * from the loaded schemas, falling back to a humanized slug.
 */
function pageLabel(
  pathname: string,
  collections: CollectionConfig[],
  globals: GlobalConfig[],
): string {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return "Dashboard";
  if (segments[0] === "setup") return "Setup";

  if (segments[0] === "collections" && segments[1]) {
    const slug = segments[1];
    const collection = collections.find((c) => c.slug === slug);
    const singular = collection?.labels?.singular ?? humanize(slug);
    const plural = collection?.labels?.plural ?? humanize(slug);

    if (segments[2] === "new") return `New ${singular}`;
    if (segments[2] === "edit") return `Edit ${singular}`;
    return plural;
  }

  if (segments[0] === "globals" && segments[1]) {
    const slug = segments[1];
    const global = globals.find((g) => g.slug === slug);
    return global?.label ?? humanize(slug);
  }

  return "";
}

/**
 * Keeps the browser tab in sync with the admin: sets `document.title` from the
 * current page plus `admin.meta.titleSuffix`, updating on every route change,
 * and applies `admin.branding.favicon` to the page favicon.
 *
 * Renders nothing. Must be mounted inside the router (needs `useLocation`) and
 * inside `DyrectedProvider` (needs the loaded schemas).
 */
export function DocumentMeta() {
  const location = useLocation();
  const { schemas } = useDyrected();

  const admin = schemas?.admin;
  const titleSuffix = admin?.meta?.titleSuffix ?? "- Dyrected";
  const favicon = admin?.branding?.favicon;

  // Restore the host page's original title when the admin unmounts, so an
  // embedded admin doesn't leave its last page title on the surrounding app.
  const originalTitleRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }
    return () => {
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const label = pageLabel(
      location.pathname,
      schemas?.collections ?? [],
      schemas?.globals ?? [],
    );
    const next = [label, titleSuffix].filter(Boolean).join(" ");
    if (next && document.title !== next) {
      document.title = next;
    }
  }, [location.pathname, schemas, titleSuffix]);

  useEffect(() => {
    if (typeof document === "undefined" || !favicon) return;

    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const created = !link;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    const previousHref = link.getAttribute("href");
    link.setAttribute("href", favicon);

    // Restore the host page's original favicon if the admin unmounts, so an
    // embedded admin doesn't leave its icon behind on the surrounding app.
    return () => {
      if (created) {
        link?.remove();
      } else if (previousHref !== null) {
        link?.setAttribute("href", previousHref);
      }
    };
  }, [favicon]);

  return null;
}
