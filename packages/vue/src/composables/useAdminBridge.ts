import { inject, type InjectionKey } from "vue";
import type {
  AdminBridgeBundle,
  AdminNavigateTarget,
  AdminNavigateHelpers,
  AdminNotifyHelpers,
  AdminNotifyOptions,
  AdminAccessHelpers,
} from "@dyrected/admin/public";
import { toUrlHelpers, resolveAdminNavigateUrl } from "@dyrected/admin/public";

export type {
  AdminBridgeBundle,
  AdminNavigateTarget,
  AdminNavigateHelpers,
  AdminNotifyHelpers,
  AdminNotifyOptions,
  AdminAccessHelpers,
};

export const DYRECTED_ADMIN_KEY: InjectionKey<AdminBridgeBundle> = Symbol("dyrected-admin-bridge");

const fallbackBridge: AdminBridgeBundle = {
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
    success: (msg) => console.log(`[Admin Success] ${msg}`),
    error: (msg) => console.error(`[Admin Error] ${msg}`),
    info: (msg) => console.info(`[Admin Info] ${msg}`),
  },
  access: {
    can: () => true,
  },
};

/**
 * Access the ambient admin bridge bundle injected across the React-in-Vue bridge.
 */
export function useAdminBridge(): AdminBridgeBundle {
  return inject(DYRECTED_ADMIN_KEY, fallbackBridge);
}
