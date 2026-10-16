import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CUSTOM_VIEW_FETCH_ALL_LIMIT } from "@dyrected/core"

import { useDyrected } from "../../../../providers/dyrected-context"
import { usePublishViewData } from "../../../../hooks/use-publish-view-data"
import type {
  CollectionViewState,
  ViewDataHandlers,
  ViewDataSlice,
  ViewDocument,
} from "../../../../providers/view-controller"
import { resolveViewSort } from "../resolve-view-filter"
import type { ViewToolbarState } from "../toolbar/use-view-toolbar-state"
import type { SerializedView } from "../types"

/** The API caps a single `find()` at 100 documents. */
const API_PAGE_LIMIT = 100
const DEFAULT_PAGE_SIZE = 50
const EMPTY_DOCS: ViewDocument[] = []

interface PageResult {
  docs: ViewDocument[]
  total: number
  totalPages: number
  isTruncated: boolean
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null"
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`
}

/**
 * Loads documents for a `layout: "custom"` view (one page, or everything up to
 * the safety cap with `data.fetchAll`) and publishes them to the view
 * controller. Selection, actions and optimistic updates are the host's, not
 * this hook's, so a custom layout behaves exactly like a built-in one.
 */
export function useCustomViewData({
  slug,
  view,
  toolbar,
}: {
  slug: string
  view: SerializedView
  toolbar: ViewToolbarState
}): ViewDataSlice {
  const { client } = useDyrected()
  const [searchParams] = useSearchParams()

  const fetchAll = Boolean(view.data?.fetchAll)
  const pageSize = Math.min(Math.max(Number(view.data?.pageSize) || DEFAULT_PAGE_SIZE, 1), API_PAGE_LIMIT)
  const page = Math.max(Number(searchParams.get("page")) || 1, 1)

  const [sort, setSort] = useState<CollectionViewState["sort"]>(() => view.sort)
  const [layoutWhere, setLayoutWhere] = useState<Record<string, any> | undefined>(undefined)

  const toolbarWhere = toolbar.serverWhere
  const where = useMemo(() => {
    if (toolbarWhere && layoutWhere) return { AND: [toolbarWhere, layoutWhere] }
    return toolbarWhere ?? layoutWhere
  }, [toolbarWhere, layoutWhere])
  const whereHash = stableStringify(where ?? null)
  const sortString = resolveViewSort(sort)

  const query = useQuery({
    queryKey: ["operational-view", slug, view.slug, "custom", whereHash, sortString ?? null, fetchAll ? "all" : page, pageSize],
    enabled: !!client,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: async (): Promise<PageResult> => {
      if (!client) throw new Error("Dyrected client unavailable")
      const collection = (client as any).collection(slug)
      const find = (nextPage: number, limit: number) => collection.find({ where, sort: sortString, page: nextPage, limit })

      if (!fetchAll) {
        const result = await find(page, pageSize)
        const docs = (result?.docs ?? []) as ViewDocument[]
        const total = Number(result?.total ?? docs.length)
        return {
          docs,
          total,
          totalPages: Number(result?.totalPages ?? (Math.ceil(total / pageSize) || 1)),
          isTruncated: false,
        }
      }

      const docs: ViewDocument[] = []
      let total = 0
      for (let nextPage = 1; docs.length < CUSTOM_VIEW_FETCH_ALL_LIMIT; nextPage++) {
        const result = await find(nextPage, API_PAGE_LIMIT)
        const batch = (result?.docs ?? []) as ViewDocument[]
        total = Number(result?.total ?? batch.length)
        docs.push(...batch)
        if (!batch.length || docs.length >= total) break
      }
      return {
        docs: docs.slice(0, CUSTOM_VIEW_FETCH_ALL_LIMIT),
        total,
        totalPages: 1,
        isTruncated: total > CUSTOM_VIEW_FETCH_ALL_LIMIT,
      }
    },
  })

  const slice = useMemo<ViewDataSlice>(
    () => ({
      documents: query.data?.docs ?? EMPTY_DOCS,
      total: query.data?.total ?? 0,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      error: query.error ? (query.error as Error) : undefined,
      isTruncated: query.data?.isTruncated ?? false,
      pagination: { page: fetchAll ? 1 : page, pageSize, totalPages: query.data?.totalPages ?? 1 },
      sort,
      where,
    }),
    [query.data, query.isLoading, query.isFetching, query.error, fetchAll, page, pageSize, sort, where],
  )

  const handlers = useMemo<ViewDataHandlers>(
    () => ({
      setSort: (next) => setSort(next),
      setFilters: (next) => setLayoutWhere(next && Object.keys(next).length ? next : undefined),
    }),
    [],
  )

  usePublishViewData(slice, handlers)
  return slice
}
