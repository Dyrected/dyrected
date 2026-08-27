import * as React from "react"
import type { Table } from "@tanstack/react-table"
import { X, Loader2, ChevronDown, Check } from "lucide-react"

import { DataTableFilterMenu } from "./data-table-filter-menu"
import { DataTableSort } from "./data-table-sort"
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu"
import { cn } from "../../../../lib/utils"

/**
 * Shared look for toolbar filter controls: dashed border + muted background so
 * filters read as optional controls rather than required form fields.
 */
export const FILTER_INPUT_CLASSES = "dy-border-dashed dy-bg-muted/40 hover:dy-bg-muted/60 focus-visible:dy-bg-background"

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>
  /** Column id to bind the search input to (single column fallback). */
  searchColumnId?: string
  /** Global search input value */
  searchValue?: string
  /** Global search change handler */
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Active group-by field name */
  groupBy?: string
  /** Eligible fields to group by */
  groupByOptions?: Array<{ value: string; label: string }>
  /** Handler when groupBy changes */
  onGroupByChange?: (value: string | undefined) => void
  /** Whether a background query/refetch is in flight. */
  isFetching?: boolean
  joinOperator?: "and" | "or"
  onJoinOperatorChange?: (op: "and" | "or") => void
}

/**
 * Faceted filter bar: per-column filter controls plus a reset button.
 * Ported from tablecn's data-table architecture.
 */
export function DataTableToolbar<TData>({
  table,
  searchColumnId,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  groupBy,
  groupByOptions,
  onGroupByChange,
  isFetching,
  joinOperator = "and",
  onJoinOperatorChange,
  children,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || Boolean(searchValue)

  const searchColumn = searchColumnId ? table.getColumn(searchColumnId) : undefined
  const showSearchInput = onSearchChange !== undefined || searchValue !== undefined || searchColumn !== undefined
  const currentSearchValue = searchValue !== undefined ? searchValue : ((searchColumn?.getFilterValue() as string) ?? "")

  const handleSearchCommit = React.useCallback(
    (val: string) => {
      if (onSearchChange) {
        onSearchChange(val)
      } else if (searchColumn) {
        searchColumn.setFilterValue(val)
      }
    },
    [onSearchChange, searchColumn],
  )

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "dy-flex dy-flex-col sm:dy-flex-row sm:dy-items-center dy-justify-between dy-gap-2.5 dy-w-full",
        className,
      )}
      {...props}
    >
      <div className="dy-flex dy-flex-1 dy-flex-wrap dy-items-center dy-gap-2 dy-min-w-0">
        {showSearchInput && (
          <div className="dy-w-full sm:dy-w-44 lg:dy-w-56">
            <DebouncedToolbarSearchInput
              placeholder={searchPlaceholder}
              value={currentSearchValue}
              onChange={handleSearchCommit}
              className={FILTER_INPUT_CLASSES}
            />
          </div>
        )}
        <DataTableFilterMenu table={table} excludeColumnIds={searchColumnId ? [searchColumnId] : []} />
        {table.getState().columnFilters.length >= 2 && onJoinOperatorChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "dy-h-8 dy-gap-1.5 dy-border-dashed dy-px-2.5 dy-text-xs dy-font-normal",
                  FILTER_INPUT_CLASSES,
                )}
                aria-label="Filter matching logic"
              >
                <span className="dy-text-muted-foreground">Match:</span>
                <span className="dy-font-medium dy-text-foreground">
                  {joinOperator === "or" ? "Any (OR)" : "All (AND)"}
                </span>
                <ChevronDown className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="dy-w-52">
              <DropdownMenuItem
                onClick={() => onJoinOperatorChange("and")}
                className="dy-cursor-pointer dy-flex dy-items-center dy-justify-between"
              >
                <div className="dy-flex dy-flex-col">
                  <span className="dy-font-medium">Match All</span>
                  <span className="dy-text-[11px] dy-text-muted-foreground">Must satisfy every filter (AND)</span>
                </div>
                {joinOperator === "and" && <Check className="dy-h-4 dy-w-4 dy-text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onJoinOperatorChange("or")}
                className="dy-cursor-pointer dy-flex dy-items-center dy-justify-between"
              >
                <div className="dy-flex dy-flex-col">
                  <span className="dy-font-medium">Match Any</span>
                  <span className="dy-text-[11px] dy-text-muted-foreground">Satisfies at least one filter (OR)</span>
                </div>
                {joinOperator === "or" && <Check className="dy-h-4 dy-w-4 dy-text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {groupByOptions && groupByOptions.length > 0 && onGroupByChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "dy-h-8 dy-gap-1.5 dy-border-dashed dy-px-2.5 dy-text-xs dy-font-normal",
                  FILTER_INPUT_CLASSES,
                )}
                aria-label="Group table by field"
              >
                <span className="dy-text-muted-foreground">Group:</span>
                <span className="dy-font-medium dy-text-foreground">
                  {groupBy ? (groupByOptions.find((o) => o.value === groupBy)?.label ?? groupBy) : "None"}
                </span>
                <ChevronDown className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="dy-w-48">
              <DropdownMenuItem
                onClick={() => onGroupByChange(undefined)}
                className="dy-cursor-pointer dy-flex dy-items-center dy-justify-between"
              >
                <span>None (flat list)</span>
                {!groupBy && <Check className="dy-h-4 dy-w-4 dy-text-primary" />}
              </DropdownMenuItem>
              {groupByOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => onGroupByChange(opt.value)}
                  className="dy-cursor-pointer dy-flex dy-items-center dy-justify-between"
                >
                  <span>{opt.label}</span>
                  {groupBy === opt.value && <Check className="dy-h-4 dy-w-4 dy-text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <DataTableSort table={table} />
        {isFiltered && (
          <Button
            aria-label="Reset filters"
            variant="outline"
            size="sm"
            className="dy-border-dashed"
            onClick={() => {
              table.resetColumnFilters()
              if (onSearchChange) onSearchChange("")
            }}
          >
            <X className="dy-h-3.5 dy-w-3.5" />
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
      {children && (
        <div className="dy-flex dy-items-center dy-gap-2 dy-self-end sm:dy-self-center dy-shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}

function DebouncedToolbarSearchInput({
  value: initialValue = "",
  onChange,
  placeholder,
  className,
  debounce = 250,
}: {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  debounce?: number
}) {
  const [value, setValue] = React.useState(initialValue)
  const prevInitialValueRef = React.useRef(initialValue)

  React.useEffect(() => {
    if (prevInitialValueRef.current !== initialValue) {
      prevInitialValueRef.current = initialValue
      setValue((prev) => (prev === initialValue ? prev : initialValue))
    }
  }, [initialValue])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== initialValue) {
        onChange(value)
      }
    }, debounce)
    return () => clearTimeout(timer)
  }, [value, debounce, onChange, initialValue])

  return (
    <Input
      size="sm"
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className={className}
    />
  )
}

