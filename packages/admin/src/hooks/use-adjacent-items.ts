import { useMemo } from "react"

/**
 * Finds the previous/next item relative to `activeId` within an already-loaded,
 * in-memory list — for paging through a drawer's row list without a server
 * round-trip. Unlike `useAdjacentDocuments` (which queries the full collection
 * by `createdAt`), this only ever considers the subset of rows the caller
 * already has (e.g. a join field's fetched page, or a repeat field's data).
 */
export interface AdjacentItemsResult<T> {
  prevItem?: T
  nextItem?: T
  hasPrev: boolean
  hasNext: boolean
}

export function useAdjacentItems<T extends { id?: unknown }>(
  items: T[] | undefined,
  activeId: string | null | undefined,
): AdjacentItemsResult<T> {
  return useMemo(() => {
    if (!activeId || !Array.isArray(items) || items.length === 0) {
      return { prevItem: undefined, nextItem: undefined, hasPrev: false, hasNext: false }
    }
    const idx = items.findIndex((item) => String(item?.id) === activeId)
    if (idx === -1) {
      return { prevItem: undefined, nextItem: undefined, hasPrev: false, hasNext: false }
    }
    const prevItem = idx > 0 ? items[idx - 1] : undefined
    const nextItem = idx < items.length - 1 ? items[idx + 1] : undefined
    return { prevItem, nextItem, hasPrev: Boolean(prevItem), hasNext: Boolean(nextItem) }
  }, [items, activeId])
}
