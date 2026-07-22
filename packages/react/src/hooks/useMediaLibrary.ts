import * as React from "react";
import {
  createMediaLibraryController,
  type MediaLibraryController,
  type MediaLibraryHookOptions,
  type MediaLibraryHookResult,
  type MediaRecord,
} from "@dyrected/admin/public";
import { useDyrected } from "./useDyrected";
import { useAdminSchemas } from "./useAdminSchemas";

export type UseMediaLibraryOptions = MediaLibraryHookOptions

/**
 * React hook for browsing and selecting media records from the Dyrected media library.
 *
 * This hook powers custom pickers, thumbnail choosers, and media drawers
 * without requiring consumers to implement pagination, search, or selection
 * state themselves.
 */
export function useMediaLibrary({
  collection,
  pageSize = 12,
  initialSearchQuery = "",
  initialSelectedIds = [],
}: UseMediaLibraryOptions): MediaLibraryHookResult {
  const { client } = useDyrected();
  const { schemas } = useAdminSchemas();
  const selectedIdsKey = React.useMemo(
    () => initialSelectedIds.join("|"),
    [initialSelectedIds]
  );

  const controller = React.useMemo<MediaLibraryController>(() => {
    return createMediaLibraryController({
      client,
      schemas,
      collection,
      pageSize,
      initialSearchQuery,
      initialSelectedIds,
    });
  }, [client, schemas, collection, pageSize, initialSearchQuery, selectedIdsKey]);

  const state = React.useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState
  );

  const selectedItems = React.useMemo<MediaRecord[]>(
    () => state.items.filter((item) => state.selectedIds.includes(item.id)),
    [state.items, state.selectedIds]
  );

  return {
    ...state,
    load: controller.load,
    search: controller.search,
    loadNextPage: controller.loadNextPage,
    setSelectedIds: controller.setSelectedIds,
    select: controller.select,
    deselect: controller.deselect,
    toggle: controller.toggle,
    clearSelection: controller.clearSelection,
    selectedItems,
    controller,
  };
}
