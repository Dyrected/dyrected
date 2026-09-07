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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, schemas, collection, pageSize])

  const state = React.useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState
  )

  const selectedItems = React.useMemo<MediaRecord[]>(
    () => state.items.filter((item) => state.selectedIds.includes(item.id)),
    [state.items, state.selectedIds]
  )

  const load = React.useCallback(() => controller.load(), [controller])
  const search = React.useCallback((q: string) => controller.search(q), [controller])
  const setFolder = React.useCallback((fid: string | null) => controller.setFolder(fid), [controller])
  const setMimeFilter = React.useCallback((mf: string | null) => controller.setMimeFilter(mf), [controller])
  const loadNextPage = React.useCallback(() => controller.loadNextPage(), [controller])
  const setSelectedIds = React.useCallback((ids: string[]) => controller.setSelectedIds(ids), [controller])
  const select = React.useCallback((id: string) => controller.select(id), [controller])
  const deselect = React.useCallback((id: string) => controller.deselect(id), [controller])
  const toggle = React.useCallback((id: string) => controller.toggle(id), [controller])
  const clearSelection = React.useCallback(() => controller.clearSelection(), [controller])

  return {
    ...state,
    load,
    search,
    setFolder,
    setMimeFilter,
    loadNextPage,
    setSelectedIds,
    select,
    deselect,
    toggle,
    clearSelection,
    selectedItems,
  }
}
