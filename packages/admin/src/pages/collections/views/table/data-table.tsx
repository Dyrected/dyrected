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
      <div className="dy-overflow-hidden dy-rounded-md dy-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
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
                  className={onRowClick ? "dy-cursor-pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
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
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="dy-h-24 dy-text-center">
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
