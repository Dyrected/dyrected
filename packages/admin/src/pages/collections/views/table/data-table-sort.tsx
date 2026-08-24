import * as React from "react"
import type { Table } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, Check, X } from "lucide-react"

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

/**
 * Toolbar sort control — patterned after tablecn's DataTableSortList.
 * Single-sort today (serverSort uses the first entry), but UI mirrors the
 * multi-sort API so adding a second sort later is non-breaking.
 * Styled to sit alongside the existing dashed filter pills.
 */
export function DataTableSort<TData>({ table }: { table: Table<TData> }) {
  const [open, setOpen] = React.useState(false)
  const sorting = table.getState().sorting
  const active = sorting[0]

  const sortableColumns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter((col) => col.getCanSort())
        .map((col) => {
          const meta = col.columnDef.meta as any
          const label =
            (typeof col.columnDef.header === "string" && col.columnDef.header as string) ||
            (typeof meta?.label === "string" && meta.label as string) ||
            col.id
          return { col, id: col.id, label }
        }),
    [table],
  )

  const activeEntry = active ? sortableColumns.find((c) => c.id === active.id) : undefined

  const onSelect = (columnId: string) => {
    if (active?.id === columnId) {
      // Toggle direction on re-select of the same column
      table.setSorting([{ id: columnId, desc: !active.desc }])
    } else {
      table.setSorting([{ id: columnId, desc: false }])
    }
    setOpen(false)
  }

  const onToggleDirection = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!active) return
    table.setSorting([{ id: active.id, desc: !active.desc }])
  }

  const onClear = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    table.setSorting([])
  }

  // No sortable columns at all — don't render the control.
  if (sortableColumns.length === 0) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("dy-border-dashed dy-font-normal", active && "dy-bg-muted/60")}
        >
          {active ? (
            <>
              <span
                role="button"
                aria-label="Clear sort"
                tabIndex={0}
                onClick={onClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onClear(e as any)
                  }
                }}
                className="dy-rounded-sm dy-opacity-70 dy-transition-opacity hover:dy-opacity-100 focus-visible:dy-outline-none focus-visible:dy-ring-1 focus-visible:dy-ring-ring dy-cursor-pointer"
              >
                <X className="dy-h-3.5 dy-w-3.5" />
              </span>
              <span className="dy-hidden sm:dy-inline-flex">Sort:</span>
              <span className="dy-truncate dy-font-medium">{activeEntry?.label ?? active.id}</span>
              <Separator orientation="vertical" className="dy-mx-0.5 data-[orientation=vertical]:dy-h-4" />
              <Badge
                variant="secondary"
                className="dy-hidden dy-rounded-sm dy-px-1.5 dy-font-normal lg:dy-inline-flex"
              >
                {active.desc ? (
                  <span className="dy-inline-flex dy-items-center dy-gap-1">
                    <ArrowDown className="dy-h-3 dy-w-3" /> Desc
                  </span>
                ) : (
                  <span className="dy-inline-flex dy-items-center dy-gap-1">
                    <ArrowUp className="dy-h-3 dy-w-3" /> Asc
                  </span>
                )}
              </Badge>
              <span
                role="button"
                tabIndex={0}
                aria-label="Toggle sort direction"
                onClick={onToggleDirection}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onToggleDirection(e as any)
                  }
                }}
                className="dy-ml-0.5 dy-rounded-sm dy-p-0.5 hover:dy-bg-muted dy-cursor-pointer"
              >
                {active.desc ? (
                  <ArrowDown className="dy-h-3.5 dy-w-3.5" />
                ) : (
                  <ArrowUp className="dy-h-3.5 dy-w-3.5" />
                )}
              </span>
            </>
          ) : (
            <>
              <ArrowUpDown className="dy-h-3.5 dy-w-3.5" />
              Sort
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="dy-w-56 dy-p-0" align="start">
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList className="dy-max-h-full">
            <CommandEmpty>No sortable columns.</CommandEmpty>
            <CommandGroup className="dy-max-h-[260px] dy-overflow-y-auto dy-overflow-x-hidden">
              {sortableColumns.map(({ id, label }) => {
                const isActive = active?.id === id
                return (
                  <CommandItem
                    key={id}
                    value={label}
                    onSelect={() => onSelect(id)}
                    className="dy-flex dy-items-center dy-gap-2"
                  >
                    <div
                      className={cn(
                        "dy-flex dy-size-4 dy-items-center dy-justify-center dy-rounded-sm dy-border",
                        isActive ? "dy-bg-primary dy-text-primary-foreground dy-border-primary" : "dy-opacity-50",
                      )}
                    >
                      {isActive && <Check className="dy-h-3 dy-w-3" />}
                    </div>
                    <span className="dy-truncate dy-flex-1">{label}</span>
                    {isActive && (
                      <span className="dy-ml-auto dy-inline-flex dy-items-center dy-gap-1 dy-text-xs dy-text-muted-foreground">
                        {active.desc ? <ArrowDown className="dy-h-3 dy-w-3" /> : <ArrowUp className="dy-h-3 dy-w-3" />}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {active && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      table.setSorting([])
                      setOpen(false)
                    }}
                    className="dy-justify-center dy-text-center"
                  >
                    Clear sort
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
