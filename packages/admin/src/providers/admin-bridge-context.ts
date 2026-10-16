import { createContext, useContext } from "react";
import { toast } from "sonner";

export type AdminNavigateTarget =
  | string
  | {
      type: "collection";
      slug: string;
    }
  | {
      type: "document";
      slug: string;
      id: string | number;
    }
  | {
      type: "view";
      slug: string;
      viewSlug: string;
    }
  | {
      type: "page";
      slug: string;
      subPath?: string;
    };

export interface AdminNavigateHelpers {
  collection: (slug: string) => string;
  document: (slug: string, id: string | number) => string;
  view: (slug: string, viewSlug: string) => string;
  page: (slug: string, subPath?: string) => string;
}

export interface AdminNotifyOptions {
  description?: string;
}

export interface AdminNotifyHelpers {
  success: (message: string, options?: AdminNotifyOptions) => void;
  error: (message: string, options?: AdminNotifyOptions) => void;
  info: (message: string, options?: AdminNotifyOptions) => void;
}

export interface AdminAccessHelpers {
  /**
   * UI gating hint that mirrors server-side access rules.
   * Note: The server remains the authoritative enforcement point.
   */
  can: (
    operation: "create" | "read" | "update" | "delete",
    collectionSlug: string,
    doc?: Record<string, unknown>
  ) => boolean;
}

export interface AdminBridgeBundle {
  navigate: (to: AdminNavigateTarget, options?: { replace?: boolean }) => void;
  to: AdminNavigateHelpers;
  notify: AdminNotifyHelpers;
  access: AdminAccessHelpers;
}

export const AdminBridgeContext = createContext<AdminBridgeBundle | null>(null);

export const toUrlHelpers: AdminNavigateHelpers = {
  collection: (slug: string) => `/collections/${encodeURIComponent(slug)}`,
  document: (slug: string, id: string | number) =>
    `/collections/${encodeURIComponent(slug)}/${encodeURIComponent(String(id))}`,
  view: (slug: string, viewSlug: string) =>
    `/collections/${encodeURIComponent(slug)}/views/${encodeURIComponent(viewSlug)}`,
  page: (slug: string, subPath?: string) => {
    const base = `/pages/${encodeURIComponent(slug)}`;
    if (!subPath) return base;
    const cleanSub = subPath.startsWith("/") ? subPath : `/${subPath}`;
    return `${base}${cleanSub}`;
  },
};

export function resolveAdminNavigateUrl(target: AdminNavigateTarget): string {
  if (typeof target === "string") return target;
  switch (target.type) {
    case "collection":
      return toUrlHelpers.collection(target.slug);
    case "document":
      return toUrlHelpers.document(target.slug, target.id);
    case "view":
      return toUrlHelpers.view(target.slug, target.viewSlug);
    case "page":
      return toUrlHelpers.page(target.slug, target.subPath);
    default:
      return "/";
  }
}

export const defaultFallbackBridge: AdminBridgeBundle = {
  navigate: (to) => {
    if (typeof window !== "undefined") {
      const targetUrl = resolveAdminNavigateUrl(to);
      if (window.location.hash.startsWith("#/")) {
        window.location.hash = targetUrl.startsWith("/") ? `#${targetUrl}` : `#/${targetUrl}`;
      } else {
        window.location.href = targetUrl;
      }
    }
  },
  to: toUrlHelpers,
  notify: {
    success: (msg, opts) => toast.success(msg, opts ? { description: opts.description } : undefined),
    error: (msg, opts) => toast.error(msg, opts ? { description: opts.description } : undefined),
    info: (msg, opts) => toast.info(msg, opts ? { description: opts.description } : undefined),
  },
  access: {
    can: () => true,
  },
};

export function useAdminBridgeContext(): AdminBridgeBundle {
  const ctx = useContext(AdminBridgeContext);
  return ctx ?? defaultFallbackBridge;
}
