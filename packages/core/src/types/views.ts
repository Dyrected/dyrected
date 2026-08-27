import type { Field } from "./schema-core.js";
import type { AccessRule } from "./access.js";
import type { AggregateOperation } from "./aggregate.js";

/**
 * Supported layout engines for operational views in the Dyrected Admin UI:
 * - `'table'`: The workhorse — column sorting, search, faceted filters, and bulk actions.
 * - `'spreadsheet'`: Inline-editable matrix with batch saving (`Save changes` / `Discard`).
 * - `'kanban'`: Interactive card board grouped by status or category with drag-and-drop.
 * - `'calendar'`: Event schedule grid plotting records across month/week/day views by date.
 * - `'gantt'`: Timeline bars plotted across start and end dates.
 * - `'cards'`: Visual image/thumbnail gallery grid.
 */
export type ViewLayout = 'table' | 'spreadsheet' | 'kanban' | 'calendar' | 'gantt' | 'cards';

/**
 * Scope and placement for an operational view action:
 * - `'row'`: Renders as an inline action button on each document/row.
 * - `'bulk'`: Appears in the floating bulk action bar when one or more rows are selected.
 * - `'header'`: Renders as a primary action button in the view header.
 */
export type ActionType = 'row' | 'bulk' | 'header';

/**
 * Toggles for the built-in document operations an operational view surfaces.
 * All default to enabled (`true`). Set any to `false` to hide that operation.
 *
 * @example
 * ```ts
 * features: {
 *   delete: false, // Prevent deleting records from this view
 *   exportSelected: true, // Enable CSV export for checked rows
 * }
 * ```
 */
export interface ViewActionFeatures {
  /** Enables the "View" preview / read-only drawer button. Defaults to `true`. */
  view?: boolean;
  /** Enables the "Edit" document form link. Defaults to `true`. */
  edit?: boolean;
  /** Enables the "Duplicate" record action. Defaults to `true`. */
  duplicate?: boolean;
  /** Enables the "Delete" record action. Defaults to `true`. */
  delete?: boolean;
  /** Enables the "Export selected" CSV action in the bulk action bar. Defaults to `true`. */
  exportSelected?: boolean;
}

/**
 * Color palette options for metric cards:
 * `'purple' | 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo' | 'cyan' | 'orange'`
 */
export type MetricColor = 'purple' | 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo' | 'cyan' | 'orange' | string;

/**
 * A sub-metric breakdown item displayed in the compact footer of a metric card.
 *
 * @example
 * ```ts
 * {
 *   label: "Pending",
 *   aggregates: {
 *     checkedIn: { count: "*", where: { checkedIn: { equals: true } } },
 *     attending: { count: "*", where: { attending: { equals: true } } },
 *   },
 *   expression: "aggregates.attending - aggregates.checkedIn",
 * }
 * ```
 */
export interface ViewSubMetric {
  /** Short label for the sub-metric (e.g. "Pending", "Collected"). */
  label: string;
  /** Single database aggregate operation. */
  aggregate?: AggregateOperation;
  /** Map of named aggregate operations referenced in `expression` as `aggregates.key`. */
  aggregates?: Record<string, AggregateOperation>;
  /** JEXL math formula evaluated over `value` for a single aggregate (e.g. `"value * 100"`). */
  transform?: string;
  /** JEXL math formula evaluated over `aggregates` (e.g. `"aggregates.a - aggregates.b"`). */
  expression?: string;
  /** Display formatter: `'currency' | 'number' | 'percent'`. */
  format?: 'currency' | 'number' | 'percent' | string;
  /** 3-letter currency code (e.g. `"USD"`, `"NGN"`, `"EUR"`) used when `format: "currency"`. */
  currency?: string;
}

/**
 * Configuration for a KPI summary card rendered at the top of an operational view.
 *
 * All aggregations run directly on the database engine for maximum performance.
 *
 * @example
 * ```ts
 * {
 *   label: "Total Revenue",
 *   color: "emerald",
 *   aggregate: { sum: "amount", cast: "number", where: { status: "paid" } },
 *   format: "currency",
 *   currency: "USD",
 * }
 * ```
 */
export interface ViewMetric {
  /** Title displayed on the metric card header. */
  label: string;
  /** Accent color for the card's visual indicator. */
  color?: MetricColor;
  /** Unit badge shown alongside the numeric value (e.g. `"Guests"`, `"Orders"`, `"Tables"`). */
  unit?: string;
  /** Single database aggregate operation (`count`, `distinctCount`, `sum`, `avg`, `min`, `max`). */
  aggregate?: AggregateOperation;
  /** Map of named aggregate operations referenced in `expression` as `aggregates.key`. */
  aggregates?: Record<string, AggregateOperation>;
  /** JEXL math formula evaluated over `value` for a single aggregate (e.g. `"value * 25000"`). */
  transform?: string;
  /** JEXL math formula evaluated over `aggregates` (e.g. `"(aggregates.paid / aggregates.total) * 100"`). */
  expression?: string;
  /** Display formatter: `'currency' | 'number' | 'percent'`. */
  format?: 'currency' | 'number' | 'percent' | string;
  /** 3-letter currency code (e.g. `"USD"`, `"NGN"`, `"EUR"`) used when `format: "currency"`. */
  currency?: string;
  /** Optional secondary breakdown items shown in the card footer. */
  subMetrics?: ViewSubMetric[];
}

/**
 * Complete configuration for a tailored operational view.
 */
export interface ViewConfig {
  /** Stable URL slug for the view (`/collections/:slug/views/:viewSlug`). */
  slug: string;
  /** Human-readable title displayed in the sidebar navigation and view header. */
  label: string;
  /** Lucide icon name (e.g. `"UserCheck"`, `"Calendar"`, `"Shirt"`, `"TableProperties"`). */
  icon?: string;
  /** Layout engine to render: `'table' | 'spreadsheet' | 'kanban' | 'calendar' | 'gantt' | 'cards'`. Defaults to `'table'`. */
  layout?: ViewLayout;
  /** Base query filter applied before user toolbar filters (e.g. `{ attending: { equals: true } }` or JEXL string). */
  filter?: Record<string, any> | string;
  /** Field name used to organize records into kanban columns or collapsible grouped sections in table, cards, and spreadsheet. */
  groupBy?: string;
  /** Field name containing the ISO date string for calendar placement. Required when `layout: 'calendar'`. */
  dateField?: string;
  /** Field name for the start date in timeline/gantt views. Required when `layout: 'gantt'`. */
  startDateField?: string;
  /** Field name for the end date in timeline/gantt views. Required when `layout: 'gantt'`. */
  endDateField?: string;
  /** Field names to show in this view, in order. If omitted, Dyrected infers default display fields. */
  columns?: string[];
  /** Default sorting rule when entering the view. */
  sort?: { field: string; direction: 'asc' | 'desc' };
  /** Custom workflow actions available in this view. */
  actions?: ActionConfig[];
  /** Toggles built-in operations (view/edit/duplicate/delete/export). */
  features?: ViewActionFeatures;
  /**
   * Explicit display order for action buttons — mixing custom action names and built-in names
   * (`"view"`, `"edit"`, `"duplicate"`, `"delete"`). Unlisted actions append in default order.
   */
  actionOrder?: string[];
  /** KPI summary cards rendered in the hero row above the view. */
  metrics?: ViewMetric[];
  /** Role-based access rules controlling who can see or use this view. */
  access?: AccessConfig;
}

/**
 * An operational workflow action that can mutate data or trigger server logic.
 */
export interface ActionConfig<TDoc extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique action identifier (e.g. `"checkIn"`, `"markPaid"`). */
  name: string;
  /** Button label displayed in the UI. */
  label: string;
  /** Lucide icon name for the button (e.g. `"UserCheck"`, `"CheckCircle"`). */
  icon?: string;
  /** Action placement: `'row'` (per-row), `'bulk'` (multi-row selection bar), or `'header'` (view header). Defaults to `'row'`. */
  type?: ActionType;
  /** Optional confirmation prompt shown before executing (e.g. `"Confirm guest check-in at the door?"`). */
  confirm?: string;
  /** Optional interactive modal form fields prompting the user for input before executing. */
  fields?: Field[];
  /** Declarative database mutation applied to targeted documents (e.g. `{ checkedIn: true, checkedInAt: "now()" }`). */
  mutation?: Partial<TDoc> | Record<string, unknown>;
  /** Self-hosted server handler function executed when the action is triggered. */
  handler?: (context: ActionContext<TDoc>) => Promise<unknown> | unknown;
  /** Role-based access rules controlling who can trigger this action. */
  access?: AccessConfig;
}

/**
 * Context passed to an action's server handler function.
 */
export interface ActionContext<TDoc extends Record<string, unknown> = Record<string, unknown>> {
  /** The target document (for row actions). */
  doc: TDoc;
  /** All targeted documents (for bulk actions). */
  docs: TDoc[];
  /** The authenticated acting user, if available. */
  user: Record<string, unknown> | null;
  /** User inputs submitted via the action's modal form fields. */
  input: Record<string, unknown>;
  /** The collection configuration object. */
  collection: Record<string, unknown>;
}

/**
 * Role-based access control rules for a view or action.
 */
export interface AccessConfig {
  read?: AccessRule<any>;
  create?: AccessRule<any>;
  update?: AccessRule<any>;
  delete?: AccessRule<any>;
}

/**
 * Options for defining an operational view with `defineView`.
 *
 * @example
 * ```ts
 * export const attendingGuests = defineView({
 *   slug: "attending-guests",
 *   label: "Attending Guests",
 *   icon: "UserCheck",
 *   layout: "table",
 *   groupBy: "tableNumber",
 *   filter: { attending: { equals: true } },
 *   columns: ["name", "email", "guestCount", "checkedIn"],
 *   sort: { field: "name", direction: "asc" },
 * });
 * ```
 */
export interface DefineViewOptions {
  /** Stable URL slug for the view (`/collections/:slug/views/:viewSlug`). */
  slug: string;
  /** Human-readable title displayed in the sidebar navigation and view header. */
  label: string;
  /** Lucide icon name (e.g. `"UserCheck"`, `"Calendar"`, `"Shirt"`, `"TableProperties"`). */
  icon?: string;
  /** Layout engine to render: `'table' | 'spreadsheet' | 'kanban' | 'calendar' | 'gantt' | 'cards'`. Defaults to `'table'`. */
  layout?: ViewLayout;
  /** Base query filter applied before user toolbar filters (e.g. `{ attending: { equals: true } }` or JEXL string). */
  filter?: Record<string, any> | string;
  /** Field name used to organize records into kanban columns or collapsible grouped sections in table, cards, and spreadsheet. */
  groupBy?: string;
  /** Field name containing the ISO date string for calendar placement. Required when `layout: 'calendar'`. */
  dateField?: string;
  /** Field name for the start date in timeline/gantt views. Required when `layout: 'gantt'`. */
  startDateField?: string;
  /** Field name for the end date in timeline/gantt views. Required when `layout: 'gantt'`. */
  endDateField?: string;
  /** Field names to show in this view, in order. If omitted, Dyrected infers default display fields. */
  columns?: string[];
  /** Default sorting rule when entering the view. */
  sort?: { field: string; direction: 'asc' | 'desc' };
  /** Custom workflow actions available in this view. */
  actions?: ActionConfig[];
  /** Toggles built-in operations (view/edit/duplicate/delete/export). */
  features?: ViewActionFeatures;
  /**
   * Explicit display order for action buttons — mixing custom action names and built-in names
   * (`"view"`, `"edit"`, `"duplicate"`, `"delete"`). Unlisted actions append in default order.
   */
  actionOrder?: string[];
  /** KPI summary cards rendered in the hero row above the view. */
  metrics?: ViewMetric[];
  /** Role-based access rules controlling who can see or use this view. */
  access?: AccessConfig;
}

/**
 * Options for defining a custom workflow action with `defineAction`.
 *
 * @example
 * ```ts
 * export const checkInAction = defineAction({
 *   name: "checkIn",
 *   label: "Check In",
 *   icon: "UserCheck",
 *   type: "row",
 *   confirm: "Confirm guest check-in at the door?",
 *   mutation: { checkedIn: true, checkedInAt: "now()" },
 * });
 * ```
 */
export interface DefineActionOptions<TDoc extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique action identifier (e.g. `"checkIn"`, `"markPaid"`). */
  name: string;
  /** Button label displayed in the UI. */
  label: string;
  /** Lucide icon name for the button (e.g. `"UserCheck"`, `"CheckCircle"`). */
  icon?: string;
  /** Action placement: `'row'` (per-row), `'bulk'` (multi-row selection bar), or `'header'` (view header). Defaults to `'row'`. */
  type?: ActionType;
  /** Optional confirmation prompt shown before executing (e.g. `"Confirm guest check-in at the door?"`). */
  confirm?: string;
  /** Optional interactive modal form fields prompting the user for input before executing. */
  fields?: Field[];
  /** Declarative database mutation applied to targeted documents (e.g. `{ checkedIn: true, checkedInAt: "now()" }`). */
  mutation?: Partial<TDoc> | Record<string, unknown>;
  /** Self-hosted server handler function executed when the action is triggered. */
  handler?: (context: ActionContext<TDoc>) => Promise<unknown> | unknown;
  /** Role-based access rules controlling who can trigger this action. */
  access?: AccessConfig;
}

/**
 * Defines a typed operational view for a collection.
 *
 * @example
 * ```ts
 * export const attendingGuests = defineView({
 *   slug: "attending-guests",
 *   label: "Attending Guests",
 *   icon: "UserCheck",
 *   layout: "table",
 *   groupBy: "tableNumber",
 *   filter: { attending: { equals: true } },
 *   columns: ["name", "email", "guestCount", "checkedIn"],
 *   sort: { field: "name", direction: "asc" },
 * });
 * ```
 */
export function defineView<const T extends DefineViewOptions>(config: T): T {
  return config;
}

/**
 * Defines a custom workflow action for an operational view.
 *
 * @example
 * ```ts
 * export const markPaidAction = defineAction({
 *   name: "markPaid",
 *   label: "Mark Paid",
 *   icon: "DollarSign",
 *   type: "bulk",
 *   confirm: "Mark selected orders as paid?",
 *   mutation: { status: "paid" },
 * });
 * ```
 */
export function defineAction<const T extends DefineActionOptions>(config: T): T {
  return config;
}