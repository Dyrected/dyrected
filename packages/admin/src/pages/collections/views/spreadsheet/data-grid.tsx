import * as React from "react"
import type { Table as TanstackTable } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, Plus } from "lucide-react"

import {
  CheckboxCell,
  DateCell,
  LongTextCell,
  MultiSelectCell,
  NumberCell,
  ReadonlyLinkCell,
  SelectCell,
  ShortTextCell,
  type CellEditorProps,
} from "./cell-editors"
import type { CellPosition, CellVariantMeta, DataGridTableMeta } from "./data-grid-types"
import { useDataGrid } from "./use-data-grid"

export const GRID_COLUMN_WIDTH = 190

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
 * Div-based spreadsheet grid (adapted from the tablecn data-grid): sticky
 * headers, fixed row height, one focused cell with rectangular selection,
 * keyboard-first navigation and inline type-specific editors.
 */
export function DataGrid({
  table,
  columnIds,
  tableMeta,
  readOnly = false,
  rowHeight = 36,
  height = 520,
  onRowAdd,
}: DataGridProps) {
  const rows = table.getRowModel().rows
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
    <div className="dy-overflow-hidden dy-rounded-xl dy-border dy-border-border/50 dy-bg-card dy-shadow-sm">
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
        <div className="dy-overflow-auto" style={{ maxHeight: `${height}px` }}>
        {/* Header */}
        <div role="rowgroup">
          <div
            role="row"
            className="dy-sticky dy-top-0 dy-z-10 dy-flex dy-w-max dy-min-w-full dy-border-b dy-border-border/60 dy-bg-muted/40"
          >
            {columnIds.map((id) => (
              <GridHeader key={id} table={table} columnId={id} width={GRID_COLUMN_WIDTH} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div role="rowgroup">
          {rows.map((row, rowIndex) => (
            <div
              key={row.id}
              role="row"
              style={{ height: `${rowHeight}px` }}
              className="dy-flex dy-w-max dy-min-w-full dy-border-b dy-border-border/30 last:dy-border-b-0 hover:dy-bg-muted/20"
            >
              {columnIds.map((columnId, colIndex) => {
                const column = table.getColumn(columnId)
                if (!column) return null
                const position: CellPosition = { row: rowIndex, col: colIndex }
                const meta = (column.columnDef.meta as any)?.cell as CellVariantMeta | undefined
                const cellProps: CellEditorProps = {
                  value: row.getValue(columnId),
                  columnId,
                  rowIndex,
                  rowHeight,
                  isFocused: grid.isFocused(rowIndex, colIndex),
                  isEditing: !!grid.editingCell &&
                    grid.editingCell.row === rowIndex &&
                    grid.editingCell.col === colIndex,
                  isSelected: grid.isSelected(rowIndex, colIndex),
                  readOnly: readOnly || !!(column.columnDef.meta as any)?.__readOnly || meta?.variant === "readonly",
                  variant: meta?.variant ?? "readonly",
                  options: meta?.options,
                  tableMeta,
                  onSelect: () => grid.setFocusedCell(position),
                  onEdit: () => grid.startEditingAt(position),
                  onStopEditing: grid.stopEditing,
                }
                return (
                  <div
                    key={columnId}
                    className="dy-shrink-0 dy-border-e dy-border-border/20 dy-last:border-e-0"
                    style={{ width: `${GRID_COLUMN_WIDTH}px` }}
                  >
                    {renderEditor(cellProps, String(row.original.id ?? ""))}
                  </div>
                )
              })}
            </div>
          ))}
          {!rows.length ? (
            <div className="dy-flex dy-h-24 dy-items-center dy-justify-center dy-text-sm dy-text-muted-foreground">
              No results.
            </div>
          ) : null}
        </div>

        {/* Add-row footer */}
        {onRowAdd && !readOnly ? (
          <div role="rowgroup" className="dy-sticky dy-bottom-0">
            <button
              type="button"
              onClick={onRowAdd}
              className="dy-flex dy-h-9 dy-w-full dy-min-w-full dy-items-center dy-gap-2 dy-border-t dy-border-border/60 dy-bg-background/95 dy-px-3 dy-text-xs dy-text-muted-foreground hover:dy-bg-muted/50"
            >
              <Plus className="dy-h-3.5 dy-w-3.5" />
              Add row
            </button>
          </div>
        ) : null}
        </div>
      </div>
    </div>
  )
}

function GridHeader<TData>({
  table,
  columnId,
  width,
}: {
  table: TanstackTable<TData>
  columnId: string
  width: number
}) {
  const column = table.getColumn(columnId)
  if (!column) return null
  const sorted = column.getIsSorted()
  const label =
    typeof column.columnDef.header === "string" && column.columnDef.header
      ? column.columnDef.header
      : ((column.columnDef.meta as any)?.label as string | undefined) ?? columnId

  return (
    <div
      role="columnheader"
      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
      className="dy-flex dy-h-9 dy-shrink-0 dy-items-center dy-gap-1 dy-border-e dy-border-border/30 dy-px-2.5 dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground last:dy-border-e-0"
      style={{ width: `${width}px` }}
    >
      <button
        type="button"
        disabled={!column.getCanSort()}
        title={`Sort by ${label}`}
        className="dy-min-w-0 dy-flex-1 dy-truncate dy-text-left hover:dy-text-foreground disabled:dy-cursor-default"
        onClick={() => column.toggleSorting(sorted === "asc")}
      >
        {label}
      </button>
      {sorted === "asc" ? <ArrowUp className="dy-h-3 dy-w-3 dy-shrink-0" /> : null}
      {sorted === "desc" ? <ArrowDown className="dy-h-3 dy-w-3 dy-shrink-0" /> : null}
    </div>
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
    return String(obj.title ?? obj.name ?? obj.label ?? obj.filename ?? obj.id ?? "")
  }
  return String(value)
}
