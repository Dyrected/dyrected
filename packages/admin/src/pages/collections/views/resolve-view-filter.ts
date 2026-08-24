/**
 * Normalizes an operational view's base `filter` into a query `where` object.
 *
 * Object filters are passed through as-is (server-side parseWhere handles the
 * operator shape). JEXL string filters are a declarative-access concern and are
 * not evaluated client-side; they are ignored here so views stay usable.
 */
export function resolveViewFilter(filter: Record<string, any> | string | undefined): Record<string, any> | undefined {
  if (!filter) return undefined
  if (typeof filter === "string") return undefined
  if (typeof filter !== "object" || Array.isArray(filter)) return undefined
  return Object.keys(filter).length ? filter : undefined
}

/** Serializes a view sort into the SDK's `-field` / `field` form. */
export function resolveViewSort(sort?: { field: string; direction: "asc" | "desc" }): string | undefined {
  if (!sort) return undefined
  return `${sort.direction === "desc" ? "-" : ""}${sort.field}`
}

/** Merges base view filters with runtime filters — later values win per key. */
export function mergeFilters(
  base: Record<string, any> | undefined,
  runtime: Record<string, any> | undefined,
): Record<string, any> | undefined {
  if (!base && !runtime) return undefined
  return { ...base, ...runtime }
}
