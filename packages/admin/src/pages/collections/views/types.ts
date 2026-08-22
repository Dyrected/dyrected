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
  dateField?: string
  startDateField?: string
  endDateField?: string
  columns?: string[]
  sort?: { field: string; direction: "asc" | "desc" }
  actions?: SerializedAction[]
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
