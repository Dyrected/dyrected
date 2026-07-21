import * as React from "react"
import { useDyrected } from "../providers/dyrected-context"
import {
  createMediaLibraryController,
  type MediaLibraryController,
  type MediaRecord,
} from "../controllers/media"

export interface UseMediaLibraryOptions {
  collection: string
  pageSize?: number
  initialSearchQuery?: string
  initialSelectedIds?: string[]
}

export function useMediaLibrary({
  collection,
  pageSize = 12,
  initialSearchQuery = "",
  initialSelectedIds = [],
}: UseMediaLibraryOptions) {
  const { client, schemas } = useDyrected()
  const selectedIdsKey = React.useMemo(
    () => initialSelectedIds.join("|"),
    [initialSelectedIds]
  )

  const controller = React.useMemo<MediaLibraryController>(() => {
    return createMediaLibraryController({
      client,
      schemas,
      collection,
      pageSize,
      initialSearchQuery,
      initialSelectedIds,
    })
  }, [client, schemas, collection, pageSize, initialSearchQuery, selectedIdsKey])

  const state = React.useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState
  )

  const selectedItems = React.useMemo<MediaRecord[]>(
    () => state.items.filter((item) => state.selectedIds.includes(item.id)),
    [state.items, state.selectedIds]
  )

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
  }
}
