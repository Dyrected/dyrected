import type { Table } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { Button } from "../../../../components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  pageSizeOptions?: number[]
}

/**
 * Client-side pagination with page-size selection.
 * Ported from tablecn's data-table architecture.
 */
export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 50],
}: DataTablePaginationProps<TData>) {
  return (
    <div className="dy-flex dy-items-center dy-justify-between dy-gap-2 dy-overflow-auto">
      <div className="dy-flex dy-items-center dy-gap-3">
        <p className="dy-whitespace-nowrap dy-text-xs dy-font-medium dy-text-muted-foreground">
          Rows per page
        </p>
        <Select
          value={`${table.getState().pagination.pageSize}`}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger className="dy-h-8 dy-w-[4.5rem] [&[data-state=open]>svg]:dy-rotate-180">
            <SelectValue placeholder={table.getState().pagination.pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {pageSizeOptions.map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="dy-flex dy-items-center dy-gap-4 lg:dy-gap-6">
        <p className="dy-whitespace-nowrap dy-text-xs dy-font-medium dy-text-muted-foreground dy-tabular-nums">
          {table.getFilteredSelectedRowModel().rows.length > 0 &&
            `${table.getFilteredSelectedRowModel().rows.length} of `}
          {table.getFilteredRowModel().rows.length} row(s)
        </p>
        <div className="dy-flex dy-items-center dy-gap-1.5">
          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon"
            className="dy-hidden dy-h-8 dy-w-8 lg:dy-flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft />
          </Button>
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            className="dy-h-8 dy-w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            className="dy-h-8 dy-w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>
          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon"
            className="dy-hidden dy-h-8 dy-w-8 lg:dy-flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
