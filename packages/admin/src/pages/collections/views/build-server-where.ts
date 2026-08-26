import type { OperatorFilterValue } from "./build-view-columns"

export const TEXT_LIKE_FIELD_TYPES = new Set([
  "text",
  "email",
  "textarea",
  "richText",
  "select",
  "radio",
  "url",
])

export function isTextLikeField(field: any): boolean {
  if (!field || typeof field !== "object") return false
  const type = field.type
  if (!type || typeof type !== "string") return false
  return TEXT_LIKE_FIELD_TYPES.has(type)
}

/**
 * Resolves candidate fields to strictly text-compatible fields.
 * Non-text fields (boolean, number, date, json, blocks, relationship, join,
 * row, and system timestamps) are stripped to avoid DB-level type mismatch errors (e.g. Postgres ILIKE on boolean).
 */
export function getSearchableFieldsFromSchema(
  schema: any,
  candidateFields?: string[],
): string[] {
  const fields = (schema?.fields ?? []) as Array<{ name: string; type: string }>
  const fieldByName = new Map(fields.filter((f) => !!f?.name).map((f) => [f.name, f]))

  // 1. If explicit admin.searchableFields configured on schema
  if (Array.isArray(schema?.admin?.searchableFields) && schema.admin.searchableFields.length > 0) {
    const configured = schema.admin.searchableFields.filter((name: string) => {
      const f = fieldByName.get(name)
      return !f || isTextLikeField(f)
    })
    if (configured.length > 0) return configured
  }

  // 2. If candidateFields provided, filter against schema to keep only text-like fields
  if (candidateFields && candidateFields.length > 0) {
    const filtered = candidateFields.filter((name) => {
      const f = fieldByName.get(name)
      if (f) return isTextLikeField(f)
      if (["id", "createdAt", "updatedAt", "createdBy", "updatedBy"].includes(name)) return false
      return false
    })
    if (filtered.length > 0) return filtered
  }

  // 3. Fallback: all text-like fields in schema
  return fields.filter((f) => isTextLikeField(f)).map((f) => f.name)
}

interface BuildServerWhereOptions {
  baseFilter?: Record<string, any>
  columnFilters?: Array<{ id: string; value: unknown }>
  search?: string
  searchColumnId?: string
  searchableFields?: string[]
  schema?: any
  joinOperator?: "and" | "or"
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
  searchableFields,
  schema,
  joinOperator = "and",
}: BuildServerWhereOptions): Record<string, any> | undefined {
  const toolbarConditions: Record<string, any>[] = []

  for (const entry of columnFilters) {
    if (searchColumnId && entry.id === searchColumnId && search !== undefined) {
      // Handled via top-level search input
      continue
    }
    const condition = translateColumnFilter(entry.id, entry.value, schema)
    if (condition) {
      toolbarConditions.push(condition)
    }
  }

  const topLevelConditions: Record<string, any>[] = []

  if (baseFilter && Object.keys(baseFilter).length > 0) {
    topLevelConditions.push(baseFilter)
  }

  const trimmedSearch = search?.trim()
  if (trimmedSearch) {
    if (searchColumnId && !searchableFields?.length) {
      topLevelConditions.push({ [searchColumnId]: { contains: trimmedSearch } })
    } else {
      const resolvedFields = getSearchableFieldsFromSchema(schema, searchableFields)
      if (resolvedFields.length > 0) {
        topLevelConditions.push({
          OR: resolvedFields.map((field) => ({ [field]: { contains: trimmedSearch } })),
        })
      }
    }
  }

  if (toolbarConditions.length > 0) {
    if (toolbarConditions.length === 1) {
      topLevelConditions.push(toolbarConditions[0])
    } else if (joinOperator === "or") {
      topLevelConditions.push({ OR: toolbarConditions })
    } else {
      topLevelConditions.push(...toolbarConditions)
    }
  }

  if (topLevelConditions.length === 0) return undefined
  if (topLevelConditions.length === 1) return topLevelConditions[0]
  return { AND: topLevelConditions }
}
