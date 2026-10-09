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
      map.set(cardGb.field, cardGb)
    }

    if (m.subMetrics?.length) {
      for (const sub of m.subMetrics) {
        const subGb = normalizeGroupBy(sub.groupBy)
        if (subGb && !map.has(subGb.field)) {
          map.set(subGb.field, subGb)
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
        queryFn: async (): Promise<{ field: string; options: MetricGroupOption[] }> => {
          if (!client) return { field: cfg.field, options: [] }

          // 1. Relationship field: fetch related records to populate group options
          if (fieldDef?.type === "relationship" && relationTo) {
            try {
              const res = await (client as any).collection(relationTo).find({
                limit: cfg.limit,
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
              return { field: cfg.field, options }
            } catch {
              return { field: cfg.field, options: [] }
            }
          }

          // 2. Boolean field: Yes / No
          if (fieldDef?.type === "boolean") {
            const options: MetricGroupOption[] = [
              { value: true, label: fieldDef.label ? `${fieldDef.label}: Yes` : "Yes" },
              { value: false, label: fieldDef.label ? `${fieldDef.label}: No` : "No" },
            ]
            return { field: cfg.field, options }
          }

          // 3. Predefined options (select / radio)
          if (hasPredefinedOptions) {
            const rawOptions = fieldDef.options as any[]
            const options: MetricGroupOption[] = rawOptions.slice(0, cfg.limit).map((opt: any) =>
              typeof opt === "string"
                ? { value: opt, label: opt }
                : { value: opt.value, label: String(opt.label ?? opt.value) },
            )
            return { field: cfg.field, options }
          }

          // 4. Scalar field (text / number): discover distinct values
          try {
            const aggRes = await (client as any).collection(slug).aggregate({
              distinctValues: { distinct: cfg.field, where: cfg.where },
            })
            if (aggRes && Array.isArray(aggRes.distinctValues)) {
              const raw = aggRes.distinctValues as any[]
              const filtered = raw.filter((v) => v !== undefined && v !== null && v !== "")
              const options = filtered.slice(0, cfg.limit).map((val) => ({
                value: val,
                label: fieldDef?.type === "number" && fieldDef?.label ? `${fieldDef.label}: ${val}` : String(val),
              }))
              return { field: cfg.field, options }
            }
          } catch {
            // Fallback: fetch distinct values via find
          }

          try {
            const res = await (client as any).collection(slug).find({
              limit: Math.max(cfg.limit * 5, 50),
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
                if (options.length >= cfg.limit) break
              }
            }
            return { field: cfg.field, options }
          } catch {
            return { field: cfg.field, options: [] }
          }
        },
        enabled: Boolean(client && cfg.field),
        staleTime: 60_000,
      }
    }),
  })

  const isLoading = queries.some((q) => q.isLoading)
  const groupsByField = React.useMemo(() => {
    const map: Record<string, MetricGroupOption[]> = {}
    for (const q of queries) {
      if (q.data) {
        map[q.data.field] = q.data.options
      }
    }
    return map
  }, [queries])

  return { groupsByField, isLoading }
}
