import {
  useTrash as useAdminTrash,
  type UseTrashOptions as AdminUseTrashOptions,
  type UseTrashPagination,
  type UseTrashResult,
} from "@dyrected/admin/public";
import { useDyrected } from "./useDyrected";

export interface UseTrashOptions extends Omit<AdminUseTrashOptions, "client"> {
  client?: AdminUseTrashOptions["client"];
}

export type { UseTrashPagination, UseTrashResult };

/**
 * React hook for browsing and managing trashed documents in a collection.
 *
 * Automatically retrieves the SDK client from DyrectedProvider context
 * and invalidates collection list and badge queries on restore so
 * restored documents immediately reappear without requiring a manual refresh.
 *
 * @example
 * ```tsx
 * const { entries, total, isLoading, pagination, restore, keep, purge, empty } = useTrash("guests");
 * ```
 */
export function useTrash(collection: string, options: UseTrashOptions = {}): UseTrashResult {
  const { client } = useDyrected();
  return useAdminTrash(collection, {
    client,
    ...options,
  });
}
