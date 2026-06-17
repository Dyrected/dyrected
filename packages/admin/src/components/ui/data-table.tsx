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
  getPaginationRowModel,
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
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react"
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
    getPaginationRowModel: getPaginationRowModel(),
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
        <div className={`dy-order-1 dy-grid dy-w-full dy-gap-2 sm:dy-order-3 sm:dy-ml-auto sm:dy-flex sm:dy-w-auto sm:dy-items-center ${toolbarActions ? "dy-grid-cols-3" : "dy-grid-cols-1"}`}>
          {toolbarActions}
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
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {searchKey && (
          <Input
            placeholder={`Search ${searchKey}...`}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="dy-order-2 dy-h-9 dy-w-full sm:dy-order-1 sm:dy-max-w-sm"
          />
        )}
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
      <div className="dy-overflow-x-auto dy-rounded-md dy-border dy-border-border/40">
        <Table className="dy-min-w-[720px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
          <TableBody className="dy-border-t dy-border-border/40">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="dy-border-none even:dy-bg-primary/[0.03] hover:dy-bg-primary/[0.06] dy-transition-colors dy-duration-200"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="dy-py-4 dy-px-4 dy-border-none first:dy-pl-4 last:dy-pr-4">
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
      <div className="dy-flex dy-flex-col dy-gap-3 dy-px-2 sm:dy-flex-row sm:dy-items-center sm:dy-justify-between">
        <div className="dy-flex-1 dy-text-xs dy-text-muted-foreground sm:dy-text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="dy-flex dy-items-center dy-justify-between dy-gap-2 sm:dy-justify-end">
          <Button
            variant="outline"
            size="sm"
            className="dy-h-9 dy-w-9 dy-p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="dy-h-4 dy-w-4" />
          </Button>
          <span className="dy-min-w-0 dy-text-center dy-text-xs dy-font-medium sm:dy-text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="dy-h-9 dy-w-9 dy-p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="dy-h-4 dy-w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
