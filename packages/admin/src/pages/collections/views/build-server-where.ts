import type { OperatorFilterValue } from "./build-view-columns"

interface BuildServerWhereOptions {
  baseFilter?: Record<string, any>
  columnFilters?: Array<{ id: string; value: unknown }>
  search?: string
  searchColumnId?: string
  searchableFields?: string[]
  schema?: any
}

function coerceFieldValue(value: unknown, fieldName: string, schema?: any): unknown {
  if (value === null || value === undefined) return value
  const field = (schema?.fields ?? []).find((candidate: any) => candidate.name === fieldName)
  if (field?.type === "boolean") {
    if (value === "true" || value === true) return true
    if (value === "false" || value === false) return false
    return value
  }
  if (field?.type === "number") {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? value : parsed
  }
  return value
}

/**
 * Translates a single TanStack ColumnFilter into a Dyrected Where clause.
 */
export function translateColumnFilter(
  columnId: string,
  filterValue: unknown,
  schema?: any,
): Record<string, any> | null {
  if (filterValue === undefined || filterValue === null || filterValue === "") {
    return null
  }

  // Multi-select facet array: e.g. ["requested", "paid"] or ["true"]
  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return null
    const mapped = filterValue.map((v) => coerceFieldValue(v, columnId, schema))
    return { [columnId]: { in: mapped } }
  }

  // Operator-based filter object: { operator, value, value2? }
  if (typeof filterValue === "object" && "operator" in (filterValue as Record<string, unknown>)) {
    const { operator, value, value2 } = filterValue as OperatorFilterValue

    switch (operator) {
      case "iLike":
      case "contains": {
        if (!value) return null
        return { [columnId]: { contains: String(value) } }
      }
      case "eq": {
        if (value === undefined || value === "") return null
        return { [columnId]: { equals: coerceFieldValue(value, columnId, schema) } }
      }
      case "ne": {
        if (value === undefined || value === "") return null
        return { [columnId]: { not_equals: coerceFieldValue(value, columnId, schema) } }
      }
      case "gt": {
        if (value === undefined || value === "") return null
        return { [columnId]: { gt: coerceFieldValue(value, columnId, schema) } }
      }
      case "gte": {
        if (value === undefined || value === "") return null
        return { [columnId]: { gte: coerceFieldValue(value, columnId, schema) } }
      }
      case "lt": {
        if (value === undefined || value === "") return null
        return { [columnId]: { lt: coerceFieldValue(value, columnId, schema) } }
      }
      case "lte": {
        if (value === undefined || value === "") return null
        return { [columnId]: { lte: coerceFieldValue(value, columnId, schema) } }
      }
      case "isBetween": {
        if (value === undefined || value2 === undefined || value === "" || value2 === "") return null
        const min = coerceFieldValue(value, columnId, schema)
        const max = coerceFieldValue(value2, columnId, schema)
        return { [columnId]: { gte: min, lte: max } }
      }
      case "isEmpty": {
        return {
          OR: [{ [columnId]: null }, { [columnId]: "" }, { [columnId]: { exists: false } }],
        }
      }
      case "isNotEmpty": {
        return {
          AND: [{ [columnId]: { not_equals: null } }, { [columnId]: { not_equals: "" } }],
        }
      }
      default: {
        if (value !== undefined && value !== "") {
          return { [columnId]: { contains: String(value) } }
        }
        return null
      }
    }
  }

  // Raw primitive string filter
  if (typeof filterValue === "string" && filterValue.trim()) {
    return { [columnId]: { contains: filterValue.trim() } }
  }

  return null
}

/**
 * Combines the view's authored base filter, active toolbar column filters,
 * and search queries into a single backend WhereClause for API requests.
 */
export function buildServerWhere({
  baseFilter,
  columnFilters = [],
  search,
  searchColumnId,
  searchableFields = [],
  schema,
}: BuildServerWhereOptions): Record<string, any> | undefined {
  const conditions: Record<string, any>[] = []

  if (baseFilter && Object.keys(baseFilter).length > 0) {
    conditions.push(baseFilter)
  }

  const trimmedSearch = search?.trim()
  if (trimmedSearch) {
    if (searchColumnId) {
      conditions.push({ [searchColumnId]: { contains: trimmedSearch } })
    } else if (searchableFields.length > 0) {
      conditions.push({
        OR: searchableFields.map((field) => ({ [field]: { contains: trimmedSearch } })),
      })
    }
  }

  for (const entry of columnFilters) {
    if (searchColumnId && entry.id === searchColumnId) {
      // Handled above via search input
      continue
    }
    const condition = translateColumnFilter(entry.id, entry.value, schema)
    if (condition) {
      conditions.push(condition)
    }
  }

  if (conditions.length === 0) return undefined
  if (conditions.length === 1) return conditions[0]
  return { AND: conditions }
}
