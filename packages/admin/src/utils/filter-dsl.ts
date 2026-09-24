export type FieldKind = "text" | "number" | "boolean" | "date" | "select" | "other"

export interface FilterRow {
  id: string
  field: string
  operator: string
  value: any
  value2?: any
}

export function getFieldKind(f: any): FieldKind {
  if (!f) return "text"
  const type = f.type || "text"
  if (type === "number" || type === "currency") return "number"
  if (type === "boolean") return "boolean"
  if (type === "date" || type === "datetime" || type === "time") return "date"
  if (type === "select" || type === "radio") return "select"
  const lower = (f.name || "").toLowerCase()
  if (lower.endsWith("at") || lower.includes("date")) return "date"
  if (lower.includes("amount") || lower.includes("price") || lower.includes("count") || lower.includes("total")) {
    return "number"
  }
  return "text"
}

export const OPERATORS_BY_KIND: Record<FieldKind, { value: string; label: string }[]> = {
  select: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
    { value: "in", label: "is any of" },
    { value: "exists", label: "is set" },
    { value: "not_exists", label: "is empty" },
  ],
  text: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
    { value: "contains", label: "contains" },
    { value: "starts_with", label: "starts with" },
    { value: "exists", label: "is set" },
    { value: "not_exists", label: "is empty" },
  ],
  number: [
    { value: "equals", label: "= (equals)" },
    { value: "not_equals", label: "≠ (not equals)" },
    { value: "greater_than", label: "> (greater than)" },
    { value: "greater_than_or_equal", label: "≥ (greater or equal)" },
    { value: "less_than", label: "< (less than)" },
    { value: "less_than_or_equal", label: "≤ (less or equal)" },
    { value: "between", label: "between" },
    { value: "exists", label: "is set" },
    { value: "not_exists", label: "is empty" },
  ],
  date: [
    { value: "equals", label: "is on" },
    { value: "greater_than", label: "is after" },
    { value: "greater_than_or_equal", label: "is on or after" },
    { value: "less_than", label: "is before" },
    { value: "less_than_or_equal", label: "is on or before" },
    { value: "between", label: "between" },
    { value: "exists", label: "is set" },
    { value: "not_exists", label: "is empty" },
  ],
  boolean: [
    { value: "equals", label: "is" },
    { value: "exists", label: "is set" },
    { value: "not_exists", label: "is empty" },
  ],
  other: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
    { value: "exists", label: "is set" },
    { value: "not_exists", label: "is empty" },
  ],
}

/** Formats an operator for human-friendly badges/summaries */
export function formatOperator(op: string): string {
  switch (op) {
    case "equals":
      return "is"
    case "not_equals":
      return "is not"
    case "greater_than":
      return ">"
    case "greater_than_or_equal":
      return "≥"
    case "less_than":
      return "<"
    case "less_than_or_equal":
      return "≤"
    case "contains":
      return "contains"
    case "starts_with":
      return "starts with"
    case "in":
      return "in"
    case "not_in":
      return "not in"
    case "between":
      return "between"
    case "exists":
      return "is set"
    case "not_exists":
      return "is empty"
    default:
      return op
  }
}

/** Converts an incoming Where object into editable FilterRows */
export function deserializeFilter(filter: Record<string, any> | undefined): FilterRow[] {
  if (!filter || typeof filter !== "object" || Array.isArray(filter)) return []

  const rows: FilterRow[] = []
  let counter = 0

  for (const [key, val] of Object.entries(filter)) {
    if (key === "OR" || key === "or" || key === "AND" || key === "and") continue

    if (val === null || typeof val !== "object") {
      rows.push({
        id: `row_${++counter}`,
        field: key,
        operator: "equals",
        value: val ?? "",
      })
      continue
    }

    if (Array.isArray(val)) {
      rows.push({
        id: `row_${++counter}`,
        field: key,
        operator: "in",
        value: val.join(", "),
      })
      continue
    }

    // Operator object: e.g. { greater_than: 50 } or { in: [...] } or { exists: false }
    const opEntries = Object.entries(val)
    if (opEntries.length === 1) {
      const [opName, opVal] = opEntries[0]
      if (opName === "exists") {
        rows.push({
          id: `row_${++counter}`,
          field: key,
          operator: opVal ? "exists" : "not_exists",
          value: "",
        })
      } else if (opName === "in" || opName === "not_in") {
        rows.push({
          id: `row_${++counter}`,
          field: key,
          operator: opName,
          value: Array.isArray(opVal) ? opVal.join(", ") : String(opVal),
        })
      } else {
        rows.push({
          id: `row_${++counter}`,
          field: key,
          operator: opName,
          value: opVal ?? "",
        })
      }
    } else if (
      (val.gte !== undefined || val.greater_than_or_equal !== undefined) &&
      (val.lte !== undefined || val.less_than_or_equal !== undefined)
    ) {
      rows.push({
        id: `row_${++counter}`,
        field: key,
        operator: "between",
        value: val.gte ?? val.greater_than_or_equal ?? "",
        value2: val.lte ?? val.less_than_or_equal ?? "",
      })
    } else {
      // Fallback: take first operator
      const [opName, opVal] = opEntries[0] || ["equals", ""]
      rows.push({
        id: `row_${++counter}`,
        field: key,
        operator: opName,
        value: opVal ?? "",
      })
    }
  }

  return rows
}

/** Serializes FilterRows back into a clean Dyrected Where clause */
export function serializeFilter(rows: FilterRow[], schemaFields: any[]): Record<string, any> | undefined {
  const result: Record<string, any> = {}

  for (const row of rows) {
    if (!row.field) continue

    const fieldMeta = schemaFields.find((f) => f.name === row.field)
    const kind = getFieldKind(fieldMeta)

    let parsedVal = row.value
    if (kind === "number") {
      const num = Number(row.value)
      if (!Number.isNaN(num) && row.value !== "" && row.value !== null) parsedVal = num
    } else if (kind === "boolean") {
      parsedVal = row.value === "true" || row.value === true
    }

    if (row.operator === "exists") {
      result[row.field] = { exists: true }
    } else if (row.operator === "not_exists") {
      result[row.field] = { exists: false }
    } else if (row.operator === "between") {
      let min = row.value
      let max = row.value2
      if (kind === "number") {
        const pMin = Number(min)
        const pMax = Number(max)
        if (!Number.isNaN(pMin)) min = pMin
        if (!Number.isNaN(pMax)) max = pMax
      }
      result[row.field] = { greater_than_or_equal: min, less_than_or_equal: max }
    } else if (row.operator === "in" || row.operator === "not_in") {
      const list = typeof row.value === "string"
        ? row.value.split(",").map((s) => s.trim()).filter(Boolean)
        : Array.isArray(row.value) ? row.value : [row.value]
      result[row.field] = { [row.operator]: list }
    } else if (row.operator === "equals") {
      result[row.field] = parsedVal
    } else {
      result[row.field] = { [row.operator]: parsedVal }
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}
