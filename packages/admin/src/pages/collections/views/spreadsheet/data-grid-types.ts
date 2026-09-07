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
  docId?: string
}

/**
 * Shared mutation surface passed to every cell through TanStack's
 * `tableMeta`.
 */
export interface DataGridTableMeta<TData> {
  table?: Table<TData>
  readOnly?: boolean
  updates?: Record<string, Record<string, unknown>>
  newRows?: Array<{ __tempId: string; values: Record<string, unknown> }>
  onDataUpdate?: (event: DataUpdateEvent) => void
  onRowAdd?: () => void
  /** Opens the document editor for complex values that have no cell editor. */
  onOpenDoc?: (docId: string) => void
  /** Checks whether a specific cell has uncommitted local changes. */
  isDirty?: (docId: string, columnId: string) => boolean
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
    | "image"
    | "images"
    | "relationship"
    | "relationships"
    | "readonly"
  options?: { label: string; value: string }[]
  relationTo?: string
}

