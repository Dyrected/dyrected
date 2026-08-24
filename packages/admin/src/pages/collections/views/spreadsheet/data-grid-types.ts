import type { Table } from "@tanstack/react-table"

/** Grid coordinates are logical (row index into the current page model). */
export interface CellPosition {
  row: number
  col: number
}

export interface DataUpdateEvent {
  rowIndex: number
  columnId: string
  value: unknown
}

/**
 * Shared mutation surface passed to every cell through TanStack's
 * `tableMeta`. Mirrors the tablecn data-grid contract.
 */
export interface DataGridTableMeta<TData> {
  table?: Table<TData>
  readOnly?: boolean
  onDataUpdate?: (event: DataUpdateEvent) => void
  onRowAdd?: () => void
  /** Opens the document editor for complex values that have no cell editor. */
  onOpenDoc?: (docId: string) => void
}

/** Per-column editor hints carried in TanStack column `meta.cell`. */
export interface CellVariantMeta {
  variant:
    | "text"
    | "longText"
    | "number"
    | "checkbox"
    | "select"
    | "multiSelect"
    | "date"
    | "readonly"
  options?: { label: string; value: string }[]
}
