import { useAdminBridge } from "./useAdminBridge";
import type { AdminAccessHelpers } from "./useAdminBridge";

export type { AdminAccessHelpers };

export interface UseAccessResult {
  /**
   * Evaluates whether the current user is permitted to perform an operation on a collection.
   *
   * IMPORTANT LIMITATIONS & SEMANTICS:
   * 1. Evaluates collection-level boolean and string (JEXL) access rules only (`collection.access[operation]`).
   * 2. Does not evaluate field-level access rules (`field.access`).
   * 3. Function-based access rules and unknown/missing collection rules cannot be evaluated on the client and will return `true` as a non-blocking fallback.
   * 4. This is purely a best-effort client-side UI hint to show/hide controls or disable actions. Server-side access rules remain the authoritative enforcement point.
   */
  can: (
    operation: "create" | "read" | "update" | "delete",
    collection: string,
    doc?: Record<string, unknown>
  ) => boolean;
}

/**
 * Vue composable for UI gating based on collection access rules.
 *
 * @experimental
 */
export function useAccess(): UseAccessResult {
  const bridge = useAdminBridge();
  return {
    can: bridge.access.can,
  };
}
