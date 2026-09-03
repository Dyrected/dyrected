/**
 * Built-in client-side operations implemented directly by the admin UI
 * (as opposed to server-defined `runAction` workflow actions).
 *
 * System operations ride along on regular serialized actions so that layout engines
 * (table, spreadsheet, kanban, cards, calendar, gantt) render and trigger them identically.
 *
 * - `"view"`: Opens the document detail view.
 * - `"edit"`: Opens the document edit form/drawer.
 * - `"duplicate"`: Clones the document, omitting primary keys and timestamps.
 * - `"delete"`: Prompts for confirmation and permanently removes the record.
 * - `"export-selected"`: Downloads targeted records as a CSV/JSON export.
 */
export type SystemOperation = "view" | "edit" | "duplicate" | "delete" | "export-selected"

/**
 * Feature flags controlling the visibility and availability of built-in document operations.
 *
 * Setting an operation to `false` removes it from row action menus, bulk selection toolbars,
 * and primary link bars in all layouts for this view.
 *
 * @example
 * ```ts
 * features: {
 *   view: true,
 *   edit: false, // Read-only logistics view
 *   duplicate: false,
 *   delete: false,
 * }
 * ```
 */
export interface ViewActionFeatures {
  /** When `false`, hides the "View" detail action. Defaults to `true`. */
  view?: boolean
  /** When `false`, hides the "Edit" form action. Defaults to `true`. */
  edit?: boolean
  /** When `false`, hides the "Duplicate" action. Defaults to `true`. */
  duplicate?: boolean
  /** When `false`, hides the "Delete" action. Defaults to `true`. */
  delete?: boolean
  /** When `false`, hides the "Export Selected" bulk download action. Defaults to `true`. */
  exportSelected?: boolean
}

/**
 * Serialized representation of a workflow action or system operation delivered by the backend schema API (`/api/schemas`).
 *
 * Executable server handler functions never cross the network wire; only declarative metadata,
 * input field schemas, access rules, and client-side flags are serialized.
 */
export interface SerializedAction {
  /** Unique action identifier (e.g. `"updatePaymentStatus"`, `"checkInGuest"`). */
  name: string
  /** Human-readable button label displayed in row menus, toolbars, and modal headers. */
  label: string
  /** Lucide icon name rendered alongside the button label (e.g. `"CreditCard"`, `"PackageCheck"`). */
  icon?: string
  /**
   * Action placement and targeting context:
   * - `"row"`: Rendered per-row (targets a single document).
   * - `"bulk"`: Rendered in the multi-select action toolbar (targets multiple selected documents).
   * - `"header"`: Rendered in the view header toolbar (independent of specific document selections).
   * Defaults to `"row"`.
   */
  type?: "row" | "bulk" | "header"
  /** Optional confirmation prompt or description shown before executing the action. */
  confirm?: string
  /**
   * Custom label for the modal confirmation / submission button.
   * Defaults to `"Run"` for form dialogs or `"Confirm"` for confirmation modals.
   */
  submitLabel?: string
  /** Interactive modal form field definitions prompted to the user before running the action. */
  fields?: any[]
  /** Declarative database mutations applied to targeted documents when the action executes. */
  mutation?: Record<string, any>
  /** Serialized role-based access rules controlling whether the current user can view or trigger this action. */
  access?: Record<string, any>
  /** Marks a client-side built-in operation (`"view"`, `"edit"`, `"duplicate"`, `"delete"`). */
  operation?: SystemOperation
  /** When `true`, styles the button with destructive visual accents (e.g. red highlight). */
  destructive?: boolean
}

/**
 * Secondary or supporting aggregation metric displayed beneath a primary KPI card.
 *
 * Useful for showing related breakdown counts (e.g. "Pending: 15", "Overdue: 3").
 */
export interface SerializedViewSubMetric {
  /** Label describing the sub-metric value. */
  label: string
  /** Primary database aggregate definition. */
  aggregate?: {
    /** Counts all matching rows (`"*"`). */
    count?: "*"
    /** Calculates the numerical sum of values in the specified field name. */
    sum?: string
    /** Calculates the numerical average of values in the specified field name. */
    avg?: string
    /** Identifies the minimum value in the specified field name. */
    min?: string
    /** Identifies the maximum value in the specified field name. */
    max?: string
    /** Optional SQL cast applied to the column before aggregating (e.g. `"numeric"`). */
    cast?: string
    /** Optional Where filter criteria restricting which rows contribute to this calculation. */
    where?: Record<string, unknown>
  }
  /** Multiple named database aggregates available for compound expressions. */
  aggregates?: Record<string, NonNullable<SerializedViewMetric["aggregate"]>>
  /** Post-processing transformer applied to the aggregate value. */
  transform?: string
  /** Mathematical or JEXL expression combining multiple aggregates (e.g. `"received / total * 100"`). */
  expression?: string
  /** Display format specifier for the resulting number (e.g. `"number"`, `"percent"`, `"currency"`). */
  format?: string
  /** ISO currency code (e.g. `"NGN"`, `"USD"`, `"EUR"`) used when `format: "currency"`. */
  currency?: string
}

/**
 * Top-level KPI metric summary card rendered in the hero row above an operational view.
 *
 * Metrics compute live database aggregations (sums, counts, averages, and formulas) across the view's records.
 */
export interface SerializedViewMetric {
  /** Title displayed at the top of the KPI card. */
  label: string
  /** Visual accent color for the metric card (e.g. `"blue"`, `"emerald"`, `"amber"`, `"rose"`). */
  color?: string
  /** Unit suffix displayed after the primary value (e.g. `"guests"`, `"orders"`, `"hrs"`). */
  unit?: string
  /** Primary database aggregation configuration. */
  aggregate?: {
    /** Counts all matching rows (`"*"`). */
    count?: "*"
    /** Calculates the numerical sum of values in the specified field name. */
    sum?: string
    /** Calculates the numerical average of values in the specified field name. */
    avg?: string
    /** Identifies the minimum value in the specified field name. */
    min?: string
    /** Identifies the maximum value in the specified field name. */
    max?: string
    /** Optional SQL cast applied to the column before aggregating (e.g. `"numeric"`). */
    cast?: string
    /** Optional Where filter criteria restricting which rows contribute to this calculation. */
    where?: Record<string, unknown>
  }
  /** Multiple named database aggregates available for compound expressions. */
  aggregates?: Record<string, NonNullable<SerializedViewMetric["aggregate"]>>
  /** Post-processing transformer applied to the aggregate value. */
  transform?: string
  /** Mathematical or JEXL expression combining multiple aggregates. */
  expression?: string
  /** Display format specifier for the resulting number (e.g. `"number"`, `"percent"`, `"currency"`). */
  format?: string
  /** ISO currency code (e.g. `"NGN"`, `"USD"`, `"EUR"`) used when `format: "currency"`. */
  currency?: string
  /** List of secondary sub-metrics rendered inside this KPI card. */
  subMetrics?: SerializedViewSubMetric[]
}

/**
 * Complete operational view configuration serialized from `defineView` for the admin web application.
 */
export interface SerializedView {
  /** Unique URL-safe identifier for the view (`/collections/:slug/views/:viewSlug`). */
  slug: string
  /** Human-readable title displayed in navigation menus and view headers. */
  label: string
  /** Lucide icon name rendered next to the view title (e.g. `"Table"`, `"Columns"`, `"Calendar"`). */
  icon?: string
  /**
   * Layout engine used to render the records:
   * - `"table"`: Standard data grid with sorting, column resizing, and pagination.
   * - `"spreadsheet"`: Excel-like editable grid with keyboard navigation.
   * - `"kanban"`: Drag-and-drop board organized by columns.
   * - `"calendar"`: Month/week/day calendar grid based on a date field.
   * - `"gantt"`: Timeline schedule based on start and end dates.
   * - `"cards"`: Responsive gallery of structured visual cards.
   * Defaults to `"table"`.
   */
  layout?: "table" | "spreadsheet" | "kanban" | "calendar" | "gantt" | "cards"
  /** Base query filter applied before user toolbar filters (Where DSL object or JEXL string). */
  filter?: Record<string, any> | string
  /** Field name used to organize records into kanban columns or collapsible grouped sections in table and cards. */
  groupBy?: string
  /**
   * How cross-column kanban card drag-and-drops persist:
   * - `"update"` (default): Directly executes a `PATCH` updating the `groupBy` field on the document.
   * - `"action"`: Dispatches the configured `moveAction` instead, allowing server-side transition guards.
   */
  moveMode?: "update" | "action"
  /** Action identifier executed when `moveMode === "action"` and a card is dropped into a new column. */
  moveAction?: string
  /** Field name containing the ISO date string for calendar placement (required when `layout: "calendar"`). */
  dateField?: string
  /** Field name containing the start timestamp for timeline placement (required when `layout: "gantt"`). */
  startDateField?: string
  /** Field name containing the end timestamp for timeline placement (required when `layout: "gantt"`). */
  endDateField?: string
  /** Field name whose distinct values split the calendar view into parallel resource columns. */
  resourceField?: string
  /** Ordered list of schema field names to render as columns or card attributes in this view. */
  columns?: string[]
  /** Default initial sort order applied when entering the view. */
  sort?: { field: string; direction: "asc" | "desc" }
  /** Custom workflow actions registered for this view. */
  actions?: SerializedAction[]
  /** Built-in operation toggles (view, edit, duplicate, delete, export). */
  features?: ViewActionFeatures
  /**
   * Explicit display ordering for row action buttons and overflow menus.
   * Can mix custom action names and built-in names (`"view"`, `"edit"`, `"duplicate"`, `"delete"`).
   */
  actionOrder?: string[]
  /** KPI summary cards rendered in the hero row above the records. */
  metrics?: SerializedViewMetric[]
  /** Custom admin component slot overrides injected into the layout. */
  components?: {
    beforeViewHeader?: string[]
    afterViewHeader?: string[]
    beforeViewContent?: string[]
    afterViewContent?: string[]
  }
  /** Role-based access control rules governing access to this view. */
  access?: Record<string, any>
}

/**
 * Column metadata utilized by TanStack operational table toolbars and filters.
 */
export interface ViewColumnMeta {
  /** Field name in the collection schema this column renders. */
  fieldName: string
  /** Column header label displayed in the table. */
  label: string
  /** Data display variant controlling column alignment, formatting, and filter editors. */
  variant?: "text" | "number" | "date" | "multiSelect" | "select"
  /** List of selectable options when `variant` is `"select"` or `"multiSelect"`. */
  options?: { label: string; value: string }[]
}
