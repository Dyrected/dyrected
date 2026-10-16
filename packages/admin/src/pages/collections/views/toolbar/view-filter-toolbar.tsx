import * as React from "react"
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table"

import { buildViewColumns } from "../build-view-columns"
import { DataTableToolbar } from "../table/data-table-toolbar"
import type { ViewToolbarState } from "./use-view-toolbar-state"

export interface ViewFilterToolbarProps {
  schema: any
  client: unknown
  schemas: unknown
  state: ViewToolbarState
  /** Documents currently on screen; faceted filters build their option counts from them. */
  data: Record<string, any>[]
  searchPlaceholder?: string
  isFetching?: boolean
  /** Active group-by field, with the fields the user may group by. */
  groupBy?: string
  groupByOptions?: Array<{ value: string; label: string }>
  onGroupByChange?: (value: string | undefined) => void
  /** Extra controls rendered at the end of the bar (field pickers, export…). */
  children?: React.ReactNode
  className?: string
}

/**
 * The faceted filter bar (search, field filters, match logic, reset) for
 * layouts that do not render a table themselves.
 *
 * It drives a headless TanStack table built from the same `buildViewColumns`
 * the table layout uses, so a filter means exactly the same thing everywhere.
 * Filtering stays server-side; the table instance only holds filter state and
 * column metadata.
 */
export function ViewFilterToolbar({
  schema,
  client,
  schemas,
  state,
  data,
  searchPlaceholder,
  isFetching,
  groupBy,
  groupByOptions,
  onGroupByChange,
  children,
  className,
}: ViewFilterToolbarProps) {
  const { columnFilters, setColumnFilters, search, setSearch, joinOperator, setJoinOperator } = state

  const columns = React.useMemo(
    () => buildViewColumns({ schema, client, schemas }),
    [schema, client, schemas],
  )

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter: search, columnFilters },
    onGlobalFilterChange: setSearch,
    onColumnFiltersChange: setColumnFilters,
    manualFiltering: true,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const label = schema?.labels?.plural || schema?.labels?.singular || schema?.slug || "records"

  return (
    <DataTableToolbar
      className={className}
      table={table}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={searchPlaceholder ?? `Search ${label}...`}
      isFetching={isFetching}
      groupBy={groupBy}
      groupByOptions={groupByOptions}
      onGroupByChange={onGroupByChange}
      joinOperator={joinOperator}
      onJoinOperatorChange={setJoinOperator}
    >
      {children}
    </DataTableToolbar>
  )
}
