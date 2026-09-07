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
  pageSizeOptions = [10, 20, 30, 50, 100],
}: DataTablePaginationProps<TData>) {
  const pageIndex = table.getState().pagination.pageIndex + 1
  const pageCount = Math.max(table.getPageCount(), 1)
  const totalRows = table.getRowCount()
  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  return (
    <div className="dy-flex dy-flex-wrap dy-items-center dy-justify-between dy-gap-3 dy-px-1 dy-py-1">
      {/* Left side: Rows per page + Selection / Row count */}
      <div className="dy-flex dy-items-center dy-gap-3 sm:dy-gap-4">
        <div className="dy-flex dy-items-center dy-gap-2">
          <p className="dy-whitespace-nowrap dy-text-xs dy-font-medium dy-text-muted-foreground">
            Rows per page
          </p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="dy-h-8 dy-w-[4.5rem] dy-text-xs [&[data-state=open]>svg]:dy-rotate-180">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`} className="dy-text-xs">
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="dy-whitespace-nowrap dy-text-xs dy-font-medium dy-text-muted-foreground dy-tabular-nums">
          {selectedCount > 0 ? (
            <span>
              {selectedCount} of {totalRows} selected
            </span>
          ) : (
            <span>
              {totalRows} {totalRows === 1 ? "row" : "rows"}
            </span>
          )}
        </p>
      </div>

      {/* Right side: Page X of Y + Navigation buttons */}
      <div className="dy-flex dy-items-center dy-gap-3 sm:dy-gap-5">
        <div className="dy-flex dy-items-center dy-gap-1.5 dy-rounded-md dy-border dy-border-border/50 dy-bg-muted/40 dy-px-2.5 dy-py-1 dy-text-xs dy-font-medium dy-text-foreground dy-tabular-nums">
          <span className="dy-text-muted-foreground">Page</span>
          <span className="dy-font-semibold dy-text-foreground">{pageIndex}</span>
          <span className="dy-text-muted-foreground">of</span>
          <span className="dy-font-semibold dy-text-foreground">{pageCount}</span>
        </div>

        <div className="dy-flex dy-items-center dy-gap-1">
          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon"
            className="dy-hidden dy-h-8 dy-w-8 sm:dy-flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="dy-h-4 dy-w-4" />
          </Button>
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            className="dy-h-8 dy-w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="dy-h-4 dy-w-4" />
          </Button>
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            className="dy-h-8 dy-w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="dy-h-4 dy-w-4" />
          </Button>
          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon"
            className="dy-hidden dy-h-8 dy-w-8 sm:dy-flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="dy-h-4 dy-w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
