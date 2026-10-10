import * as React from "react"
import { useQueries } from "@tanstack/react-query"

import { useDyrected } from "../../../providers/dyrected-context"
import { resolveCollectionTitleFieldName } from "../../../lib/document-title"
import type { SerializedViewMetric, SerializedViewMetricGroupBy } from "./types"

export interface MetricGroupOption {
  value: any
  label: string
}

export interface NormalizedGroupBy {
  field: string
  limit: number
  orderBy?: "count" | "asc" | "desc"
  where?: Record<string, unknown>
  isSubMetric?: boolean
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
  }
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

      return {
        queryKey: ["metric-group-options", slug, cfg.field, relationTo, cfg.limit, cfg.where],
        queryFn: async (): Promise<{ field: string; options: MetricGroupOption[]; allOptions: MetricGroupOption[] }> => {
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
              const queryLimit = cfg.isSubMetric ? Math.max(cfg.limit * 5, 100) : cfg.limit
              const res = await (client as any).collection(relationTo).find({
                limit: queryLimit,
                where: cfg.where,
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
