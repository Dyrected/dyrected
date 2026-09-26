import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDyrected } from "../providers/dyrected-context";
import {
  createTrashController,
  type TrashController,
} from "../controllers/trash";
import type { DyrectedClient, TrashEntry } from "@dyrected/sdk";

export interface UseTrashOptions {
  client?: DyrectedClient | null;
  pageSize?: number;
  initialSearchQuery?: string;
  onRestore?: (restored: unknown, trashId: string) => void | Promise<void>;
  onPurge?: (trashId: string) => void | Promise<void>;
  onEmpty?: () => void | Promise<void>;
}

export interface UseTrashPagination {
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  setPage: (page: number) => Promise<void>;
  setLimit: (limit: number) => Promise<void>;
}

export interface UseTrashResult {
  entries: TrashEntry[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  searchQuery: string;
  pagination: UseTrashPagination;
  search: (query: string) => Promise<void>;
  restore: (id: string, options?: { overrides?: Record<string, unknown> }) => Promise<unknown>;
  restoreMany: (ids: string[]) => Promise<{ restored: string[]; failed: unknown[]; count: number }>;
  keep: (id: string, options?: { purgeAt?: Date | string | number | null } | boolean) => Promise<{ message: string; purgeAt: number | null }>;
  purge: (id: string) => Promise<{ message: string }>;
  empty: (confirm?: string) => Promise<{ message: string; count: number }>;
  refetch: () => Promise<void>;
  controller: TrashController;
}

/**
 * React hook for browsing and managing trashed documents in a collection.
 *
 * Automatically invalidates collection list and badge queries on restore so
 * restored documents immediately reappear without requiring a manual refresh.
 *
 * @example
 * ```tsx
 * const { entries, total, isLoading, pagination, restore, keep, purge, empty } = useTrash("guests");
 * ```
 */
export function useTrash(collection: string, options: UseTrashOptions = {}): UseTrashResult {
  const dyrectedContext = useDyrected();
  const client = options.client ?? dyrectedContext?.client ?? null;

  let queryClient: any = null;
  try {
    queryClient = useQueryClient();
  } catch {
    // Outside QueryClientProvider (e.g. standalone test or custom provider)
  }

  const { pageSize = 20, initialSearchQuery = "", onRestore, onPurge, onEmpty } = options;

  const invalidateQueries = React.useCallback(() => {
    if (!queryClient) return;
    void queryClient.invalidateQueries({ queryKey: ["collection", collection] });
    void queryClient.invalidateQueries({ queryKey: ["collections", collection] });
    void queryClient.invalidateQueries({ queryKey: ["operational-view", collection] });
    void queryClient.invalidateQueries({ queryKey: ["collection-trash", collection] });
    void queryClient.invalidateQueries({ queryKey: ["trash-count", collection] });
    void queryClient.invalidateQueries({ queryKey: ["admin-navigation-badges"] });
  }, [queryClient, collection]);

  const controller = React.useMemo<TrashController>(() => {
    return createTrashController({
      client,
      collection,
      pageSize,
      initialSearchQuery,
      onRestore: async (restored, trashId) => {
        invalidateQueries();
        if (onRestore) {
          await onRestore(restored, trashId);
        }
      },
      onPurge,
      onEmpty,
    });
  }, [client, collection, pageSize, initialSearchQuery, invalidateQueries, onRestore, onPurge, onEmpty]);

  const state = React.useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );

  React.useEffect(() => {
    void controller.load();
  }, [controller]);

  const setPage = React.useCallback((page: number) => controller.setPage(page), [controller]);
  const setLimit = React.useCallback((limit: number) => controller.setLimit(limit), [controller]);
  const search = React.useCallback((q: string) => controller.search(q), [controller]);
  const restore = React.useCallback(
    (id: string, opts?: { overrides?: Record<string, unknown> }) => controller.restore(id, opts),
    [controller],
  );
  const restoreMany = React.useCallback((ids: string[]) => controller.restoreMany(ids), [controller]);
  const keep = React.useCallback(
    (id: string, opts?: { purgeAt?: Date | string | number | null } | boolean) => controller.keep(id, opts),
    [controller],
  );
  const purge = React.useCallback((id: string) => controller.purge(id), [controller]);
  const empty = React.useCallback((confirm?: string) => controller.empty(confirm), [controller]);
  const refetch = React.useCallback(() => controller.load(), [controller]);

  return {
    ...state,
    pagination: {
      page: state.page,
      limit: state.limit,
      totalPages: state.totalPages,
      hasNextPage: state.hasNextPage,
      hasPrevPage: state.hasPrevPage,
      setPage,
      setLimit,
    },
    search,
    restore,
    restoreMany,
    keep,
    purge,
    empty,
    refetch,
    controller,
  };
}
