import * as React from "react"
import { useQueries } from "@tanstack/react-query"

import { useDyrected } from "../../../providers/dyrected-context"
import { resolveCollectionTitleFieldName } from "../../../lib/document-title"
import type { SerializedViewMetric, SerializedViewMetricGroupBy } from "./types"

export interface MetricGroupOption {
  value: any
  label: string
  where?: Record<string, unknown>
  filterTarget?: { columnId: string; value: unknown; operator?: string; value2?: unknown }
}

export interface NormalizedGroupBy {
  field: string
  limit: number
  orderBy?: "count" | "asc" | "desc"
  where?: Record<string, unknown>
  isSubMetric?: boolean
  bucket?: "day" | "week" | "month" | "quarter" | "year"
  filterZero?: boolean
}

export function normalizeGroupBy(config?: SerializedViewMetricGroupBy): NormalizedGroupBy | undefined {
  if (!config) return undefined
  if (typeof config === "string") {
    const trimmed = config.trim()
    return trimmed ? { field: trimmed, limit: 12 } : undefined
  }
  if (!config.field) return undefined
  return {
    field: config.field,
    limit: config.limit && config.limit > 0 ? config.limit : 12,
    orderBy: config.orderBy,
    where: config.where,
    bucket: config.bucket,
    filterZero: config.filterZero,
  }
}

/**
 * Generates discrete time intervals with ISO range filters and localized human labels.
 */
export function generateTimeBuckets(
  cfg: NormalizedGroupBy,
  referenceDate = new Date()
): { options: MetricGroupOption[]; allOptions: MetricGroupOption[] } {
  const bucketType = cfg.bucket || "month"
  const limit = cfg.limit || 12
  const isAsc = cfg.orderBy === "asc"
  const options: MetricGroupOption[] = []

  if (bucketType === "day") {
    for (let i = 0; i < limit; i++) {
      const offset = isAsc ? (limit - 1 - i) : i
      const d = new Date(referenceDate)
      d.setDate(d.getDate() - offset)
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
      const startIso = start.toISOString()
      const endIso = end.toISOString()
      const val = startIso.slice(0, 10)
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

      options.push({
        value: val,
        label,
        where: { [cfg.field]: { gte: startIso, lte: endIso } },
        filterTarget: { columnId: cfg.field, operator: "isBetween", value: startIso, value2: endIso },
      })
    }
  } else if (bucketType === "week") {
    const currentDay = referenceDate.getDay()
    const distToMonday = (currentDay + 6) % 7
    const currentMonday = new Date(referenceDate)
    currentMonday.setDate(currentMonday.getDate() - distToMonday)
    currentMonday.setHours(0, 0, 0, 0)

    for (let i = 0; i < limit; i++) {
      const offsetWeeks = isAsc ? (limit - 1 - i) : i
      const weekStart = new Date(currentMonday)
      weekStart.setDate(weekStart.getDate() - offsetWeeks * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const startIso = weekStart.toISOString()
      const endIso = weekEnd.toISOString()
      const val = `${startIso.slice(0, 10)}_W`
      const label = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`

      options.push({
        value: val,
        label,
        where: { [cfg.field]: { gte: startIso, lte: endIso } },
        filterTarget: { columnId: cfg.field, operator: "isBetween", value: startIso, value2: endIso },
      })
    }
  } else if (bucketType === "quarter") {
    const curYear = referenceDate.getFullYear()
    const curQuarter = Math.floor(referenceDate.getMonth() / 3) + 1

    for (let i = 0; i < limit; i++) {
      const offset = isAsc ? (limit - 1 - i) : i
      let targetQ = curQuarter - offset
      let targetY = curYear
      while (targetQ < 1) {
        targetQ += 4
        targetY -= 1
      }
      while (targetQ > 4) {
        targetQ -= 4
        targetY += 1
      }

      const qStartMonth = (targetQ - 1) * 3
      const start = new Date(targetY, qStartMonth, 1, 0, 0, 0, 0)
      const end = new Date(targetY, qStartMonth + 3, 0, 23, 59, 59, 999)
      const startIso = start.toISOString()
      const endIso = end.toISOString()
      const val = `${targetY}-Q${targetQ}`
      const label = `Q${targetQ} ${targetY}`

      options.push({
        value: val,
        label,
        where: { [cfg.field]: { gte: startIso, lte: endIso } },
        filterTarget: { columnId: cfg.field, operator: "isBetween", value: startIso, value2: endIso },
      })
    }
  } else if (bucketType === "year") {
    const curYear = referenceDate.getFullYear()
    for (let i = 0; i < limit; i++) {
      const offset = isAsc ? (limit - 1 - i) : i
      const targetY = curYear - offset
      const start = new Date(targetY, 0, 1, 0, 0, 0, 0)
      const end = new Date(targetY, 11, 31, 23, 59, 59, 999)
      const startIso = start.toISOString()
      const endIso = end.toISOString()
      const val = String(targetY)
      const label = String(targetY)

      options.push({
        value: val,
        label,
        where: { [cfg.field]: { gte: startIso, lte: endIso } },
        filterTarget: { columnId: cfg.field, operator: "isBetween", value: startIso, value2: endIso },
      })
    }
  } else {
    // Default: month
    const curYear = referenceDate.getFullYear()
    const curMonth = referenceDate.getMonth()

    for (let i = 0; i < limit; i++) {
      const offset = isAsc ? (limit - 1 - i) : i
      const d = new Date(curYear, curMonth - offset, 1, 0, 0, 0, 0)
      const targetYear = d.getFullYear()
      const targetMonth = d.getMonth()
      const start = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0)
      const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999)
      const startIso = start.toISOString()
      const endIso = end.toISOString()
      const val = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`
      const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" })

      options.push({
        value: val,
        label,
        where: { [cfg.field]: { gte: startIso, lte: endIso } },
        filterTarget: { columnId: cfg.field, operator: "isBetween", value: startIso, value2: endIso },
      })
    }
  }

  return { options, allOptions: options }
}

/**
 * Extracts all unique normalized `groupBy` targets from a list of metrics and their submetrics.
 */
export function extractGroupByConfigs(metrics?: SerializedViewMetric[]): NormalizedGroupBy[] {
  if (!metrics?.length) return []
  const map = new Map<string, NormalizedGroupBy>()

  for (const m of metrics) {
    const cardGb = normalizeGroupBy(m.groupBy)
    if (cardGb && !map.has(cardGb.field)) {
      map.set(cardGb.field, { ...cardGb, isSubMetric: false })
    }

    if (m.subMetrics?.length) {
      for (const sub of m.subMetrics) {
        const subGb = normalizeGroupBy(sub.groupBy)
        if (subGb) {
          map.set(subGb.field, { ...subGb, isSubMetric: true })
        }
      }
    }
  }

  return Array.from(map.values())
}

export interface UseMetricGroupsOptions {
  slug: string
  metrics?: SerializedViewMetric[]
  schema?: any
}

export interface UseMetricGroupsResult {
  groupsByField: Record<string, MetricGroupOption[]>
  allGroupsByField: Record<string, MetricGroupOption[]>
  isLoading: boolean
}

/**
 * Resolves group options for all fields referenced by `groupBy` in metric cards or submetrics.
 * Supports relationships (queries related collection), select/radio options, booleans, and scalar distinct aggregates.
 */
export function useMetricGroups({ slug, metrics, schema }: UseMetricGroupsOptions): UseMetricGroupsResult {
  const { client, schemas } = useDyrected()
  const configs = React.useMemo(() => extractGroupByConfigs(metrics), [metrics])

  const queries = useQueries({
    queries: configs.map((cfg) => {
      const fieldDef = (schema?.fields ?? []).find((f: any) => f.name === cfg.field)
      const rawRelationTo = fieldDef?.type === "relationship" ? fieldDef.relationTo : undefined
      const relationTo = Array.isArray(rawRelationTo) ? rawRelationTo[0] : rawRelationTo
      const hasPredefinedOptions = Array.isArray(fieldDef?.options) && fieldDef.options.length > 0
      const isDateField =
        cfg.bucket !== undefined ||
        fieldDef?.type === "date" ||
        fieldDef?.type === "datetime" ||
        cfg.field === "createdAt" ||
        cfg.field === "updatedAt"

      return {
        queryKey: ["metric-group-options", slug, cfg.field, relationTo, cfg.limit, cfg.where, cfg.bucket, cfg.orderBy],
        queryFn: async (): Promise<{ field: string; options: MetricGroupOption[]; allOptions: MetricGroupOption[] }> => {
          // 0. Time-bucket grouping on date/datetime fields
          if (isDateField) {
            const timeBuckets = generateTimeBuckets(cfg)
            return { field: cfg.field, options: timeBuckets.options, allOptions: timeBuckets.allOptions }
          }

          if (!client) return { field: cfg.field, options: [], allOptions: [] }

          function finalizeOptions(rawOptions: MetricGroupOption[], cfg: NormalizedGroupBy): { options: MetricGroupOption[]; allOptions: MetricGroupOption[] } {
            const sorted = [...rawOptions]
            if (cfg.orderBy === "asc") {
              sorted.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }))
            } else if (cfg.orderBy === "desc") {
              sorted.sort((a, b) => b.label.localeCompare(a.label, undefined, { numeric: true, sensitivity: "base" }))
            }
            return {
              options: sorted.slice(0, cfg.limit),
              allOptions: sorted,
            }
          }

          // 1. Relationship field: fetch related records to populate group options
          if (fieldDef?.type === "relationship" && relationTo) {
            try {
              let queryWhere = cfg.where
              try {
                // First discover which relation IDs actually exist in this collection
                const aggRes = await (client as any).collection(slug).aggregate({
                  distinctValues: { distinct: cfg.field, where: cfg.where },
                })
                if (aggRes && Array.isArray(aggRes.distinctValues)) {
                  const distinctIds = aggRes.distinctValues.filter((v: any) => v !== undefined && v !== null && v !== "")
                  if (distinctIds.length > 0) {
                    queryWhere = cfg.where ? { ...cfg.where, id: { in: distinctIds } } : { id: { in: distinctIds } }
                  }
                }
              } catch {
                // Fallback to querying relationTo directly
              }

              const queryLimit = cfg.isSubMetric ? Math.max(cfg.limit * 5, 100) : cfg.limit
              const res = await (client as any).collection(relationTo).find({
                limit: queryLimit,
                where: queryWhere,
              })
              const docs = (res?.docs ?? []) as Record<string, any>[]
              const relatedCol = (schemas as any)?.collections?.find((c: any) => c.slug === relationTo)
              const titleField = relatedCol?.admin?.useAsTitle || resolveCollectionTitleFieldName(relatedCol)
              const options = docs.map((doc) => {
                const titleVal = titleField ? doc[titleField] : undefined
                const label = titleVal ?? (doc.title || doc.name || doc.label || doc.slug || doc.id)
                return {
                  value: doc.id,
                  label: String(label),
                }
              })
              const finalized = finalizeOptions(options, cfg)
              return { field: cfg.field, options: finalized.options, allOptions: finalized.allOptions }
            } catch {
              return { field: cfg.field, options: [], allOptions: [] }
            }
          }

          // 2. Boolean field: Yes / No
          if (fieldDef?.type === "boolean") {
            const options: MetricGroupOption[] = [
              { value: true, label: fieldDef.label ? `${fieldDef.label}: Yes` : "Yes" },
              { value: false, label: fieldDef.label ? `${fieldDef.label}: No` : "No" },
            ]
            const finalized = finalizeOptions(options, cfg)
            return { field: cfg.field, options: finalized.options, allOptions: finalized.allOptions }
          }

          // 3. Predefined options (select / radio)
          if (hasPredefinedOptions) {
            const rawOptions = fieldDef.options as any[]
            const options: MetricGroupOption[] = rawOptions.map((opt: any) =>
              typeof opt === "string"
                ? { value: opt, label: opt }
                : { value: opt.value, label: String(opt.label ?? opt.value) },
            )
            const finalized = finalizeOptions(options, cfg)
            return { field: cfg.field, options: finalized.options, allOptions: finalized.allOptions }
          }

          // 4. Scalar field (text / number): discover distinct values
          try {
            const aggRes = await (client as any).collection(slug).aggregate({
              distinctValues: { distinct: cfg.field, where: cfg.where },
            })
            if (aggRes && Array.isArray(aggRes.distinctValues)) {
              const raw = aggRes.distinctValues as any[]
              const filtered = raw.filter((v) => v !== undefined && v !== null && v !== "")
              const options = filtered.map((val) => ({
                value: val,
                label: fieldDef?.type === "number" && fieldDef?.label ? `${fieldDef.label}: ${val}` : String(val),
              }))
              const finalized = finalizeOptions(options, cfg)
              return { field: cfg.field, options: finalized.options, allOptions: finalized.allOptions }
            }
          } catch {
            // Fallback: fetch distinct values via find
          }

          try {
            const res = await (client as any).collection(slug).find({
              limit: Math.max(cfg.limit * 5, 100),
              where: cfg.where,
            })
            const rawDocs = (res?.docs ?? []) as Record<string, any>[]
            const seen = new Set<any>()
            const options: MetricGroupOption[] = []

            for (const d of rawDocs) {
              const val = d[cfg.field]
              if (val !== undefined && val !== null && val !== "" && !seen.has(val)) {
                seen.add(val)
                options.push({
                  value: val,
                  label: fieldDef?.type === "number" && fieldDef?.label ? `${fieldDef.label}: ${val}` : String(val),
                })
              }
            }
            const finalized = finalizeOptions(options, cfg)
            return { field: cfg.field, options: finalized.options, allOptions: finalized.allOptions }
          } catch {
            return { field: cfg.field, options: [], allOptions: [] }
          }
        },
        enabled: Boolean(client && cfg.field),
        staleTime: 60_000,
      }
    }),
  })

  const isLoading = queries.some((q) => q.isLoading)
  const { groupsByField, allGroupsByField } = React.useMemo(() => {
    const map: Record<string, MetricGroupOption[]> = {}
    const allMap: Record<string, MetricGroupOption[]> = {}
    for (const q of queries) {
      if (q.data) {
        map[q.data.field] = q.data.options
        allMap[q.data.field] = q.data.allOptions
      }
    }
    return { groupsByField: map, allGroupsByField: allMap }
  }, [queries])

  return { groupsByField, allGroupsByField, isLoading }
}
