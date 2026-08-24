import type { Field } from "@dyrected/core"
import { getMediaUrl } from "./utils"

export interface CsvColumn {
  key: string
  label: string
}

/** Fields that never belong in an export. */
const EXCLUDED_FIELD_TYPES = new Set(["row", "join", "blocks"])

/**
 * Builds the canonical export column list for a collection: ID, every visible
 * schema field in declared order, then Last Updated.
 */
export function csvColumnsForSchema(schema: any): CsvColumn[] {
  const fields = (schema?.fields ?? []) as Field[]
  const displayFields = fields.filter(
    (field) =>
      !!field.name &&
      field.name !== "password" &&
      !field.admin?.hidden &&
      !EXCLUDED_FIELD_TYPES.has(field.type as string),
  )
  return [
    { key: "id", label: "ID" },
    ...displayFields.map((field) => ({
      key: field.name!,
      label: (field as { label?: string }).label || field.name!,
    })),
    { key: "updatedAt", label: "Last Updated" },
  ]
}

/**
 * Flattens a cell value to its CSV text form: arrays join with "; ", media
 * objects resolve to their URL, relationships resolve to their title, and
 * anything else falls back to JSON.
 */
export function flattenForCsv(value: unknown, baseUrl = ""): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "number" || typeof value === "string") return String(value)

  if (Array.isArray(value)) {
    return value.map((item) => flattenForCsv(item, baseUrl)).filter(Boolean).join("; ")
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>
    // Media/upload — URL only.
    if (obj.url || obj.filename) {
      return getMediaUrl(obj, baseUrl)
    }
    // Relationship — title/name/label, falling back to the id.
    if (obj.id !== undefined) {
      return String(obj.title || obj.name || obj.label || obj.id)
    }
    return JSON.stringify(value)
  }

  return String(value)
}

/** RFC 4180 quoting so values containing commas/quotes/newlines keep columns intact. */
export function escapeCsvValue(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function buildCsv(
  docs: Record<string, unknown>[],
  columns: CsvColumn[],
  baseUrl = "",
): string {
  const header = columns.map((column) => escapeCsvValue(flattenForCsv(column.label, baseUrl))).join(",")
  const rows = docs.map((doc) =>
    columns.map((column) => escapeCsvValue(flattenForCsv(doc[column.key], baseUrl))).join(","),
  )
  return [header, ...rows].join("\n")
}

/** Triggers a browser download for a finished CSV document. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

interface FindArgs {
  where?: Record<string, unknown>
  sort?: string
}

/**
 * Fetches every page of a collection so exports cover records beyond the
 * loaded view window.
 */
export async function fetchAllDocs(
  client: any,
  slug: string,
  args: FindArgs = {},
): Promise<Record<string, unknown>[]> {
  const docs: Record<string, unknown>[] = []
  let page = 1
  let totalPages = 1
  while (page <= totalPages) {
    const response = await client.collection(slug).find({ page, limit: 20, depth: 1, ...args })
    docs.push(...(response?.docs ?? []))
    totalPages = response?.totalPages ?? 1
    page += 1
  }
  return docs
}
