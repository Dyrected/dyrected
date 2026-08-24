import { useMemo } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-context"
import { resolveViewFilter, resolveViewSort } from "./resolve-view-filter"

export interface UseViewDataOptions {
  slug: string
  viewSlug?: string
  filter?: Record<string, any> | string
  sort?: { field: string; direction: "asc" | "desc" } | string
  page?: number
  limit?: number
  enabled?: boolean
}

export interface PaginatedFindResult {
  docs: Record<string, any>[]
  total: number
  page: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  limit: number
}

/**
 * Fetches server-paginated and server-filtered documents for an operational view.
 */
export function useViewData({
  slug,
  viewSlug = "default",
  filter,
  sort,
  page = 1,
  limit = 20,
  enabled = true,
}: UseViewDataOptions) {
  const { client } = useDyrected()
  const filterHash = JSON.stringify(filter ?? null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const where = useMemo(() => resolveViewFilter(filter), [filterHash])
  const sortString = typeof sort === "string" ? sort : resolveViewSort(sort)

  const query = useQuery({
    queryKey: ["operational-view", slug, viewSlug, filterHash, sortString ?? null, page, limit],
    queryFn: async (): Promise<PaginatedFindResult> => {
      if (!client) throw new Error("Dyrected client unavailable")
      const result = await (client as any).collection(slug).find({
        where,
        sort: sortString,
        page,
        limit,
      })
      const docs = (result?.docs ?? []) as Record<string, any>[]
      const total = Number(result?.total ?? docs.length)
      const calculatedTotalPages = Math.ceil(total / (limit || 20)) || 1
      return {
        docs,
        total,
        page: Number(result?.page ?? page),
        totalPages: Number(result?.totalPages ?? calculatedTotalPages),
        hasNextPage: Boolean(result?.hasNextPage ?? (page < calculatedTotalPages)),
        hasPrevPage: Boolean(result?.hasPrevPage ?? (page > 1)),
        limit: Number(result?.limit ?? limit),
      }
    },
    enabled: !!client && enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  return {
    ...query,
    data: query.data?.docs ?? [],
    paginatedData: query.data,
    total: query.data?.total ?? 0,
    page: query.data?.page ?? page,
    totalPages: query.data?.totalPages ?? 1,
    hasNextPage: query.data?.hasNextPage ?? false,
    hasPrevPage: query.data?.hasPrevPage ?? false,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
  }
}
