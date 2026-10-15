import { useAdminBridgeContext, type AdminNotifyHelpers, type AdminNotifyOptions } from "../providers/admin-bridge-context";

export type { AdminNotifyHelpers, AdminNotifyOptions };

/**
 * Hook for displaying admin toast notifications without importing a toast library directly.
 *
 * @experimental
 */
export function useAdminNotify(): AdminNotifyHelpers {
  const { notify } = useAdminBridgeContext();
  return notify;
}
