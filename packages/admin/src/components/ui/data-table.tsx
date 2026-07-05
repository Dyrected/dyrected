"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table"

import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { Settings2 } from "lucide-react"
import { usePreferences } from "../../hooks/use-preferences"

const EMPTY_VISIBILITY: VisibilityState = {}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  rowSelection?: any
  onRowSelectionChange?: any
  bulkActions?: (selectedIds: string[]) => React.ReactNode
  toolbarActions?: React.ReactNode
  persistenceKey?: string
  initialColumnVisibility?: VisibilityState
  hideViewButton?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  rowSelection: externalRowSelection,
  onRowSelectionChange,
  bulkActions,
  toolbarActions,
  persistenceKey,
  initialColumnVisibility,
  hideViewButton = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] = usePreferences<VisibilityState>(
    persistenceKey ? `visibility_${persistenceKey}` : "temp_visibility",
    initialColumnVisibility ?? EMPTY_VISIBILITY
  )
  const [internalRowSelection, setInternalRowSelection] = React.useState({})

  const rowSelection = externalRowSelection || internalRowSelection
  const setRowSelection = onRowSelectionChange || setInternalRowSelection

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="dy-w-full dy-space-y-4">
      <div className="dy-flex dy-flex-col dy-gap-3 sm:dy-flex-row sm:dy-items-center sm:dy-gap-4">
        <div className={`dy-order-1 dy-grid dy-w-full dy-gap-2 sm:dy-order-3 sm:dy-ml-auto sm:dy-flex sm:dy-w-auto sm:dy-items-center ${toolbarActions ? (hideViewButton ? "dy-grid-cols-2" : "dy-grid-cols-3") : (hideViewButton ? "dy-grid-cols-1" : "dy-grid-cols-2")}`}>
          {toolbarActions}
          {!hideViewButton && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="dy-flex dy-h-9 dy-w-full dy-gap-2 sm:dy-h-8 sm:dy-w-auto">
                  <Settings2 className="dy-h-4 dy-w-4" />
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="dy-capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {searchKey && (() => {
          const col = table.getColumn(searchKey)
          const searchLabel = col && typeof col.columnDef.header === "string" ? col.columnDef.header : searchKey
          return (
            <Input
              placeholder={`Search by ${searchLabel.toLowerCase()}...`}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="dy-order-2 dy-h-9 dy-w-full sm:dy-order-1 sm:dy-max-w-sm"
            />
          )
        })()}
        {bulkActions && table.getFilteredSelectedRowModel().rows.length > 0 && (
          <div className="dy-order-3 dy-flex dy-w-full dy-items-center dy-gap-2 dy-animate-in dy-slide-in-from-left-2 sm:dy-order-2 sm:dy-w-auto">
            {bulkActions(
              table
                .getFilteredSelectedRowModel()
                .rows.map((r) => (r.original as any).id)
            )}
          </div>
        )}
      </div>
      <div className="dy-overflow-x-auto dy-rounded-2xl dy-border dy-border-border/50 dy-bg-card dy-shadow-sm">
        <Table className="dy-min-w-[720px]">
          <TableHeader className="dy-bg-muted/20">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground dy-py-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:dy-bg-muted/30 dy-border-b dy-border-border/30 last:dy-border-b-0 dy-transition-colors dy-duration-200"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="dy-py-2.5 dy-px-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="dy-h-24 dy-text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
