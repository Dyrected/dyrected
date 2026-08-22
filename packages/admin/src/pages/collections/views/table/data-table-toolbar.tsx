import * as React from "react"
import type { Column, Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { DataTableViewOptions } from "./data-table-view-options"
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
}

/**
 * Faceted filter bar: per-column filter controls plus a reset button.
 * Ported from tablecn's data-table architecture.
 */
export function DataTableToolbar<TData>({
  table,
  searchColumnId,
  searchPlaceholder = "Search...",
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

  const searchColumn = searchColumnId ? table.getColumn(searchColumnId) : undefined

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "dy-flex dy-w-full dy-items-start dy-justify-between dy-gap-2",
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
        {filterableColumns.map((column) => (
          <ToolbarFilter key={column.id} column={column} />
        ))}
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
      </div>
      <div className="dy-flex dy-items-center dy-gap-2">
        {children}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}

interface ToolbarFilterProps<TData> {
  column: Column<TData>
}

function ToolbarFilter<TData>({ column }: ToolbarFilterProps<TData>) {
  const meta = column.columnDef.meta as any
  const label = meta?.label ?? column.id

  if (!meta?.variant) return null

  switch (meta.variant) {
    case "text":
      return (
        <div className="dy-w-40 dy-shrink-0 lg:dy-w-56">
          <Input
            size="sm"
            placeholder={`Filter ${String(label).toLowerCase()}…`}
            value={(column.getFilterValue() as string) ?? ""}
            onChange={(event) => column.setFilterValue(event.target.value)}
            className={FILTER_INPUT_CLASSES}
          />
        </div>
      )
    case "number":
      return (
        <div className="dy-w-[120px] dy-shrink-0">
          <Input
            size="sm"
            type="number"
            inputMode="numeric"
            placeholder={`Filter ${String(label).toLowerCase()}…`}
            value={(column.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              column.setFilterValue(
                event.target.value === "" ? undefined : Number(event.target.value),
              )
            }
            className={cn(FILTER_INPUT_CLASSES, "dy-tabular-nums")}
          />
        </div>
      )
    case "multiSelect":
    case "select":
      return (
        <DataTableFacetedFilter
          column={column}
          title={label}
          options={meta.options ?? []}
          multiple={meta.variant === "multiSelect"}
        />
      )
    default:
      return null
  }
}
