import type { Table as TanstackTable } from "@tanstack/react-table"
import { flexRender } from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table"
import { cn } from "../../../../lib/utils"
import { DataTablePagination } from "./data-table-pagination"

interface DataTableProps<TData> {
  table: TanstackTable<TData>
  /** Rendered under the table while rows are selected (floating bulk bar). */
  actionBar?: React.ReactNode
  onRowClick?: (row: TData) => void
}

/**
 * TanStack table renderer with client-side filtering, sorting and pagination.
 * Ported from tablecn's data-table architecture.
 */
export function DataTable<TData>({ table, actionBar, onRowClick }: DataTableProps<TData>) {
  const rows = table.getRowModel().rows

  return (
    <div className="dy-flex dy-w-full dy-flex-col dy-gap-2.5">
      <div className="dy-relative dy-overflow-x-auto dy-rounded-2xl dy-border dy-border-border/50 dy-bg-card dy-shadow-sm">
        <Table className="dy-min-w-[720px]">
          <TableHeader className="dy-bg-muted/20">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className="dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground dy-py-3"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "hover:dy-bg-muted/30 dy-border-b dy-border-border/30 last:dy-border-b-0 dy-transition-colors dy-duration-200",
                    onRowClick && "dy-cursor-pointer",
                  )}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="dy-py-2.5 dy-px-4"
                      onClick={
                        cell.column.id === "select" || (cell.column.columnDef.meta as any)?.__isActions
                          ? (event) => event.stopPropagation()
                          : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:dy-bg-transparent">
                <TableCell colSpan={table.getAllColumns().length} className="dy-h-24 dy-text-center dy-text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="dy-flex dy-flex-col dy-gap-2.5">
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}
