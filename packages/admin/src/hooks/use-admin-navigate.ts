import { useAdminBridgeContext, type AdminNavigateHelpers, type AdminNavigateTarget } from "../providers/admin-bridge-context";

export interface AdminNavigateResult {
  /**
   * Navigate to an admin surface or external URL.
   * Can accept a string path or a structured target:
   * `navigate(to.collection("posts"))`
   */
  navigate: (to: AdminNavigateTarget, options?: { replace?: boolean }) => void;
  /** URL helper builders for admin routes. */
  to: AdminNavigateHelpers;
}

/**
 * Hook for programmatic navigation within Dyrected Admin surfaces.
 * Respects internal router and URL generation rules without hardcoding URL structures.
 *
 * @experimental
 */
export function useAdminNavigate(): AdminNavigateResult {
  const { navigate, to } = useAdminBridgeContext();
  return { navigate, to };
}
