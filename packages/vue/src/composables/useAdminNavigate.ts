import { useAdminBridge } from "./useAdminBridge";
import type { AdminNavigateHelpers, AdminNavigateTarget } from "./useAdminBridge";

export interface AdminNavigateResult {
  navigate: (to: AdminNavigateTarget, options?: { replace?: boolean }) => void;
  to: AdminNavigateHelpers;
}

/**
 * Vue composable for programmatic navigation in custom admin surfaces.
 *
 * @experimental
 */
export function useAdminNavigate(): AdminNavigateResult {
  const bridge = useAdminBridge();
  return {
    navigate: bridge.navigate,
    to: bridge.to,
  };
}
