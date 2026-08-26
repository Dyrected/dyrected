import * as React from "react"
import { queryOptions, useQueries, useQuery } from "@tanstack/react-query"

import { useDyrected } from "../../../../providers/dyrected-context"
import { resolveViewFilter, resolveViewSort } from "../resolve-view-filter"
import type { SerializedView } from "../types"

/** Sentinel group for docs whose `groupBy` value is empty. */
export const UNASSIGNED = "__unassigned__"

/** Per-request page size; the backend caps find() at 100. */
const PAGE_SIZE = 100

/** Fan-out ceiling: beyond this many options the hook uses a single fetch. */
const MAX_GROUPS = 15

export interface GroupColumnState {
  /** Raw group value written back to the `groupBy` field. */
  value: string
  label: string
  docs: Record<string, any>[]
  /** Server-side total for this group (accurate beyond the fetched page). */
  total: number
  /** True when more pages exist server-side. */
  hasNextPage: boolean
  isPending: boolean
  isError: boolean
  isFetchingMore: boolean
  retry: () => void
  loadMore: () => void
}

/** Deterministic key fragment for a where clause. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null"
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`
}

/** Columns come from the field's declared options (mirrors the header row). */
export function deriveGroups(groupField: string, schema: any): Array<{ value: string; label: string }> {
  const field = (schema?.fields ?? []).find((candidate: any) => candidate.name === groupField)

  if (field?.type === "boolean") {
    return [
      { value: "true", label: field.label || "Yes" },
      { value: "false", label: "No" },
    ]
  }

  const options = Array.isArray(field?.options) ? field.options : []
  return options.map((option: any) =>
    typeof option === "string"
      ? { value: option, label: option }
      : { value: String(option.value), label: String(option.label ?? option.value) },
  )
}

/** Coerces a normalized group id back to the field's storage type. */
export function coerceGroupValue(value: string, groupField: string, schema: any): unknown {
  const field = (schema?.fields ?? []).find((candidate: any) => candidate.name === groupField)
  if (field?.type === "boolean") return value === "true"
  if (field?.type === "number") {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? value : parsed
  }
  return value
}

/** Matches docs whose group field is null, missing, or an empty string. */
function unassignedWhere(groupField: string, fieldType?: string): Record<string, any> {
  const conditions: Record<string, any>[] = [
    { [groupField]: null },
    { [groupField]: { exists: false } },
  ]
  if (!fieldType || fieldType === "text" || fieldType === "select" || fieldType === "textarea") {
    conditions.push({ [groupField]: "" })
  }
  return {
    OR: conditions,
  }
}

/** AND-merges the view's base filter with a group condition (collision-safe). */
function groupWhere(base: Record<string, any> | undefined, condition: Record<string, any>): Record<string, any> {
  return base ? { AND: [base, condition] } : condition
}

interface FindResult {
  docs?: Record<string, any>[]
  total?: number
  hasNextPage?: boolean
  page?: number
}

/**
 * Fetches kanban columns independently: one paginated request per declared
 * group option plus an "Unassigned" bucket, run in parallel through TanStack
 * `useQueries` + `infiniteQueryOptions` so each column caches, retries, and
 * pages on its own.
 *
 * Beyond MAX_GROUPS options the hook degrades to a single flat fetch (the
 * pre-grouped behavior) rather than firing unbounded parallel requests.
 */
export function useKanbanGroups({
  slug,
  view,
  schema,
  groupField,
  filter,
}: {
  slug: string
  view: SerializedView
  schema: any
  groupField: string
  filter?: Record<string, any> | string
}) {
  const { client } = useDyrected()
  const filterHash = React.useMemo(() => stableStringify(filter ?? view.filter ?? null), [filter, view.filter])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = React.useMemo(() => resolveViewFilter(filter ?? view.filter), [filterHash])
  const sortString = React.useMemo(() => resolveViewSort(view.sort), [view.sort])
  const groups = React.useMemo(() => deriveGroups(groupField, schema), [groupField, schema])
  const fieldDef = React.useMemo(
    () => (schema?.fields ?? []).find((candidate: any) => candidate.name === groupField),
    [schema, groupField],
  )

  const enabled = Boolean(client && groups.length > 0 && groups.length <= MAX_GROUPS)

  const fetchGroup = React.useCallback(
    async (value: string, page: number): Promise<FindResult> => {
      if (!client) throw new Error("Dyrected client unavailable")
      const condition =
        value === UNASSIGNED
          ? unassignedWhere(groupField, fieldDef?.type)
          : { [groupField]: coerceGroupValue(value, groupField, schema) }
      const where = groupWhere(base, condition)
      const result = await (client as any).collection(slug).find({
        where,
        sort: sortString,
        limit: PAGE_SIZE,
        page,
      })
      return {
        docs: (result?.docs ?? []) as Record<string, any>[],
        total: Number(result?.total ?? result?.docs?.length ?? 0),
        hasNextPage: Boolean(result?.hasNextPage),
        page: Number(result?.page ?? page),
      }
    },
    [client, slug, groupField, fieldDef?.type, schema, base, sortString],
  )

  const queries = React.useMemo(() => {
    const groupValues = [...groups.map((group) => group.value), UNASSIGNED]
    return groupValues.map((value) =>
      queryOptions({
        queryKey: ["operational-view", slug, view.slug, "group", value, filterHash, sortString ?? null] as const,
        queryFn: () => fetchGroup(value, 1),
        enabled,
        staleTime: 15_000,
      }),
    )
  }, [groups, slug, view.slug, filterHash, sortString, fetchGroup, enabled])

  const grouped = useQueries({
    queries: queries as any,
  })

  const toColumn = React.useCallback(
    (value: string, label: string, index: number): GroupColumnState => {
      const query = grouped[index] as any
      const data = query?.data as FindResult | undefined
      return {
        value,
        label,
        docs: data?.docs ?? [],
        total: Number(data?.total ?? data?.docs?.length ?? 0),
        hasNextPage: Boolean(data?.hasNextPage),
        isPending: Boolean(query?.isPending),
        isError: Boolean(query?.isError),
        isFetchingMore: Boolean(query?.isFetching),
        retry: () => void query?.refetch?.(),
        loadMore: () => void query?.refetch?.(),
      }
    },
    [grouped],
  )

  const columns: GroupColumnState[] = React.useMemo(() => {
    const unassigned = toColumn(UNASSIGNED, "Unassigned", groups.length)
    const hasUnassignedValues = unassigned.docs.length > 0 || unassigned.total > 0 || unassigned.isPending
    return [
      ...groups.map((group, i) => toColumn(group.value, group.label, i)),
      ...(hasUnassignedValues ? [unassigned] : []),
    ]
  }, [groups, toColumn])

  /** Single flat fetch when the field has too many options to fan out. */
  const fallback = useQuery({
    queryKey: ["operational-view", slug, view.slug, "flat", filterHash, sortString ?? null],
    queryFn: async () => {
      if (!client) throw new Error("Dyrected client unavailable")
      const result = await (client as any).collection(slug).find({
        where: base,
        sort: sortString,
        limit: PAGE_SIZE,
      })
      return (result?.docs ?? []) as Record<string, any>[]
    },
    enabled: !!client && !enabled,
    staleTime: 15_000,
  })

  return {
    mode: enabled ? ("grouped" as const) : ("fallback" as const),
    columns,
    fallbackDocs: fallback.data ?? [],
    fallbackIsPending: fallback.isPending,
    refetchAll: () => {
      for (const query of grouped) void (query as any)?.refetch?.()
      if (!enabled) void fallback.refetch()
    },
  }
}
