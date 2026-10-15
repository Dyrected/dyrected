import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import jexl from "jexl";
import { useOptionalDyrected } from "./dyrected-context";
import {
  AdminBridgeContext,
  toUrlHelpers,
  resolveAdminNavigateUrl,
  type AdminNavigateTarget,
  type AdminNotifyHelpers,
  type AdminAccessHelpers,
  type AdminBridgeBundle,
} from "./admin-bridge-context";

export function AdminBridgeProvider({ children }: { children: React.ReactNode }) {
  const routerNavigate = useNavigate();
  const dyrected = useOptionalDyrected();
  const schemas = dyrected?.schemas;
  const user = dyrected?.user ?? null;

  const navigate = React.useCallback(
    (to: AdminNavigateTarget, options?: { replace?: boolean }) => {
      const url = resolveAdminNavigateUrl(to);
      routerNavigate(url, options);
    },
    [routerNavigate]
  );

  const notify = React.useMemo<AdminNotifyHelpers>(
    () => ({
      success: (message, options) => {
        toast.success(message, options ? { description: options.description } : undefined);
      },
      error: (message, options) => {
        toast.error(message, options ? { description: options.description } : undefined);
      },
      info: (message, options) => {
        toast.info(message, options ? { description: options.description } : undefined);
      },
    }),
    []
  );

  const access = React.useMemo<AdminAccessHelpers>(() => {
    return {
      can: (operation, collectionSlug, doc) => {
        const collection = schemas?.collections?.find((c: any) => c.slug === collectionSlug);
        if (!collection) return true;

        const opAccess = (collection.access as Record<string, unknown> | undefined)?.[operation];
        if (opAccess === false) return false;
        if (opAccess === true || opAccess === undefined || opAccess === null) return true;

        if (typeof opAccess === "string") {
          try {
            return Boolean(jexl.evalSync(opAccess, { user, doc, ...doc }));
          } catch (e) {
            console.warn(`[useAccess] Evaluation of ${operation} on ${collectionSlug} failed:`, e);
            return false;
          }
        }

        // Functions or unknown policy rules cannot be executed directly on the client; default to true as UI hint
        return true;
      },
    };
  }, [schemas, user]);

  const value = React.useMemo<AdminBridgeBundle>(
    () => ({
      navigate,
      to: toUrlHelpers,
      notify,
      access,
    }),
    [navigate, notify, access]
  );

  return <AdminBridgeContext.Provider value={value}>{children}</AdminBridgeContext.Provider>;
}
