import { useQuery } from "@tanstack/react-query"
import jexl from "jexl"
import { useDyrected } from "../../../providers/dyrected-context"
import type { SerializedViewMetric } from "./types"
import { resolveViewFilter } from "./resolve-view-filter"
import { formatMetricValue } from "./format-metric"

export interface ResolvedMetric {
  label: string
  value: number | null
  formatted: string
}

interface UseViewMetricsOptions {
  slug: string
  viewSlug: string
  metrics?: SerializedViewMetric[]
  filter?: Record<string, any> | string
}

interface MetricPlanEntry {
  index: number
  metric: SerializedViewMetric
  /** Aggregate keys for single-aggregate metrics, or named entries for multi-aggregate metrics. */
  single?: string
  named?: Record<string, string>
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
        if (metric.aggregate) {
          const key = `m${index}`
          input[key] = sanitizeAggregate(metric.aggregate)
          plan.push({ index, metric, single: key })
        } else if (metric.aggregates) {
          const named: Record<string, string> = {}
          for (const [name, operation] of Object.entries(metric.aggregates)) {
            const key = `m${index}_${name}`
            input[key] = sanitizeAggregate(operation)
            named[name] = key
          }
          plan.push({ index, metric, named })
        }
      })
      if (!Object.keys(input).length) return metrics.map(emptyMetric)

      let raw: Record<string, number | null>
      try {
        raw = await (client as any).collection(slug).aggregate(input)
      } catch {
        return metrics.map(emptyMetric)
      }

      return plan.map(({ metric, single, named }) => {
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

        return {
          label: metric.label,
          value,
          formatted: formatMetricValue(value, metric.format, metric.currency),
        }
      })
    },
    enabled: hasMetrics && !!client,
    staleTime: 15_000,
  })
}

/** Evaluates a metric expression with a `math` helper object available. */
function evalJexl(expression: string, context: Record<string, unknown>): number | null {
  try {
    const result = jexl.evalSync(expression, {
      ...context,
      math: {
        round: (value: number, decimals = 0) => {
          const factor = 10 ** decimals
          return Math.round(value * factor) / factor
        },
        floor: Math.floor,
        ceil: Math.ceil,
        abs: Math.abs,
        min: (...values: number[]) => Math.min(...values),
        max: (...values: number[]) => Math.max(...values),
      },
    })
    return typeof result === "number" && Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

function emptyMetric(metric: SerializedViewMetric): ResolvedMetric {
  return { label: metric.label, value: null, formatted: "—" }
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
