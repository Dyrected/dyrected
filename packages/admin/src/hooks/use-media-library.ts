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
  initialFolderId?: string | null
  initialMimeFilter?: string | null
}

export function useMediaLibrary({
  collection,
  pageSize = 12,
  initialSearchQuery = "",
  initialSelectedIds = [],
  initialFolderId = null,
  initialMimeFilter = null,
}: UseMediaLibraryOptions) {
  const { client, schemas } = useDyrected()

  const controller = React.useMemo<MediaLibraryController>(() => {
    return createMediaLibraryController({
      client,
      schemas,
      collection,
      pageSize,
      initialSearchQuery,
      initialSelectedIds,
      initialFolderId,
      initialMimeFilter,
    })
  }, [client, schemas, collection, pageSize, initialSearchQuery, initialFolderId, initialMimeFilter, initialSelectedIds])

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
    setFolder: controller.setFolder,
    setMimeFilter: controller.setMimeFilter,
    loadNextPage: controller.loadNextPage,
    setSelectedIds: controller.setSelectedIds,
    select: controller.select,
    deselect: controller.deselect,
    toggle: controller.toggle,
    clearSelection: controller.clearSelection,
    selectedItems,
  }
}
