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
 * Multi-select filter pill with search and live badge counts.
 * Ported from tablecn's data-table architecture.
 */
export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  multiple = true,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const [open, setOpen] = React.useState(false)

  const columnFilterValue = column?.getFilterValue()
  const selectedValues = React.useMemo(
    () => new Set(Array.isArray(columnFilterValue) ? columnFilterValue : []),
    [columnFilterValue],
  )

  const onItemSelect = React.useCallback(
    (option: FacetedFilterOption, isSelected: boolean) => {
      if (!column) return

      if (multiple) {
        const newSelectedValues = new Set(selectedValues)
        if (isSelected) {
          newSelectedValues.delete(option.value)
        } else {
          newSelectedValues.add(option.value)
        }
        const filterValues = Array.from(newSelectedValues)
        column.setFilterValue(filterValues.length ? filterValues : undefined)
      } else {
        column.setFilterValue(isSelected ? undefined : [option.value])
        setOpen(false)
      }
    },
    [column, multiple, selectedValues],
  )

  const onReset = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation()
      column?.setFilterValue(undefined)
    },
    [column],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="dy-h-8 dy-border-dashed dy-font-normal">
          {selectedValues?.size > 0 ? (
            <div
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              className="dy-rounded-sm dy-opacity-70 dy-transition-opacity hover:dy-opacity-100 focus-visible:dy-outline-none focus-visible:dy-ring-1 focus-visible:dy-ring-ring"
              onClick={onReset}
            >
              <XCircle />
            </div>
          ) : (
            <PlusCircle />
          )}
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="dy-mx-0.5 data-[orientation=vertical]:dy-h-4"
              />
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
        </Button>
      </PopoverTrigger>
      <PopoverContent className="dy-w-52 dy-p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList className="dy-max-h-full">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="dy-max-h-[300px] dy-scroll-py-1 dy-overflow-y-auto dy-overflow-x-hidden">
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)

                return (
                  <CommandItem
                    key={option.value}
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
              })}
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
