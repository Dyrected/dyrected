import { useQuery } from "@tanstack/react-query"
import { evaluateJexlSync } from "@dyrected/core"
import { useDyrected } from "../../../providers/dyrected-context"
import type { SerializedViewMetric, SerializedViewSubMetric } from "./types"
import { resolveViewFilter } from "./resolve-view-filter"
import { formatMetricValue } from "./format-metric"

export interface ResolvedSubMetric {
  label: string
  value: number | null
  formatted: string
}

export interface ResolvedMetric {
  label: string
  value: number | null
  formatted: string
  color?: string
  unit?: string
  subMetrics?: ResolvedSubMetric[]
}

interface UseViewMetricsOptions {
  slug: string
  viewSlug: string
  metrics?: SerializedViewMetric[]
  filter?: Record<string, any> | string
}

interface SubMetricPlanEntry {
  subIndex: number
  subMetric: SerializedViewSubMetric
  single?: string
  named?: Record<string, string>
}

interface MetricPlanEntry {
  index: number
  metric: SerializedViewMetric
  /** Aggregate keys for single-aggregate metrics, or named entries for multi-aggregate metrics. */
  single?: string
  named?: Record<string, string>
  subPlans?: SubMetricPlanEntry[]
}

/**
 * Resolves a view's summary metrics through the collection aggregation engine.
 *
 * Every metric is fanned into a single `aggregate()` request — counts, sums,
 * and averages run natively in the database rather than loading documents.
 * Derived values are computed afterwards with JEXL (`transform` over `value`,
 * or `expression` over the named `aggregates` map).
 */
export function useViewMetrics({ slug, viewSlug, metrics, filter }: UseViewMetricsOptions) {
  const { client } = useDyrected()
  const hasMetrics = !!metrics?.length

  return useQuery({
    queryKey: ["operational-view-metrics", slug, viewSlug, metrics ?? null, resolveViewFilter(filter) ?? null],
    queryFn: async (): Promise<ResolvedMetric[]> => {
      if (!client || !metrics?.length) return []

      // Fan every requested operation into one aggregate call.
      const input: Record<string, Record<string, unknown>> = {}
      const plan: MetricPlanEntry[] = []
      metrics.forEach((metric, index) => {
        let single: string | undefined
        let named: Record<string, string> | undefined

        if (metric.aggregate) {
          single = `m${index}`
          input[single] = sanitizeAggregate(metric.aggregate)
        } else if (metric.aggregates) {
          named = {}
          for (const [name, operation] of Object.entries(metric.aggregates)) {
            const key = `m${index}_${name}`
            input[key] = sanitizeAggregate(operation)
            named[name] = key
          }
        }

        const subPlans: SubMetricPlanEntry[] = []
        if (metric.subMetrics?.length) {
          metric.subMetrics.forEach((sub, subIndex) => {
            let subSingle: string | undefined
            let subNamed: Record<string, string> | undefined

            if (sub.aggregate) {
              subSingle = `m${index}_s${subIndex}`
              input[subSingle] = sanitizeAggregate(sub.aggregate)
            } else if (sub.aggregates) {
              subNamed = {}
              for (const [name, operation] of Object.entries(sub.aggregates)) {
                const key = `m${index}_s${subIndex}_${name}`
                input[key] = sanitizeAggregate(operation)
                subNamed[name] = key
              }
            }

            subPlans.push({ subIndex, subMetric: sub, single: subSingle, named: subNamed })
          })
        }

        plan.push({ index, metric, single, named, subPlans })
      })
      if (!Object.keys(input).length) return metrics.map(emptyMetric)

      let raw: Record<string, number | null>
      try {
        raw = await (client as any).collection(slug).aggregate(input)
      } catch {
        return metrics.map(emptyMetric)
      }

      return plan.map(({ metric, single, named, subPlans }) => {
        let value: number | null = null

        if (metric.expression && named) {
          // Named-aggregate expression, e.g. 'aggregates.totalBooked * aggregates.avgRate'
          const context: Record<string, number | null> = {}
          for (const name of Object.keys(metric.aggregates ?? {})) {
            context[name] = raw[named[name]] ?? null
          }
          value = evalJexl(metric.expression, { aggregates: context })
        } else if (!metric.expression) {
          const base = single !== undefined ? raw[single] : null
          if (base !== null && base !== undefined) {
            value = metric.transform ? evalJexl(metric.transform, { value: base }) : base
          }
        }

        const resolvedSubMetrics: ResolvedSubMetric[] = (subPlans ?? []).map(({ subMetric, single: subSingle, named: subNamed }) => {
          let subValue: number | null = null
          if (subMetric.expression && subNamed) {
            const context: Record<string, number | null> = {}
            for (const name of Object.keys(subMetric.aggregates ?? {})) {
              context[name] = raw[subNamed[name]] ?? null
            }
            subValue = evalJexl(subMetric.expression, { aggregates: context })
          } else if (!subMetric.expression) {
            const base = subSingle !== undefined ? raw[subSingle] : null
            if (base !== null && base !== undefined) {
              subValue = subMetric.transform ? evalJexl(subMetric.transform, { value: base }) : base
            }
          }

          return {
            label: subMetric.label,
            value: subValue,
            formatted: formatMetricValue(subValue, subMetric.format, subMetric.currency),
          }
        })

        return {
          label: metric.label,
          value,
          formatted: formatMetricValue(value, metric.format, metric.currency),
          color: metric.color,
          unit: metric.unit,
          subMetrics: resolvedSubMetrics.length > 0 ? resolvedSubMetrics : undefined,
        }
      })
    },
    enabled: hasMetrics && !!client,
    staleTime: 15_000,
  })
}

/** Evaluates a metric expression via core's shared Jexl helpers. */
function evalJexl(expression: string, context: Record<string, unknown>): number | null {
  try {
    const result = evaluateJexlSync(expression, context)
    return typeof result === "number" && Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

function emptyMetric(metric: SerializedViewMetric): ResolvedMetric {
  return {
    label: metric.label,
    value: null,
    formatted: "—",
    color: metric.color,
    unit: metric.unit,
    subMetrics: metric.subMetrics?.map((sub) => ({
      label: sub.label,
      value: null,
      formatted: "—",
    })),
  }
}

/** Keeps only valid aggregate keys so malformed configs can't leak into queries. */
function sanitizeAggregate(operation: NonNullable<SerializedViewMetric["aggregate"]>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (operation.count) out.count = "*"
  for (const key of ["sum", "avg", "min", "max"] as const) {
    if (typeof operation[key] === "string") out[key] = operation[key]
  }
  if (operation.cast && typeof operation.cast === "string") out.cast = operation.cast
  if (operation.where && typeof operation.where === "object" && !Array.isArray(operation.where)) {
    out.where = operation.where
  }
  return out
}
