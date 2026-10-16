import * as React from "react"
import { useSearchParams } from "react-router-dom"
import type { ColumnFiltersState } from "@tanstack/react-table"

import { buildServerWhere } from "../build-server-where"
import { resolveViewFilter } from "../resolve-view-filter"
import { loadToolbarState, persistToolbarState } from "../toolbar-persistence"
import { getLegacyToolbarStateKey, getToolbarStateKey } from "../view-preference-keys"

export type JoinOperator = "and" | "or"

export interface UseViewToolbarStateOptions {
  slug: string
  viewSlug: string
  /** Distinguishes persisted toolbar state per layout (e.g. `"kanban"`). */
  variant?: string
  schema: unknown
  /** The view's authored `filter`. */
  baseFilter?: Record<string, any> | string
  /**
   * Fold the search text into `serverWhere` instead of leaving it for the
   * caller to send as a separate `search` parameter.
   */
  foldSearchIntoWhere?: boolean
  /** Called after the user changes a filter or the search text (e.g. to reset paging). */
  onFilterChange?: () => void
}

export interface ViewToolbarState {
  columnFilters: ColumnFiltersState
  setColumnFilters: (
    updater: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState),
  ) => void
  joinOperator: JoinOperator
  setJoinOperator: (operator: JoinOperator) => void
  search: string
  setSearch: (value: string) => void
  /** Server `where` built from the view filter, the toolbar filters and (optionally) search. */
  serverWhere: Record<string, any> | undefined
  /** True when the user has narrowed the view with search or filters. */
  isNarrowed: boolean
}

function parseFilters(raw: string | null): ColumnFiltersState {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ColumnFiltersState) : []
  } catch {
    return []
  }
}

/**
 * Filters, search and match logic for an operational view's toolbar.
 *
 * The URL (`filters`, `search`, `joinOperator`) is the source of truth so a
 * metric-card click, a shared link and the toolbar all drive the same state.
 * Session storage is only the fallback when a view is opened without params.
 * Every layout that shows the faceted filter menu uses this, so they cannot
 * drift apart.
 */
export function useViewToolbarState({
  slug,
  viewSlug,
  variant,
  schema,
  baseFilter,
  foldSearchIntoWhere = false,
  onFilterChange,
}: UseViewToolbarStateOptions): ViewToolbarState {
  const stateKey = getToolbarStateKey(slug, viewSlug, variant)
  const legacyStateKey = getLegacyToolbarStateKey(slug, viewSlug, variant)
  const [searchParams, setSearchParams] = useSearchParams()

  const urlFilters = searchParams.get("filters")
  const urlSearch = searchParams.get("search") ?? ""
  const urlJoin = searchParams.get("joinOperator")

  const [columnFilters, setFiltersState] = React.useState<ColumnFiltersState>(() => {
    if (urlFilters) return parseFilters(urlFilters)
    const stored = loadToolbarState(stateKey) ?? loadToolbarState(legacyStateKey)
    return (stored?.columnFilters as ColumnFiltersState | undefined) ?? []
  })
  const [joinOperator, setJoinState] = React.useState<JoinOperator>(() => {
    if (urlJoin === "or" || urlJoin === "and") return urlJoin
    const stored = loadToolbarState(stateKey) ?? loadToolbarState(legacyStateKey)
    return (stored?.joinOperator as JoinOperator | undefined) ?? "and"
  })
  const [search, setSearchState] = React.useState(urlSearch)

  const onFilterChangeRef = React.useRef(onFilterChange)
  onFilterChangeRef.current = onFilterChange

  // Follow the URL when it changes from outside (metric card, back button).
  // Compare with the last seen value so the first render keeps the state
  // restored from session storage when the URL carries no params.
  const seenUrl = React.useRef({ filters: urlFilters, search: urlSearch, join: urlJoin })

  React.useEffect(() => {
    if (seenUrl.current.filters === urlFilters) return
    seenUrl.current.filters = urlFilters
    const next = parseFilters(urlFilters)
    setFiltersState((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
  }, [urlFilters])

  React.useEffect(() => {
    if (seenUrl.current.search !== urlSearch) {
      seenUrl.current.search = urlSearch
      setSearchState((prev) => (prev === urlSearch ? prev : urlSearch))
    }
    if (seenUrl.current.join !== urlJoin) {
      seenUrl.current.join = urlJoin
      if (urlJoin === "and" || urlJoin === "or") {
        setJoinState((prev) => (prev === urlJoin ? prev : urlJoin))
      }
    }
  }, [urlSearch, urlJoin])

  const setColumnFilters = React.useCallback<ViewToolbarState["setColumnFilters"]>(
    (updater) => {
      setFiltersState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        persistToolbarState(stateKey, { columnFilters: next })
        return next
      })
      onFilterChangeRef.current?.()
    },
    [stateKey],
  )

  const setJoinOperator = React.useCallback(
    (operator: JoinOperator) => {
      setJoinState(operator)
      persistToolbarState(stateKey, { joinOperator: operator })
    },
    [stateKey],
  )

  const setSearch = React.useCallback((value: string) => {
    setSearchState(value)
    onFilterChangeRef.current?.()
  }, [])

  // Mirror to the URL (replace, not push) and to session storage.
  React.useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (search) next.set("search", search)
        else next.delete("search")
        if (columnFilters.length) next.set("filters", JSON.stringify(columnFilters))
        else next.delete("filters")
        if (columnFilters.length >= 2 && joinOperator === "or") next.set("joinOperator", "or")
        else next.delete("joinOperator")
        return next.toString() === prev.toString() ? prev : next
      },
      { replace: true },
    )
    persistToolbarState(stateKey, { columnFilters, joinOperator })
  }, [search, columnFilters, joinOperator, setSearchParams, stateKey])

  const serverWhere = React.useMemo(
    () =>
      buildServerWhere({
        baseFilter: resolveViewFilter(baseFilter),
        columnFilters,
        search: foldSearchIntoWhere ? search : undefined,
        schema,
        joinOperator,
      }),
    [baseFilter, columnFilters, search, foldSearchIntoWhere, schema, joinOperator],
  )

  return {
    columnFilters,
    setColumnFilters,
    joinOperator,
    setJoinOperator,
    search,
    setSearch,
    serverWhere,
    isNarrowed: columnFilters.length > 0 || Boolean(search),
  }
}
