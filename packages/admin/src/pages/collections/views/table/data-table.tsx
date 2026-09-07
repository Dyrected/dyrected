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
  /** Whether a background query/refetch is in flight. */
  isFetching?: boolean
}

/**
 * TanStack table renderer with server/client filtering, sorting and pagination.
 * Ported from tablecn's data-table architecture.
 */
export function DataTable<TData>({ table, actionBar, onRowClick, isFetching }: DataTableProps<TData>) {
  const rows = table.getRowModel().rows

  return (
    <div className="dy-flex dy-w-full dy-flex-col dy-gap-2.5">
      <div className="dy-relative dy-w-full">
        {isFetching && (
          <div className="dy-absolute dy-top-0 dy-left-0 dy-right-0 dy-h-[2px] dy-bg-primary/20 dy-overflow-hidden dy-z-40">
            <div className="dy-h-full dy-w-full dy-bg-primary dy-animate-pulse" />
          </div>
        )}
        <Table
          containerClassName="dy-max-h-[calc(100dvh-220px)] sm:dy-max-h-[640px] dy-rounded-2xl dy-border dy-border-border/50 dy-bg-card dy-shadow-sm [touch-action:auto]"
          className="dy-table-fixed dy-w-full dy-border-collapse dy-caption-bottom dy-text-sm"
          style={{ width: `${table.getTotalSize()}px`, minWidth: "100%" }}
        >
          <TableHeader className="dy-sticky dy-top-0 dy-z-20 dy-bg-muted/95 dy-backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="dy-border-b dy-border-border/60 hover:dy-bg-transparent">
                {headerGroup.headers.map((header) => {
                  const isSelect = header.id === "select"

                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{
                        width: isSelect ? "40px" : `${header.getSize()}px`,
                        minWidth: isSelect ? "40px" : `${header.column.columnDef.minSize ?? 80}px`,
                        maxWidth: isSelect ? "40px" : undefined,
                      }}
                      className={cn(
                        "dy-group/th dy-sticky dy-top-0 dy-z-20 dy-bg-muted/95 dy-backdrop-blur-sm dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground dy-py-3 dy-border-b dy-border-border/60",
                        isSelect && "dy-sticky dy-left-0 dy-z-30 dy-bg-muted/95 dy-w-10 dy-min-w-[40px] dy-max-w-[40px] dy-px-3 dy-text-center",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}

                      {/* Interactive column resize handle */}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            header.getResizeHandler()(e)
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation()
                            header.getResizeHandler()(e)
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            header.column.resetSize()
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "dy-absolute dy-top-0 dy-right-0 dy-h-full dy-w-3 dy-cursor-col-resize dy-select-none dy-touch-none group-hover/th:dy-bg-primary/40 hover:!dy-bg-primary dy-z-30",
                            header.column.getIsResizing() && "dy-bg-primary dy-w-1.5",
                          )}
                        />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={cn(isFetching && "dy-opacity-70 dy-transition-opacity")}>
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
                  {row.getVisibleCells().map((cell) => {
                    const isSelect = cell.column.id === "select"

                    return (
                      <TableCell
                        key={cell.id}
                        style={{
                          width: isSelect ? "40px" : `${cell.column.getSize()}px`,
                          minWidth: isSelect ? "40px" : `${cell.column.columnDef.minSize ?? 80}px`,
                          maxWidth: isSelect ? "40px" : undefined,
                        }}
                        className={cn(
                          "dy-py-2.5 dy-px-4",
                          isSelect && "dy-sticky dy-left-0 dy-z-10 dy-bg-card/95 dy-backdrop-blur-sm dy-w-10 dy-min-w-[40px] dy-max-w-[40px] dy-px-3 dy-text-center",
                        )}
                        onClick={
                          isSelect || (cell.column.columnDef.meta as any)?.__isActions
                            ? (event) => event.stopPropagation()
                            : undefined
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
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
