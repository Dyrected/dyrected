import * as React from "react"
import type { Column, Table } from "@tanstack/react-table"
import { BadgeCheck, CalendarIcon, ListFilter, X } from "lucide-react"

import { Button } from "../../../../components/ui/button"
import { Calendar } from "../../../../components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../../components/ui/command"
import { Input } from "../../../../components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select"
import { cn } from "../../../../lib/utils"
import type { OperatorFilterValue } from "../build-view-columns"
import type { ViewColumnMeta } from "../types"
import { getDefaultFilterOperator, getFilterOperators, type FilterOperatorOption } from "./filter-operators"

/**
 * Command-based filter menu ported from tablecn's `data-table-filter-menu`:
 * one "Filter" trigger opens a searchable field list; picking a field shows a
 * variant-aware value selector. Applied filters render as segmented pills
 * ([field] [operator] [value] [×]) that stay inline-editable.
 *
 * Filters are stored in TanStack's columnFilters state — the value is an
 * `{ operator, value, value2? }` object interpreted by the operator filter
 * functions attached in `buildViewColumns`.
 */
export function DataTableFilterMenu<TData>({
  table,
  excludeColumnIds = [],
}: {
  table: Table<TData>
  /** Column ids handled elsewhere (e.g. the global search binding). */
  excludeColumnIds?: string[]
}) {
  const [open, setOpen] = React.useState(false)
  const [selectedColumnId, setSelectedColumnId] = React.useState<string | null>(null)
  const [inputValue, setInputValue] = React.useState("")

  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter((column) => {
          const meta = column.columnDef.meta as ViewColumnMeta | undefined
          return (
            column.getCanFilter() &&
            !!meta?.variant &&
            meta.variant !== "multiSelect" &&
            !excludeColumnIds.includes(column.id)
          )
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table],
  )

  const selectedColumn = selectedColumnId
    ? (columns.find((column) => column.id === selectedColumnId) ?? null)
    : null

  const closeAndReset = () => {
    setOpen(false)
    setTimeout(() => {
      setSelectedColumnId(null)
      setInputValue("")
    }, 100)
  }

  const onFilterAdd = (column: Column<TData>, rawValue: string) => {
    if (!rawValue.trim()) return
    const meta = column.columnDef.meta as ViewColumnMeta
    column.setFilterValue({
      operator: getDefaultFilterOperator(meta?.variant ?? "text"),
      value: meta?.variant === "number" ? Number(rawValue) : rawValue,
    })
    closeAndReset()
  }

  const activeFilters = table
    .getState()
    .columnFilters.filter((entry) => columns.some((column) => column.id === entry.id))

  return (
    <div className="dy-flex dy-flex-wrap dy-items-center dy-gap-2">
      {activeFilters.map((entry) => (
        <FilterPill
          key={entry.id}
          filter={entry as { id: string; value: unknown }}
          columns={columns}
          onUpdate={(patch) => {
            const column = table.getColumn(entry.id)
            const current = (column?.getFilterValue() ?? {}) as OperatorFilterValue
            column?.setFilterValue({ ...current, ...patch })
          }}
          onMoveTo={(targetColumn) => {
            const targetMeta = targetColumn.columnDef.meta as ViewColumnMeta
            table.setColumnFilters((prev) => [
              ...prev.filter((item) => item.id !== entry.id),
              {
                id: targetColumn.id,
                value: {
                  operator: getDefaultFilterOperator(targetMeta.variant ?? "text"),
                  value: undefined,
                  value2: undefined,
                },
              },
            ])
          }}
          onRemove={() => {
            table.setColumnFilters((prev) => prev.filter((item) => item.id !== entry.id))
          }}
        />
      ))}
      {activeFilters.length > 0 && (
        <Button
          aria-label="Reset all filters"
          variant="outline"
          size="icon"
          onClick={() => table.resetColumnFilters()}
        >
          <X />
        </Button>
      )}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) closeAndReset()
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="dy-border-dashed dy-font-normal">
            <ListFilter />
            Filter{activeFilters.length > 0 ? ` (${activeFilters.length})` : ""}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="dy-w-64 dy-p-0" align="start">
          <Command loop>
            <CommandInput
              placeholder={selectedColumn ? "Enter a value…" : "Search fields…"}
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {selectedColumn ? (
                <FilterValueSelector
                  column={selectedColumn}
                  value={inputValue}
                  onSelect={(value) => onFilterAdd(selectedColumn, value)}
                />
              ) : (
                <>
                  <CommandEmpty>No fields found.</CommandEmpty>
                  <CommandGroup>
                    {columns.map((column) => (
                      <CommandItem
                        key={column.id}
                        value={column.id}
                        onSelect={() => {
                          setSelectedColumnId(column.id)
                          setInputValue("")
                        }}
                      >
                        <span className="dy-truncate">
                          {(column.columnDef.meta as ViewColumnMeta)?.label ?? column.id}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface FilterEntry {
  id: string
  value: unknown
}

interface FilterPillProps<TData> {
  filter: FilterEntry
  columns: Column<TData>[]
  onUpdate: (patch: Partial<OperatorFilterValue>) => void
  onMoveTo: (targetColumn: Column<TData>) => void
  onRemove: () => void
}

function FilterPill<TData>({ filter, columns, onUpdate, onMoveTo, onRemove }: FilterPillProps<TData>) {
  const [showFieldSelector, setShowFieldSelector] = React.useState(false)

  const column = columns.find((candidate) => candidate.id === filter.id)
  if (!column) return null

  const meta = column.columnDef.meta as ViewColumnMeta
  const variant = meta.variant ?? "text"
  const state = (filter.value ?? {}) as OperatorFilterValue
  const operators = getFilterOperators(variant)
  const operatorLabel =
    operators.find((candidate) => candidate.value === state.operator)?.label ??
    getDefaultFilterOperator(variant)

  return (
    <div
      role="listitem"
      className="dy-flex dy-h-9 dy-items-center dy-rounded-md dy-bg-background dy-shadow-sm"
    >
      {/* Field selector */}
      <Popover open={showFieldSelector} onOpenChange={setShowFieldSelector}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="dy-rounded-none dy-rounded-l-md dy-border dy-border-r-0 dy-border-border/50 dy-font-normal"
          >
            {meta.label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="dy-w-48 dy-p-0">
          <Command loop>
            <CommandInput placeholder="Search fields…" />
            <CommandList>
              <CommandEmpty>No fields found.</CommandEmpty>
              <CommandGroup>
                {columns.map((candidate) => (
                  <CommandItem
                    key={candidate.id}
                    value={candidate.id}
                    data-checked={candidate.id === filter.id}
                    onSelect={() => {
                      onMoveTo(candidate)
                      setShowFieldSelector(false)
                    }}
                  >
                    <span className="dy-truncate">
                      {(candidate.columnDef.meta as ViewColumnMeta).label}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Operator selector */}
      <Select
        value={state.operator || getDefaultFilterOperator(variant)}
        onValueChange={(value: string) =>
          onUpdate({
            operator: value,
            ...(value === "isEmpty" || value === "isNotEmpty"
              ? { value: undefined, value2: undefined }
              : {}),
          })
        }
      >
        <SelectTrigger
          className="dy-h-full dy-rounded-none dy-border-y dy-border-border/50 [&_svg]:dy-hidden dy-w-auto dy-gap-1 dy-px-2.5 dy-lowercase"
          aria-label={`Operator for ${meta.label}`}
        >
          <SelectValue placeholder={operatorLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {operators.map((operator: FilterOperatorOption) => (
              <SelectItem key={operator.value} className="dy-lowercase" value={operator.value}>
                {operator.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Value editor */}
      <FilterValueEditor
        filter={filter}
        column={column}
        variant={variant}
        operator={state.operator || getDefaultFilterOperator(variant)}
        onUpdate={onUpdate}
      />

      {/* Remove */}
      <Button
        variant="ghost"
        aria-label={`Remove ${meta.label} filter`}
        className="dy-h-full dy-rounded-none dy-rounded-r-md dy-border dy-border-l-0 dy-border-border/50 dy-px-1.5"
        onClick={onRemove}
      >
        <X />
      </Button>
    </div>
  )
}

const VALUELESS_OPERATORS = new Set(["isEmpty", "isNotEmpty"])

interface FilterValueEditorProps<TData> {
  filter: FilterEntry
  column: Column<TData>
  variant: string
  operator: string
  onUpdate: (patch: Partial<OperatorFilterValue>) => void
}

/** Inline, always-editable value segment of the filter pill. */
function FilterValueEditor<TData>({
  filter,
  column,
  variant,
  operator,
  onUpdate,
}: FilterValueEditorProps<TData>) {
  const [showOptions, setShowOptions] = React.useState(false)
  const inputId = `${filter.id}-filter-value`

  if (VALUELESS_OPERATORS.has(operator)) {
    return (
      <div
        id={inputId}
        role="status"
        aria-label={`${column.id} filter is ${operator === "isEmpty" ? "empty" : "not empty"}`}
        className="dy-h-full dy-w-14 dy-rounded-none dy-border dy-border-border/50 dy-px-1.5"
      />
    )
  }

  const state = (filter.value ?? {}) as OperatorFilterValue
  const stringValue = typeof state.value === "string" ? state.value : ""

  if (variant === "date") {
    const dateValue = stringValue ? new Date(stringValue) : undefined
    return (
      <Popover open={showOptions} onOpenChange={setShowOptions}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "dy-h-full dy-rounded-none dy-border dy-border-border/50 dy-px-2 dy-font-normal",
              !stringValue && "dy-text-muted-foreground",
            )}
          >
            <CalendarIcon />
            <span className="dy-truncate dy-text-xs">
              {dateValue ? dateValue.toLocaleDateString() : "Pick a date…"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="dy-w-auto dy-p-0">
          <Calendar
            mode="single"
            selected={dateValue}
            defaultMonth={dateValue}
            onSelect={(date) => onUpdate({ value: date ? date.toISOString() : "" })}
          />
        </PopoverContent>
      </Popover>
    )
  }

  if (operator === "isBetween") {
    const second = typeof state.value2 === "string" ? state.value2 : ""
    return (
      <div className="dy-flex dy-items-center">
        <Input
          size="sm"
          type="number"
          aria-label="Minimum value"
          placeholder="Min"
          className="dy-h-full dy-w-20 dy-rounded-none dy-border-y-0 dy-tabular-nums"
          defaultValue={stringValue}
          onChange={(event) => onUpdate({ value: event.target.value })}
        />
        <span className="dy-px-1 dy-text-xs dy-text-muted-foreground">and</span>
        <Input
          size="sm"
          type="number"
          aria-label="Maximum value"
          placeholder="Max"
          className="dy-h-full dy-w-20 dy-rounded-none dy-border-y-0 dy-tabular-nums"
          defaultValue={second}
          onChange={(event) => onUpdate({ value2: event.target.value })}
        />
      </div>
    )
  }

  return (
    <Input
      id={inputId}
      size="sm"
      type={variant === "number" ? "number" : "text"}
      inputMode={variant === "number" ? "numeric" : undefined}
      placeholder="Enter value…"
      className="dy-h-full dy-w-28 dy-rounded-none dy-border-y-0"
      defaultValue={stringValue}
      onChange={(event) =>
        onUpdate(
          variant === "number"
            ? { value: event.target.value === "" ? undefined : Number(event.target.value) }
            : { value: event.target.value },
        )
      }
    />
  )
}

interface FilterValueSelectorProps<TData> {
  column: Column<TData>
  value: string
  onSelect: (value: string) => void
}

/** Second stage of the command popover: choose the initial value. */
function FilterValueSelector<TData>({ column, value, onSelect }: FilterValueSelectorProps<TData>) {
  const meta = column.columnDef.meta as ViewColumnMeta
  const isEmpty = !value.trim()

  switch (meta.variant) {
    case "number": {
      const numeric = Number(value)
      return (
        <CommandGroup>
          <CommandItem
            value={value}
            onSelect={() => onSelect(value)}
            disabled={!value.trim() || Number.isNaN(numeric)}
          >
            {isEmpty ? (
              <>
                <BadgeCheck />
                <span>Type to add filter...</span>
              </>
            ) : (
              <>
                <BadgeCheck />
                <span className="dy-truncate">Filter by &quot;{value}&quot;</span>
              </>
            )}
          </CommandItem>
        </CommandGroup>
      )
    }
    case "date": {
      return (
        <div className="dy-p-1">
          <Calendar
            mode="single"
            selected={value ? new Date(value) : undefined}
            onSelect={(date) => onSelect(date ? date.toISOString() : "")}
          />
        </div>
      )
    }
    default: {
      return (
        <CommandGroup>
          <CommandItem value={value} onSelect={() => onSelect(value)} disabled={isEmpty}>
            <BadgeCheck />
            <span className="dy-truncate">
              {isEmpty ? "Type to add filter..." : `Filter by "${value}"`}
            </span>
          </CommandItem>
        </CommandGroup>
      )
    }
  }
}
