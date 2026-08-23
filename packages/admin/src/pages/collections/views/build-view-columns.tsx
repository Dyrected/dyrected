import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import { MoreHorizontal, ExternalLink } from "lucide-react"

import { Button } from "../../../components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { RenderCell } from "../../../components/ui/render-cell"
import type { SerializedAction } from "./types"
import type { ViewColumnMeta } from "./types"

/** Configuration for the auto-linked primary (title) column. */
export interface PrimaryColumnLink {
  slug: string
  /** Detail pages are optional per-collection (`detail: false` falls back to edit). */
  hasDetail: boolean
  /** Resolves the external preview URL for a document, when configured. */
  resolvePreview?: (doc: Record<string, any>) => string | null
  /** Resolved row actions rendered as compact links under the title. */
  actions?: SerializedAction[]
  onRunAction?: (action: SerializedAction, ids: string[]) => void
}

interface BuildViewColumnsOptions {
  schema: any
  client: unknown
  schemas: unknown
  /** Field names from the view config; falls back to a sensible default set. */
  columns?: string[]
  /** Extra columns appended after the field columns (e.g. row actions). */
  trailingColumns?: ColumnDef<any, any>[]
  /** Columns prepended before the field columns (e.g. selection). */
  leadingColumns?: ColumnDef<any, any>[]
  /** When set, the primary (title) column renders as navigation links. */
  primaryLink?: PrimaryColumnLink
}

/**
 * Builds TanStack `ColumnDef`s for an operational view from the collection
 * schema. Cell rendering is delegated to the shared `RenderCell`, so every
 * layout (table / kanban cards / calendar chips) renders fields identically.
 *
 * Column metadata (`meta`) drives the tablecn-style toolbar: select/boolean
 * fields become faceted multi-select filters, numbers become numeric filters.
 */
export function buildViewColumns({
  schema,
  client,
  schemas,
  columns,
  trailingColumns = [],
  leadingColumns = [],
  primaryLink,
}: BuildViewColumnsOptions): ColumnDef<any, any>[] {
  const fieldsByName = new Map<string, any>(
    (schema?.fields ?? []).map((field: any) => [field.name, field]),
  )

  const requested = columns?.length
    ? columns
    : defaultColumnOrder(schema)

  const requestedFields = requested.filter((name) => fieldsByName.has(name))
  const primaryFieldName = primaryLink ? resolvePrimaryField(requestedFields, schema) : undefined

  const fieldColumns = requestedFields.map((name) => {
    const field = fieldsByName.get(name)
    const meta = buildColumnMeta(field)
    const isPrimary = name === primaryFieldName
    return {
      id: name,
      accessorKey: name,
      header: field.label || name,
      meta: { ...meta, __isPrimary: isPrimary } as any,
      // TanStack only falls back to auto-matching when filterFn is the
      // literal string "auto" — an explicit undefined resolves through the
      // registry and comes back empty, so every filterable column declares
      // a concrete matcher.
      ...(meta.variant === "multiSelect"
        ? { filterFn: multiSelectFilter }
        : meta.variant === "text"
          ? { filterFn: operatorTextFilter }
          : meta.variant === "number"
            ? { filterFn: operatorNumberFilter }
            : meta.variant === "date"
              ? { filterFn: operatorDateFilter }
              : {}),
      cell: ({ row }: any) => {
        const rendered = (
          <RenderCell value={row.original[name]} field={field} client={client} schemas={schemas} />
        )
        if (!isPrimary || !primaryLink) return rendered
        return renderPrimaryCell(row.original, rendered, primaryLink)
      },
    } satisfies ColumnDef<any, any>
  })

  return [...leadingColumns, ...fieldColumns, ...trailingColumns]
}

/**
 * The primary column is the configured `useAsTitle` field when visible;
 * otherwise the first visible field acts as the row's entry point.
 */
function resolvePrimaryField(fieldNames: string[], schema: any): string | undefined {
  if (fieldNames.length === 0) return undefined
  const configured = schema?.admin?.useAsTitle as string | undefined
  return configured && fieldNames.includes(configured) ? configured : fieldNames[0]
}

/** Title link into the admin, plus the v1-style action link row beneath it. */
function renderPrimaryCell(
  doc: Record<string, any>,
  rendered: React.ReactNode,
  link: PrimaryColumnLink,
): React.ReactNode {
  const id = String(doc.id ?? "")
  const targetUrl = link.hasDetail
    ? `/collections/${link.slug}/${id}`
    : `/collections/${link.slug}/${id}/edit`
  const previewUrl = link.resolvePreview?.(doc) ?? null
  const actions = link.actions ?? []

  return (
    <div className="dy-flex dy-min-w-[200px] dy-flex-col dy-gap-0.5">
      <div className="dy-flex dy-items-center dy-gap-1.5">
        <Link
          to={targetUrl}
          className="dy-min-w-0 dy-truncate dy-font-medium dy-text-foreground hover:dy-text-primary hover:dy-underline dy-underline-offset-2 dy-transition-colors dy-duration-150"
        >
          {rendered}
        </Link>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open preview"
            aria-label="Open preview"
            className="dy-shrink-0 dy-text-muted-foreground/50 hover:dy-text-primary dy-transition-colors dy-duration-150"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink className="dy-h-3.5 dy-w-3.5" />
          </a>
        )}
      </div>
      {actions.length > 0 && link.onRunAction ? (
        <PrimaryActionLinks docId={id} actions={actions} onRun={link.onRunAction} />
      ) : null}
    </div>
  )
}

/** Inline limit for the primary-cell link row: View · Edit · Delete by default. */
const PRIMARY_INLINE_ACTIONS = 3

/**
 * Compact text-link actions under the row title — mirrors list-view-v1's
 * "View | Preview | Edit | Delete" pattern. First three render inline; the
 * rest (customs, Duplicate) collapse into a ⋯ menu.
 */
function PrimaryActionLinks({
  docId,
  actions,
  onRun,
}: {
  docId: string
  actions: SerializedAction[]
  onRun: (action: SerializedAction, ids: string[]) => void
}) {
  const inline = actions.slice(0, PRIMARY_INLINE_ACTIONS)
  const overflow = actions.slice(PRIMARY_INLINE_ACTIONS)

  return (
    <div className="dy-flex dy-items-center dy-gap-1 dy-leading-none">
      {inline.map((action, index) => (
        <span key={`${action.name}:${index}`} className="dy-flex dy-items-center dy-gap-1">
          {index > 0 && <span className="dy-text-muted-foreground/40 dy-text-xs">·</span>}
          <button
            type="button"
            className={cnLinkClasses(action.destructive)}
            onClick={(event) => {
              event.stopPropagation()
              onRun(action, [docId])
            }}
          >
            {action.label}
          </button>
        </span>
      ))}
      {overflow.length > 0 ? (
        <span className="dy-flex dy-items-center dy-gap-1">
          {inline.length > 0 && <span className="dy-text-muted-foreground/40 dy-text-xs">·</span>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="dy-h-5 dy-w-5 dy-text-muted-foreground hover:dy-text-foreground"
                aria-label="More actions"
                title={overflow.map((action) => action.label).join(", ")}
              >
                <MoreHorizontal className="dy-h-3.5 dy-w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="dy-min-w-36">
              {overflow.map((action) => (
                <DropdownMenuItem
                  key={action.name}
                  onClick={() => onRun(action, [docId])}
                  className={action.destructive ? "dy-text-destructive focus:dy-text-destructive" : undefined}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ) : null}
    </div>
  )
}

function cnLinkClasses(destructive?: boolean): string {
  const base =
    "dy-cursor-pointer dy-text-xs dy-underline-offset-2 hover:dy-underline dy-transition-colors dy-duration-150"
  return destructive
    ? `${base} dy-text-muted-foreground hover:dy-text-destructive`
    : `${base} dy-text-muted-foreground hover:dy-text-foreground`
}

/** Multi-select facet matching coerces raw values to strings. */
export function multiSelectFilter(
  row: any,
  columnId: string,
  filterValue: string[],
): boolean {
  const value = row.getValue(columnId)
  if (value === null || value === undefined || value === "") return false
  return filterValue.includes(String(value))
}

/** Shape stored as a column's filter value by the command-based filter menu. */
export interface OperatorFilterValue {
  operator: string
  value?: unknown
  value2?: unknown
}

function isEmptyCell(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "number" && Number.isNaN(value))
  )
}

function compareNumbers(a: number, b: number, operator: string): boolean {
  switch (operator) {
    case "ne":
      return a !== b
    case "lt":
      return a < b
    case "lte":
      return a <= b
    case "gt":
      return a > b
    case "gte":
      return a >= b
    default:
      return a === b
  }
}

function toTime(value: unknown): number | null {
  if (value instanceof Date) return value.getTime()
  if (typeof value === "string" || typeof value === "number") {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? null : time
  }
  return null
}

/**
 * Operator-based matcher for text columns ("contains", "is", "is empty", …).
 * Falls back to substring matching for legacy plain-string filter values.
 */
export function operatorTextFilter(
  row: any,
  columnId: string,
  filterValue: OperatorFilterValue | unknown,
): boolean {
  if (typeof filterValue !== "object" || filterValue === null) {
    const needle = String(filterValue ?? "").toLowerCase()
    return needle ? String(row.getValue(columnId) ?? "").toLowerCase().includes(needle) : true
  }

  const { operator, value } = filterValue as OperatorFilterValue
  const cell = row.getValue(columnId)
  const text = cell === null || cell === undefined ? "" : String(cell)
  const haystack = text.toLowerCase()
  const needle = typeof value === "string" ? value.toLowerCase() : ""

  switch (operator) {
    case "notILike":
      return !haystack.includes(needle)
    case "eq":
      return !!text && haystack === needle
    case "ne":
      return !text || haystack !== needle
    case "isEmpty":
      return text === ""
    case "isNotEmpty":
      return text !== ""
    default:
      return haystack.includes(needle)
  }
}
operatorTextFilter.autoRemove = (filterValue: any) =>
  !filterValue?.operator || operatorNeedsValue(filterValue.operator, filterValue)

/**
 * Operator-based matcher for number columns ("is greater than", "is between", …).
 * Falls back to exact equality for legacy plain-number filter values.
 */
export function operatorNumberFilter(
  row: any,
  columnId: string,
  filterValue: OperatorFilterValue | unknown,
): boolean {
  if (typeof filterValue !== "object" || filterValue === null) {
    return typeof filterValue === "number" && row.getValue(columnId) === filterValue
  }

  const { operator, value, value2 } = filterValue as OperatorFilterValue
  const cell = row.getValue(columnId)

  switch (operator) {
    case "isEmpty":
      return isEmptyCell(cell)
    case "isNotEmpty":
      return !isEmptyCell(cell)
    case "isBetween": {
      if (typeof cell !== "number") return false
      const min = Number(value)
      const max = Number(value2)
      if (Number.isNaN(min) || Number.isNaN(max)) return false
      return cell >= Math.min(min, max) && cell <= Math.max(min, max)
    }
    default:
      return typeof cell === "number" && typeof value === "number" && compareNumbers(cell, value, operator)
  }
}
operatorNumberFilter.autoRemove = (filterValue: any) =>
  !filterValue?.operator || operatorNeedsValue(filterValue.operator, filterValue)

/** Operator-based matcher for date columns. Values are stored as ISO strings. */
export function operatorDateFilter(
  row: any,
  columnId: string,
  filterValue: OperatorFilterValue | unknown,
): boolean {
  if (typeof filterValue !== "object" || filterValue === null) {
    const needle = toTime(filterValue)
    return needle ? toTime(row.getValue(columnId)) === needle : true
  }

  const { operator, value, value2 } = filterValue as OperatorFilterValue
  const cellTime = toTime(row.getValue(columnId))

  switch (operator) {
    case "isEmpty":
      return cellTime === null
    case "isNotEmpty":
      return cellTime !== null
    case "isBetween": {
      if (cellTime === null) return false
      const start = toTime(value)
      const end = toTime(value2)
      if (!start || !end) return false
      return cellTime >= Math.min(start, end) && cellTime <= Math.max(start, end)
    }
    default: {
      const target = toTime(value)
      if (cellTime === null || !target) return false
      return compareNumbers(cellTime, target, operator)
    }
  }
}
operatorDateFilter.autoRemove = (filterValue: any) =>
  !filterValue?.operator || operatorNeedsValue(filterValue.operator, filterValue)

/** Whether an operator expects an accompanying value. */
export function operatorNeedsValue(operator: string, filterValue?: OperatorFilterValue): boolean {
  if (operator === "isEmpty" || operator === "isNotEmpty") return false
  return filterValue ? filterValue.value === undefined || filterValue.value === "" : true
}

function defaultColumnOrder(schema: any): string[] {
  return (schema?.fields ?? [])
    .filter((field: any) => !["textarea", "richText", "json", "blocks"].includes(field.type))
    .slice(0, 5)
    .map((field: any) => field.name)
}

function buildColumnMeta(field: any): ViewColumnMeta {
  const base: ViewColumnMeta = {
    fieldName: field.name,
    label: field.label || field.name,
  }

  if (field.type === "select" || field.type === "radio" || field.type === "boolean") {
    return {
      ...base,
      variant: "multiSelect",
      options: normalizeOptions(field),
    }
  }
  if (field.type === "number") {
    return { ...base, variant: "number" }
  }
  if (field.type === "date" || field.type === "datetime") {
    return { ...base, variant: "date" }
  }
  if (field.type === "text" || field.type === "email" || field.type === "textarea") {
    return { ...base, variant: "text" }
  }
  return base
}

export function normalizeOptions(field: any): { label: string; value: string }[] {
  if (field.type === "boolean") {
    return [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ]
  }
  const options = Array.isArray(field.options) ? field.options : []
  return options.map((option: any) =>
    typeof option === "string" ? { label: option, value: option } : { label: String(option.label), value: String(option.value) },
  )
}
