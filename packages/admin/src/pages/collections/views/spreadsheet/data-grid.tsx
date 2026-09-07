import * as React from "react"
import type { Table as TanstackTable } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, Plus } from "lucide-react"

import {
  CheckboxCell,
  DateCell,
  ImageCell,
  ImagesCell,
  LongTextCell,
  MultiSelectCell,
  NumberCell,
  ReadonlyLinkCell,
  RelationshipCell,
  RelationshipsCell,
  SelectCell,
  ShortTextCell,
  type CellEditorProps,
} from "./cell-editors"
import type { CellPosition, CellVariantMeta, DataGridTableMeta } from "./data-grid-types"
import { useDataGrid } from "./use-data-grid"
import { cn } from "../../../../lib/utils"

interface DataGridProps {
  table: TanstackTable<any>
  /** Managed column ids (schema fields) — excludes pinned utility columns. */
  columnIds: string[]
  tableMeta: DataGridTableMeta<any>
  readOnly?: boolean
  rowHeight?: number
  height?: number
  onRowAdd?: () => void
}

/**
 * Responsive, keyboard-accessible spreadsheet grid powered by TanStack Table.
 * Features sticky headers, sticky row numbers, mobile touch-friendly scrolling,
 * and inline type-aware cell editors with uncommitted change indicators.
 */
export function DataGrid({
  table,
  columnIds,
  tableMeta,
  readOnly = false,
  rowHeight = 38,
  height = 640,
  onRowAdd,
}: DataGridProps) {
  const rows = table.getRowModel().rows
  const headerGroups = table.getHeaderGroups()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const grid = useDataGrid({
    table,
    readOnly,
    columnIds,
    rowCount: rows.length,
    containerRef,
    onDataUpdate: tableMeta.onDataUpdate,
  })

  return (
    <div className="dy-flex dy-w-full dy-flex-col dy-overflow-hidden dy-rounded-xl dy-border dy-border-border/50 dy-bg-card dy-shadow-sm">
      <div
        ref={containerRef}
        role="grid"
        aria-label="Spreadsheet"
        aria-rowcount={rows.length}
        aria-colcount={columnIds.length}
        tabIndex={0}
        onKeyDown={grid.handleKeyDown}
        className="dy-outline-none"
      >
        <div
          className="dy-relative dy-w-full dy-overflow-auto [touch-action:auto]"
          style={{ maxHeight: `${height}px` }}
        >
          <table
            className="dy-table-fixed dy-w-full dy-border-collapse dy-caption-bottom dy-text-sm"
            style={{ width: `${table.getTotalSize() + 48}px`, minWidth: "100%" }}
          >
            {/* Header */}
            <thead>
              {headerGroups.map((headerGroup) => (
                <tr key={headerGroup.id} className="dy-border-b dy-border-border/60">
                  {/* Sticky row-number index header */}
                  <th
                    scope="col"
                    className="dy-sticky dy-top-0 dy-left-0 dy-z-30 dy-w-12 dy-min-w-[48px] dy-border-r dy-border-border/40 dy-bg-muted/95 dy-backdrop-blur-sm dy-px-2 dy-py-2 dy-text-center dy-text-[11px] dy-font-semibold dy-text-muted-foreground/70"
                  >
                    #
                  </th>
                  {headerGroup.headers.map((header) => {
                    if (!columnIds.includes(header.id)) return null
                    return <GridHeader key={header.id} header={header} />
                  })}
                </tr>
              ))}
            </thead>

            {/* Body */}
            <tbody className="[&_tr:last-child]:dy-border-0">
              {rows.map((row, rowIndex) => {
                const docId = String(row.original.id ?? "")
                const isNewRow = docId.startsWith("__new__")

                return (
                  <tr
                    key={row.id}
                    style={{ minHeight: `${rowHeight}px` }}
                    className={cn(
                      "dy-border-b dy-border-border/30 dy-transition-colors hover:dy-bg-muted/20",
                      isNewRow && "dy-bg-primary/5",
                    )}
                  >
                    {/* Sticky row-number index cell */}
                    <td
                      className={cn(
                        "dy-sticky dy-left-0 dy-z-10 dy-w-12 dy-min-w-[48px] dy-border-r dy-border-border/30 dy-bg-card/95 dy-backdrop-blur-sm dy-px-1.5 dy-py-2 dy-text-center dy-font-mono dy-text-[11px] dy-text-muted-foreground/60 dy-select-none",
                        isNewRow && "dy-bg-primary/10 dy-text-primary dy-font-bold",
                      )}
                    >
                      {isNewRow ? "+" : rowIndex + 1}
                    </td>

                    {columnIds.map((columnId, colIndex) => {
                      const column = table.getColumn(columnId)
                      if (!column) return null
                      const position: CellPosition = { row: rowIndex, col: colIndex }
                      const meta = (column.columnDef.meta as any)?.cell as CellVariantMeta | undefined
                      const isDirty = tableMeta.isDirty
                        ? tableMeta.isDirty(docId, columnId)
                        : Boolean(tableMeta.updates?.[docId] && tableMeta.updates[docId][columnId] !== undefined)

                      const cellProps: CellEditorProps = {
                        value: row.getValue(columnId),
                        columnId,
                        rowIndex,
                        docId,
                        rowHeight,
                        isFocused: grid.isFocused(rowIndex, colIndex),
                        isEditing:
                          !!grid.editingCell &&
                          grid.editingCell.row === rowIndex &&
                          grid.editingCell.col === colIndex,
                        isSelected: grid.isSelected(rowIndex, colIndex),
                        isDirty,
                        readOnly:
                          readOnly ||
                          !!(column.columnDef.meta as any)?.__readOnly ||
                          meta?.variant === "readonly",
                        variant: meta?.variant ?? "readonly",
                        options: meta?.options,
                        relationTo: meta?.relationTo,
                        tableMeta,
                        onSelect: () => grid.setFocusedCell(position),
                        onEdit: () => grid.startEditingAt(position),
                        onStopEditing: grid.stopEditing,
                      }

                      return (
                        <td
                          key={columnId}
                          style={{
                            width: `${column.getSize()}px`,
                            minWidth: `${column.columnDef.minSize ?? 80}px`,
                          }}
                          className="dy-p-0 dy-border-r dy-border-border/20 last:dy-border-r-0 dy-align-middle"
                        >
                          {renderEditor(cellProps, docId)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}

              {!rows.length ? (
                <tr className="hover:dy-bg-transparent">
                  <td
                    colSpan={columnIds.length + 1}
                    className="dy-h-24 dy-text-center dy-text-xs dy-text-muted-foreground"
                  >
                    No results.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add-row footer */}
      {onRowAdd && !readOnly ? (
        <div className="dy-flex dy-items-center dy-border-t dy-border-border/60 dy-bg-muted/20 dy-px-3 dy-py-1.5">
          <button
            type="button"
            onClick={onRowAdd}
            className="dy-flex dy-h-7 dy-items-center dy-gap-1.5 dy-rounded-md dy-px-2.5 dy-text-xs dy-font-medium dy-text-muted-foreground hover:dy-bg-background hover:dy-text-foreground dy-transition-colors"
          >
            <Plus className="dy-h-3.5 dy-w-3.5" />
            Add row
          </button>
        </div>
      ) : null}
    </div>
  )
}

function GridHeader({
  header,
}: {
  header: any
}) {
  const column = header.column
  const sorted = column.getIsSorted()
  const label =
    typeof column.columnDef.header === "string" && column.columnDef.header
      ? column.columnDef.header
      : ((column.columnDef.meta as any)?.label as string | undefined) ?? column.id

  return (
    <th
      scope="col"
      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
      style={{
        width: `${header.getSize()}px`,
        minWidth: `${column.columnDef.minSize ?? 80}px`,
      }}
      className="dy-group/th dy-sticky dy-top-0 dy-z-20 dy-h-9 dy-border-r dy-border-border/30 dy-bg-muted/95 dy-backdrop-blur-sm dy-px-3 dy-text-left dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground last:dy-border-r-0"
    >
      <button
        type="button"
        disabled={!column.getCanSort()}
        title={`Sort by ${label}`}
        className="dy-flex dy-w-full dy-items-center dy-justify-between dy-gap-1 hover:dy-text-foreground disabled:dy-cursor-default"
        onClick={() => column.toggleSorting(sorted === "asc")}
      >
        <span className="dy-truncate">{label}</span>
        {sorted === "asc" ? <ArrowUp className="dy-h-3 dy-w-3 dy-shrink-0" /> : null}
        {sorted === "desc" ? <ArrowDown className="dy-h-3 dy-w-3 dy-shrink-0" /> : null}
      </button>

      {/* Interactive column resize handle */}
      {column.getCanResize() && (
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
            column.resetSize()
          }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "dy-absolute dy-top-0 dy-right-0 dy-h-full dy-w-3 dy-cursor-col-resize dy-select-none dy-touch-none group-hover/th:dy-bg-primary/40 hover:!dy-bg-primary dy-z-30",
            column.getIsResizing() && "dy-bg-primary dy-w-1.5",
          )}
        />
      )}
    </th>
  )
}

/** Dispatches to the type-specific editor based on the resolved variant. */
function renderEditor(props: CellEditorProps, docId: string): React.ReactNode {
  switch (props.variant) {
    case "number":
      return <NumberCell {...props} />
    case "checkbox":
      return <CheckboxCell {...props} />
    case "select":
      return <SelectCell {...props} />
    case "multiSelect":
      return <MultiSelectCell {...props} />
    case "date":
      return <DateCell {...props} />
    case "image":
      return <ImageCell {...props} />
    case "images":
      return <ImagesCell {...props} />
    case "relationship":
      return <RelationshipCell {...props} />
    case "relationships":
      return <RelationshipsCell {...props} />
    case "longText":
      return <LongTextCell {...props} />
    case "text":
      return <ShortTextCell {...props} />
    default:
      return (
        <ReadonlyLinkCell
          docId={docId}
          display={summarizeValue(props.value)}
          isFocused={props.isFocused}
          isSelected={props.isSelected}
          isDirty={props.isDirty}
          onSelect={props.onSelect}
          tableMeta={props.tableMeta}
        />
      )
  }
}

/** Human summary for values without a dedicated editor. */
function summarizeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.length ? `${value.length} item${value.length === 1 ? "" : "s"}` : ""
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>
    return String(obj.title ?? obj.name ?? obj.label ?? obj.heading ?? obj.email ?? obj.filename ?? obj.id ?? "")
  }
  return String(value)
}

