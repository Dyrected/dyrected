import * as React from "react"
import type { Column } from "@tanstack/react-table"
import { Check, PlusCircle, XCircle } from "lucide-react"

import { Badge } from "../../../../components/ui/badge"
import { Button } from "../../../../components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../../../../components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover"
import { Separator } from "../../../../components/ui/separator"
import { cn } from "../../../../lib/utils"

export interface FacetedFilterOption {
  label: string
  value: string
  count?: number
}

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  options: FacetedFilterOption[]
  multiple?: boolean
}

/**
 * Multi-select filter pill with:
 * 1. Pinned selected section at the top of the popover.
 * 2. Inclusion and negation operator support (Is any of / Is not).
 * 3. Human-readable descriptive trigger badges (shows label for 1-2 items).
 * 4. Search and live badge counts.
 */
export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  multiple = true,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const [open, setOpen] = React.useState(false)

  const columnFilterValue = column?.getFilterValue()
  const { currentOperator, selectedValues } = React.useMemo(() => {
    if (!columnFilterValue) return { currentOperator: "in", selectedValues: new Set<string>() }
    if (
      typeof columnFilterValue === "object" &&
      !Array.isArray(columnFilterValue) &&
      "operator" in (columnFilterValue as any)
    ) {
      const op = (columnFilterValue as any).operator || "in"
      const val = (columnFilterValue as any).value
      const items = Array.isArray(val)
        ? val.map(String)
        : val !== undefined && val !== ""
          ? [String(val)]
          : []
      return { currentOperator: op, selectedValues: new Set(items) }
    }
    if (Array.isArray(columnFilterValue)) {
      return { currentOperator: "in", selectedValues: new Set(columnFilterValue.map(String)) }
    }
    return { currentOperator: "in", selectedValues: new Set([String(columnFilterValue)]) }
  }, [columnFilterValue])

  const setFilterState = React.useCallback(
    (newVals: string[], newOp: string = currentOperator) => {
      if (!column) return
      if (newVals.length === 0) {
        column.setFilterValue(undefined)
        return
      }
      if (newOp === "in") {
        column.setFilterValue(newVals)
      } else {
        column.setFilterValue({ operator: newOp, value: newVals })
      }
    },
    [column, currentOperator],
  )

  const onItemSelect = React.useCallback(
    (option: FacetedFilterOption, isSelected: boolean) => {
      if (!column) return

      if (multiple) {
        const next = new Set(selectedValues)
        if (isSelected) {
          next.delete(option.value)
        } else {
          next.add(option.value)
        }
        setFilterState(Array.from(next))
      } else {
        if (isSelected) {
          setFilterState([])
        } else {
          setFilterState([option.value])
          setOpen(false)
        }
      }
    },
    [column, multiple, selectedValues, setFilterState],
  )

  const onReset = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation()
      column?.setFilterValue(undefined)
    },
    [column],
  )

  // Split options into pinned selected and remaining options
  const { selectedOptions, unselectedOptions } = React.useMemo(() => {
    const sel: FacetedFilterOption[] = []
    const unsel: FacetedFilterOption[] = []
    for (const opt of options) {
      if (selectedValues.has(opt.value)) {
        sel.push(opt)
      } else {
        unsel.push(opt)
      }
    }
    return { selectedOptions: sel, unselectedOptions: unsel }
  }, [options, selectedValues])

  // Resolve human-readable labels for active trigger badges
  const selectedLabels = React.useMemo(() => {
    return Array.from(selectedValues).map((val) => {
      const match = options.find((o) => o.value === val)
      return match?.label || val
    })
  }, [selectedValues, options])

  const renderOptionItem = (option: FacetedFilterOption, isSelected: boolean) => (
    <CommandItem
      key={option.value}
      value={`${option.label} ${option.value}`}
      className="[&>svg:last-child]:dy-hidden"
      onSelect={() => onItemSelect(option, isSelected)}
    >
      <div
        className={cn(
          "dy-flex dy-size-4 dy-items-center dy-justify-center dy-rounded-sm dy-border dy-border-primary",
          isSelected
            ? "dy-bg-primary dy-text-primary-foreground"
            : "dy-opacity-50 [&_svg]:dy-invisible",
        )}
      >
        <Check className="dy-h-3 dy-w-3" />
      </div>
      <span className="dy-truncate">{option.label}</span>
      {option.count !== undefined && (
        <span className="dy-ml-auto dy-font-mono dy-text-xs">
          {option.count}
        </span>
      )}
    </CommandItem>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="dy-border-dashed dy-font-normal">
          {selectedValues.size > 0 ? (
            <span
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              className="dy-rounded-sm dy-opacity-70 dy-transition-opacity hover:dy-opacity-100 focus-visible:dy-outline-none focus-visible:dy-ring-1 focus-visible:dy-ring-ring dy-cursor-pointer"
              onClick={onReset}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onReset(e as any)
                }
              }}
            >
              <XCircle />
            </span>
          ) : (
            <PlusCircle />
          )}
          {title}
          {currentOperator === "not_in" && (
            <span className="dy-ml-1 dy-text-[10px] dy-font-medium dy-text-destructive dy-uppercase">
              (not)
            </span>
          )}
          {selectedValues.size > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="dy-mx-0.5 data-[orientation=vertical]:dy-h-4"
              />
              {selectedLabels.length <= 2 ? (
                <span className="dy-truncate dy-max-w-[180px] dy-text-xs dy-font-medium">
                  {selectedLabels.join(", ")}
                </span>
              ) : (
                <>
                  <Badge
                    variant="secondary"
                    className="dy-hidden dy-rounded-sm dy-px-1 dy-font-normal lg:dy-inline-flex"
                  >
                    {selectedValues.size}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="dy-rounded-sm dy-px-1 dy-font-normal lg:dy-hidden"
                  >
                    {selectedValues.size} selected
                  </Badge>
                </>
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="dy-w-56 dy-p-0" align="start">
        {/* Operator Switcher Pill */}
        <div className="dy-flex dy-items-center dy-justify-between dy-border-b dy-border-border/40 dy-px-3 dy-py-1.5 dy-bg-muted/20">
          <span className="dy-text-[11px] dy-font-medium dy-text-muted-foreground dy-uppercase dy-tracking-wider">
            Operator
          </span>
          <div className="dy-inline-flex dy-rounded-md dy-border dy-border-border/60 dy-bg-background dy-p-0.5">
            <button
              type="button"
              className={cn(
                "dy-rounded dy-px-2 dy-py-0.5 dy-text-xs dy-font-medium dy-transition-all",
                currentOperator === "in"
                  ? "dy-bg-primary dy-text-primary-foreground dy-shadow-xs"
                  : "dy-text-muted-foreground hover:dy-text-foreground",
              )}
              onClick={() => setFilterState(Array.from(selectedValues), "in")}
            >
              Is any of
            </button>
            <button
              type="button"
              className={cn(
                "dy-rounded dy-px-2 dy-py-0.5 dy-text-xs dy-font-medium dy-transition-all",
                currentOperator === "not_in"
                  ? "dy-bg-primary dy-text-primary-foreground dy-shadow-xs"
                  : "dy-text-muted-foreground hover:dy-text-foreground",
              )}
              onClick={() => setFilterState(Array.from(selectedValues), "not_in")}
            >
              Is not
            </button>
          </div>
        </div>

        <Command>
          <CommandInput placeholder={title} />
          <CommandList className="dy-max-h-full">
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Pinned Selected Items */}
            {selectedOptions.length > 0 && (
              <CommandGroup heading="Selected">
                {selectedOptions.map((opt) => renderOptionItem(opt, true))}
              </CommandGroup>
            )}

            {/* Remaining Options */}
            <CommandGroup
              heading={selectedOptions.length > 0 ? "Options" : undefined}
              className="dy-max-h-[240px] dy-scroll-py-1 dy-overflow-y-auto dy-overflow-x-hidden"
            >
              {unselectedOptions.map((opt) => renderOptionItem(opt, false))}
            </CommandGroup>

            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onReset()}
                    className="dy-justify-center dy-text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
