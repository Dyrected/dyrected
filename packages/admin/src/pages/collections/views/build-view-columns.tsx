import type { ColumnDef } from "@tanstack/react-table"
import { RenderCell } from "../../../components/ui/render-cell"
import type { ViewColumnMeta } from "./types"

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
}: BuildViewColumnsOptions): ColumnDef<any, any>[] {
  const fieldsByName = new Map<string, any>(
    (schema?.fields ?? []).map((field: any) => [field.name, field]),
  )

  const requested = columns?.length
    ? columns
    : defaultColumnOrder(schema)

  const fieldColumns = requested
    .filter((name) => fieldsByName.has(name))
    .map((name) => {
      const field = fieldsByName.get(name)
      const meta = buildColumnMeta(field)
      return {
        id: name,
        accessorKey: name,
        header: field.label || name,
        meta: meta as any,
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
        cell: ({ row }: any) => (
          <RenderCell value={row.original[name]} field={field} client={client} schemas={schemas} />
        ),
      } satisfies ColumnDef<any, any>
    })

  return [...leadingColumns, ...fieldColumns, ...trailingColumns]
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
