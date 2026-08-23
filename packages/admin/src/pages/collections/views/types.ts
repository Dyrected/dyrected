/**
 * Built-in client-side operations implemented by the admin UI itself (as
 * opposed to server-defined `runAction` actions). They ride along on regular
 * serialized actions so every layout renders and triggers them identically.
 */
export type SystemOperation = "view" | "edit" | "duplicate" | "delete" | "export-selected"

/**
 * Toggles for built-in document operations; `false` hides the operation.
 * Mirrors core's `ViewActionFeatures` as delivered by `/api/schemas`.
 */
export interface ViewActionFeatures {
  view?: boolean
  edit?: boolean
  duplicate?: boolean
  delete?: boolean
  exportSelected?: boolean
}

/**
 * Serialized shape of `defineView` / `defineAction` configs as delivered by
 * `/api/schemas` — function properties (handlers) never cross the wire.
 */
export interface SerializedAction {
  name: string
  label: string
  icon?: string
  type?: "row" | "bulk" | "header"
  confirm?: string
  fields?: any[]
  mutation?: Record<string, any>
  access?: Record<string, any>
  /** Marks an admin-implemented operation; handled before `runAction`. */
  operation?: SystemOperation
  /** Renders the trigger in a destructive style. */
  destructive?: boolean
}

export interface SerializedViewMetric {
  label: string
  aggregate?: {
    count?: "*"
    sum?: string
    avg?: string
    min?: string
    max?: string
    cast?: string
    where?: Record<string, unknown>
  }
  aggregates?: Record<string, NonNullable<SerializedViewMetric["aggregate"]>>
  transform?: string
  expression?: string
  format?: string
  currency?: string
}

export interface SerializedView {
  slug: string
  label: string
  icon?: string
  layout?: "table" | "spreadsheet" | "kanban" | "calendar" | "gantt" | "cards"
  filter?: Record<string, any> | string
  groupBy?: string
  /**
   * How cross-column kanban drags persist. "update" (default) PATCHes the
   * `groupBy` field directly; "action" runs the `moveAction` instead so
   * guarded transitions reuse the action pipeline (its mutation reads the
   * dropped value from `input.<groupBy>`).
   */
  moveMode?: "update" | "action"
  /** Action name used when `moveMode === "action"`. */
  moveAction?: string
  dateField?: string
  startDateField?: string
  endDateField?: string
  /** Select/boolean field whose values split the calendar into resource columns. */
  resourceField?: string
  columns?: string[]
  sort?: { field: string; direction: "asc" | "desc" }
  actions?: SerializedAction[]
  /** Toggles built-in operations (view/edit/duplicate/delete/export-selected). */
  features?: ViewActionFeatures
  /**
   * Explicit display order for actions — built-in names ("view", "edit",
   * "duplicate", "delete") and/or custom action names. Unlisted actions
   * append in their default order.
   */
  actionOrder?: string[]
  metrics?: SerializedViewMetric[]
  access?: Record<string, any>
}

/** TanStack column metadata used by the operational table toolbar. */
export interface ViewColumnMeta {
  /** Field name in the collection schema this column renders. */
  fieldName: string
  label: string
  variant?: "text" | "number" | "date" | "multiSelect"
  options?: { label: string; value: string }[]
}
