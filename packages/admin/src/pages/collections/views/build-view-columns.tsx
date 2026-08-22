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
            ? { filterFn: "includesString" }
            : meta.variant === "number"
              ? { filterFn: numberEqualsFilter }
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

/** Exact numeric match — the toolbar submits numbers, so built-in string
 * comparators (which call `.toLowerCase()`) would throw. */
export function numberEqualsFilter(
  row: any,
  columnId: string,
  filterValue: unknown,
): boolean {
  return (
    typeof filterValue === "number" &&
    !Number.isNaN(filterValue) &&
    row.getValue(columnId) === filterValue
  )
}
numberEqualsFilter.autoRemove = (value: unknown) => value === undefined || value === null || value === ""

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
