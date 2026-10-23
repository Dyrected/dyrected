import { useEffect, useRef, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { useDyrected } from "../providers/dyrected-context";
import { resolveTitleSuffix } from "@dyrected/core";
import type {
  AdminConfig,
  CollectionConfig,
  CompiledNavItem,
  CompiledNavTree,
  GlobalConfig,
} from "@dyrected/core";

// ─── Page title published by a page ───────────────────────────────────────────
//
// DocumentMeta is the only writer of `document.title`. A page whose title is
// only known at runtime (a custom page that sets its own meta) publishes it
// here instead of assigning `document.title` itself.

interface PublishedTitle {
  pathname: string;
  title: string;
}

let publishedTitle: PublishedTitle | null = null;
const titleListeners = new Set<() => void>();

function setPublishedTitle(next: PublishedTitle | null) {
  if (publishedTitle?.pathname === next?.pathname && publishedTitle?.title === next?.title) return;
  publishedTitle = next;
  titleListeners.forEach((listener) => listener());
}

function subscribeToTitle(listener: () => void) {
  titleListeners.add(listener);
  return () => {
    titleListeners.delete(listener);
  };
}

/**
 * Publish the title of the page currently on screen, e.g. the label a custom page
 * resolves at runtime. {@link DocumentMeta} combines it with the title suffix and
 * writes it to the tab. The title only applies while the route stays the same, and is
 * withdrawn when the calling component unmounts.
 */
export function usePublishDocumentTitle(title: string | undefined) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!title) return;
    setPublishedTitle({ pathname, title });
    return () => {
      if (publishedTitle?.pathname === pathname && publishedTitle.title === title) {
        setPublishedTitle(null);
      }
    };
  }, [pathname, title]);
}

/** Turn a slug like `blog-posts` into a readable `Blog Posts` fallback. */
export function humanize(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Flatten all navigation groups, ungrouped items, and pinned items into a single list. */
export function getAllNavItems(navigation: CompiledNavTree | null | undefined): CompiledNavItem[] {
  if (!navigation) return [];
  const items: CompiledNavItem[] = [];
  if (navigation.groups) {
    for (const group of navigation.groups) {
      if (group.items) {
        items.push(...group.items);
      }
    }
  }
  if (navigation.ungrouped) {
    items.push(...navigation.ungrouped);
  }
  const pinned = (navigation as any).pinnedItems;
  if (Array.isArray(pinned)) {
    items.push(...pinned);
  }
  return items;
}

/**
 * Derive a human page label from the current admin path, e.g. "Posts",
 * "Pending · Orders", "New Post", "Edit Post", "Custom Page", or "Dashboard".
 * Uses schemas and compiled navigation items, falling back to humanized slugs.
 */
export function pageLabel(
  pathname: string,
  collections: CollectionConfig[] = [],
  globals: GlobalConfig[] = [],
  navigation?: CompiledNavTree | null,
  admin?: AdminConfig | null,
): string {
  const segments = pathname.split("/").filter(Boolean);
  const allNavItems = getAllNavItems(navigation);

  if (segments.length === 0) {
    if (admin?.homePage) {
      const homeSlug = admin.homePage.replace(/^\/pages\//, "").replace(/^\//, "");
      const homeItem = allNavItems.find(
        (i) => i.type === "page" && (i.slug === homeSlug || i.id === `page:${homeSlug}` || i.id === homeSlug)
      );
      if (homeItem) {
        return homeItem.page?.label || homeItem.label || humanize(homeSlug);
      }
    }
    return "Dashboard";
  }

  if (segments[0] === "setup") return "Setup";
  if (segments[0] === "trash") return "Trash";

  // Custom pages under reserved /pages prefix
  if (segments[0] === "pages" && segments[1]) {
    const slug = segments[1];
    const pageItem = allNavItems.find(
      (item) => item.type === "page" && (item.slug === slug || item.id === `page:${slug}` || item.id === slug)
    );
    const pageTitle = pageItem?.page?.label || pageItem?.label || humanize(slug);
    if (segments.length > 2) {
      const sub = segments.slice(2).map(humanize).join(" · ");
      return `${sub} · ${pageTitle}`;
    }
    return pageTitle;
  }

  // Built-in collections route: /collections/:slug/...
  if (segments[0] === "collections" && segments[1]) {
    const slug = segments[1];
    const collection = collections.find((c) => c.slug === slug);
    const singular = collection?.labels?.singular ?? humanize(slug);
    const plural = collection?.labels?.plural ?? humanize(slug);

    if (segments[2] === "trash") {
      return `Trash · ${plural}`;
    }

    if (segments[2] === "views" && segments[3]) {
      const viewSlug = segments[3];
      let view = (collection as any)?.views?.find((v: any) => v.slug === viewSlug);
      if (!view) {
        for (const item of allNavItems) {
          if (item.collection === slug && item.views) {
            const match = item.views.find((v: any) => v.slug === viewSlug);
            if (match) {
              view = match;
              break;
            }
          }
        }
      }
      const viewLabel = view?.label ?? humanize(viewSlug);
      return `${viewLabel} · ${plural}`;
    }

    if (segments[2] === "new") return `New ${singular}`;
    if (segments[2] === "edit" || segments[3] === "edit") return `Edit ${singular}`;
    if (segments[2]) return `${singular} Details`;
    return plural;
  }

  // Built-in globals route: /globals/:slug/...
  if (segments[0] === "globals" && segments[1]) {
    const slug = segments[1];
    const global = globals.find((g) => g.slug === slug);
    const label = global?.label ?? humanize(slug);
    if (segments[2] === "edit") return `Edit ${label}`;
    return label;
  }

  // Operational workspace routes: /:workspaceSlug/:viewSlug or /:workspaceSlug
  const workspaceSlug = segments[0];
  const workspaceItem = allNavItems.find(
    (item) => item.slug === workspaceSlug || item.id === workspaceSlug
  );

  const workspaceLabel = workspaceItem?.label ?? humanize(workspaceSlug);

  if (segments[1]) {
    const viewSlug = segments[1];
    const view = workspaceItem?.views?.find((v: any) => v.slug === viewSlug);
    const viewLabel = view?.label ?? humanize(viewSlug);
    return `${viewLabel} · ${workspaceLabel}`;
  }

  return workspaceLabel;
}

/**
 * Keeps the browser tab in sync with the admin: sets `document.title` from the
 * current page plus the title suffix (`admin.meta.titleSuffix`, or `- <app name>`),
 * updating on every route change, and applies `admin.branding.favicon` to the
 * page favicon. It is the only writer of `document.title`; it also covers the
 * sign-in screens, and waits for the schemas so the app name never flashes.
 *
 * Renders nothing. Must be mounted inside the router (needs `useLocation`) and
 * inside `DyrectedProvider` (needs the loaded schemas).
 */
export function DocumentMeta() {
  const location = useLocation();
  const { schemas, navigation, isAuthenticated, isResolvingStoredSession } = useDyrected();
  const published = useSyncExternalStore(
    subscribeToTitle,
    () => publishedTitle,
    () => null,
  );

  const admin = schemas?.admin;
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
    // Until the schemas arrive the app name is unknown, so leave the title alone
    // rather than flash a suffix that is about to change.
    if (typeof document === "undefined" || !schemas || isResolvingStoredSession) return;
    const label = !isAuthenticated
      ? "Sign in"
      : published && published.pathname === location.pathname
        ? published.title
        : pageLabel(location.pathname, schemas.collections ?? [], schemas.globals ?? [], navigation, admin);
    const next = [label, resolveTitleSuffix(admin)].filter(Boolean).join(" ");
    if (next && document.title !== next) {
      document.title = next;
    }
  }, [location.pathname, schemas, navigation, admin, isAuthenticated, isResolvingStoredSession, published]);

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
