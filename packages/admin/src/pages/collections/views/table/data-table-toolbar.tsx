import * as React from "react"
import type { Column, Table } from "@tanstack/react-table"
import { X, Loader2 } from "lucide-react"

import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { DataTableFilterMenu } from "./data-table-filter-menu"
import { DataTableSort } from "./data-table-sort"
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { cn } from "../../../../lib/utils"

/**
 * Shared look for toolbar filter controls: dashed border + muted background so
 * filters read as optional controls rather than required form fields.
 */
export const FILTER_INPUT_CLASSES = "dy-border-dashed dy-bg-muted/40 hover:dy-bg-muted/60 focus-visible:dy-bg-background"

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>
  /** Column id to bind the search input to. */
  searchColumnId?: string
  searchPlaceholder?: string
  /** Whether a background query/refetch is in flight. */
  isFetching?: boolean
}

/**
 * Faceted filter bar: per-column filter controls plus a reset button.
 * Ported from tablecn's data-table architecture.
 */
export function DataTableToolbar<TData>({
  table,
  searchColumnId,
  searchPlaceholder = "Search...",
  isFetching,
  children,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const filterableColumns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter((column) => column.getCanFilter() && column.id !== searchColumnId),
    [table, searchColumnId],
  )

  const facetedColumns = React.useMemo(
    () =>
      filterableColumns.filter((column) => {
        const meta = column.columnDef.meta as any
        return meta?.variant === "multiSelect" || meta?.variant === "select"
      }),
    [filterableColumns],
  )

  const menuColumns = React.useMemo(
    () =>
      filterableColumns.filter((column) => {
        const meta = column.columnDef.meta as any
        return meta?.variant === "text" || meta?.variant === "number" || meta?.variant === "date"
      }),
    [filterableColumns],
  )

  const searchColumn = searchColumnId ? table.getColumn(searchColumnId) : undefined

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "dy-flex dy-flex-wrap md:dy-flex-nowrap dy-max-w-full dy-items-start dy-justify-between dy-gap-2",
        className,
      )}
      {...props}
    >
      <div className="dy-flex dy-flex-1 dy-flex-wrap dy-items-center dy-gap-2">
        {searchColumn && (
          <div className="dy-w-40 lg:dy-w-56">
            <Input
              size="sm"
              placeholder={searchPlaceholder}
              value={(searchColumn.getFilterValue() as string) ?? ""}
              onChange={(event) => searchColumn.setFilterValue(event.target.value)}
              className={FILTER_INPUT_CLASSES}
            />
          </div>
        )}
        {/* Command-based menu handles text / number / date columns; facets stay as pills. */}
        {menuColumns.length > 0 && (
          <DataTableFilterMenu table={table} excludeColumnIds={searchColumnId ? [searchColumnId] : []} />
        )}
        {facetedColumns.map((column) => (
          <ToolbarFacetedFilter key={column.id} column={column} />
        ))}
        <DataTableSort table={table} />
        {isFiltered && (
          <Button
            aria-label="Reset filters"
            variant="outline"
            size="sm"
            className="dy-border-dashed"
            onClick={() => table.resetColumnFilters()}
          >
            <X />
            Reset
          </Button>
        )}
        {table.getState().sorting.length > 0 && !isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="dy-h-8 dy-px-2"
            onClick={() => table.resetSorting()}
          >
            Reset sort
          </Button>
        )}
        {isFetching && (
          <div className="dy-flex dy-items-center dy-gap-1.5 dy-px-2 dy-py-1 dy-text-xs dy-text-muted-foreground dy-animate-fade-in">
            <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin dy-text-primary" />
            <span className="dy-hidden sm:dy-inline">Updating…</span>
          </div>
        )}
      </div>
      <div className="dy-flex dy-items-center dy-gap-2">
        {children}
      </div>
    </div>
  )
}

interface ToolbarFacetedFilterProps<TData> {
  column: Column<TData>
}

function ToolbarFacetedFilter<TData>({ column }: ToolbarFacetedFilterProps<TData>) {
  const meta = column.columnDef.meta as any
  if (!meta?.variant || !meta.options?.length) return null
  return (
    <DataTableFacetedFilter
      column={column}
      title={meta.label ?? column.id}
      options={meta.options}
      multiple={meta.variant === "multiSelect"}
    />
  )
}
