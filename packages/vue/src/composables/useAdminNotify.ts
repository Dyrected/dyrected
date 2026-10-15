import { useAdminBridge } from "./useAdminBridge";
import type { AdminNotifyHelpers, AdminNotifyOptions } from "./useAdminBridge";

export type { AdminNotifyHelpers, AdminNotifyOptions };

/**
 * Vue composable for displaying toast notifications in custom admin surfaces.
 *
 * @experimental
 */
export function useAdminNotify(): AdminNotifyHelpers {
  const bridge = useAdminBridge();
  return bridge.notify;
}
