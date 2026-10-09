import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { evaluateJexlSync } from "@dyrected/core"
import { useDyrected } from "../../../providers/dyrected-context"
import type { SerializedViewMetric, SerializedViewSubMetric } from "./types"
import { resolveViewFilter } from "./resolve-view-filter"
import { formatMetricValue } from "./format-metric"

export interface ResolvedSubMetric {
  label: string
  value: number | string | null
  formatted: string
  scope?: "view" | "filtered" | "collection"
}

export interface ResolvedMetric {
  label: string
  value: number | string | null
  formatted: string
  color?: string
  unit?: string
  scope?: "view" | "filtered" | "collection"
  subMetrics?: ResolvedSubMetric[]
}

export interface UseViewMetricsOptions {
  slug: string
  viewSlug: string
  metrics?: SerializedViewMetric[]
  metricsScope?: "view" | "filtered" | "collection"
  viewFilter?: Record<string, any> | string
  filteredWhere?: Record<string, any>
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

function mergeWhereConstraints(a?: Record<string, any>, b?: Record<string, any>): Record<string, any> | undefined {
  if (!a && !b) return undefined
  if (!a) return b
  if (!b) return a
  return { AND: [a, b] }
}

/**
 * Resolves a view's summary metrics through the collection aggregation engine.
 *
 * Every metric is fanned into a single `aggregate()` request — counts, sums,
 * and averages run natively in the database rather than loading documents.
 * Derived values are computed afterwards with JEXL (`transform` over `value`,
 * or `expression` over the named `aggregates` map).
 */
export function useViewMetrics({
  slug,
  viewSlug,
  metrics,
  metricsScope = "view",
  viewFilter,
  filteredWhere,
}: UseViewMetricsOptions) {
  const { client } = useDyrected()
  const resolvedViewFilter = resolveViewFilter(viewFilter)
  const resolvedFilteredWhere = filteredWhere ? resolveViewFilter(filteredWhere) : undefined

  // Determine if any metric relies on the active filtered scope
  const hasFilteredMetrics =
    (metricsScope === "filtered" && metrics?.some((m) => m.scope !== "view" && m.scope !== "collection")) ||
    metrics?.some(
      (m) =>
        m.scope === "filtered" ||
        m.subMetrics?.some((s) => s.scope === "filtered"),
    )

  const activeFilteredHash = hasFilteredMetrics ? JSON.stringify(resolvedFilteredWhere ?? null) : null
  const viewFilterHash = JSON.stringify(resolvedViewFilter ?? null)

  const getScopeWhere = (scope?: "view" | "filtered" | "collection"): Record<string, any> | undefined => {
    const effectiveScope = scope ?? metricsScope ?? "view"
    switch (effectiveScope) {
      case "collection":
        return undefined
      case "filtered":
        return resolvedFilteredWhere ?? resolvedViewFilter
      case "view":
      default:
        return resolvedViewFilter
    }
  }

  return useQuery({
    queryKey: [
      "operational-view-metrics",
      slug,
      viewSlug,
      metrics ?? null,
      metricsScope,
      viewFilterHash,
      activeFilteredHash,
    ],
    queryFn: async (): Promise<ResolvedMetric[]> => {
      if (!client || !metrics?.length) return []

      // Fan every requested operation into one aggregate call.
      const input: Record<string, Record<string, unknown>> = {}
      const plan: MetricPlanEntry[] = []
      metrics.forEach((metric, index) => {
        const metricBaseWhere = getScopeWhere(metric.scope)
        let single: string | undefined
        let named: Record<string, string> | undefined

        if (metric.aggregate) {
          single = `m${index}`
          input[single] = sanitizeAggregate(metric.aggregate, metricBaseWhere)
        } else if (metric.aggregates) {
          named = {}
          for (const [name, operation] of Object.entries(metric.aggregates)) {
            const key = `m${index}_${name}`
            input[key] = sanitizeAggregate(operation, metricBaseWhere)
            named[name] = key
          }
        }

        const subPlans: SubMetricPlanEntry[] = []
        if (metric.subMetrics?.length) {
          metric.subMetrics.forEach((sub, subIndex) => {
            const subBaseWhere = getScopeWhere(sub.scope ?? metric.scope)
            let subSingle: string | undefined
            let subNamed: Record<string, string> | undefined

            if (sub.aggregate) {
              subSingle = `m${index}_s${subIndex}`
              input[subSingle] = sanitizeAggregate(sub.aggregate, subBaseWhere)
            } else if (sub.aggregates) {
              subNamed = {}
              for (const [name, operation] of Object.entries(sub.aggregates)) {
                const key = `m${index}_s${subIndex}_${name}`
                input[key] = sanitizeAggregate(operation, subBaseWhere)
                subNamed[name] = key
              }
            }

            subPlans.push({ subIndex, subMetric: sub, single: subSingle, named: subNamed })
          })
        }

        plan.push({ index, metric, single, named, subPlans })
      })
      if (!Object.keys(input).length) return metrics.map((m) => emptyMetric(m, metricsScope))

      let raw: Record<string, number | string | null>
      try {
        raw = await (client as any).collection(slug).aggregate(input)
      } catch {
        return metrics.map((m) => emptyMetric(m, metricsScope))
      }

      return plan.map(({ metric, single, named, subPlans }) => {
        let value: number | string | null = null

        if (metric.expression && named) {
          // Named-aggregate expression, e.g. 'aggregates.totalBooked * aggregates.avgRate'
          const context: Record<string, number | null> = {}
          for (const name of Object.keys(metric.aggregates ?? {})) {
            context[name] = typeof raw[named[name]] === "number" ? (raw[named[name]] as number) : null
          }
          value = evalJexl(metric.expression, { aggregates: context })
        } else if (!metric.expression) {
          const base = single !== undefined ? raw[single] : null
          if (base !== null && base !== undefined) {
            value = metric.transform ? evalJexl(metric.transform, { value: base }) : base
          }
        }

        const effectiveScope = metric.scope ?? metricsScope ?? "view"

        const resolvedSubMetrics: ResolvedSubMetric[] = (subPlans ?? []).map(({ subMetric, single: subSingle, named: subNamed }) => {
          let subValue: number | string | null = null
          if (subMetric.expression && subNamed) {
            const context: Record<string, number | null> = {}
            for (const name of Object.keys(subMetric.aggregates ?? {})) {
              context[name] = typeof raw[subNamed[name]] === "number" ? (raw[subNamed[name]] as number) : null
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
            scope: subMetric.scope ?? effectiveScope,
          }
        })

        return {
          label: metric.label,
          value,
          formatted: formatMetricValue(value, metric.format, metric.currency),
          color: metric.color,
          unit: metric.unit,
          scope: effectiveScope,
          subMetrics: resolvedSubMetrics.length > 0 ? resolvedSubMetrics : undefined,
        }
      })
    },
    enabled: Boolean(metrics?.length && client),
    placeholderData: keepPreviousData,
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

function emptyMetric(metric: SerializedViewMetric, defaultScope?: "view" | "filtered" | "collection"): ResolvedMetric {
  const effectiveScope = metric.scope ?? defaultScope ?? "view"
  return {
    label: metric.label,
    value: null,
    formatted: "—",
    color: metric.color,
    unit: metric.unit,
    scope: effectiveScope,
    subMetrics: metric.subMetrics?.map((sub) => ({
      label: sub.label,
      value: null,
      formatted: "—",
      scope: sub.scope ?? effectiveScope,
    })),
  }
}

/** Keeps only valid aggregate keys and merges scope where constraints. */
function sanitizeAggregate(
  operation: NonNullable<SerializedViewMetric["aggregate"]>,
  baseWhere?: Record<string, any>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (operation.count) out.count = "*"
  if ((operation as any).countDistinct && typeof (operation as any).countDistinct === "string") {
    out.countDistinct = (operation as any).countDistinct
  }
  for (const key of ["sum", "avg", "min", "max"] as const) {
    if (typeof operation[key] === "string") out[key] = operation[key]
  }
  if (operation.cast && typeof operation.cast === "string") out.cast = operation.cast

  const opWhere = operation.where && typeof operation.where === "object" && !Array.isArray(operation.where)
    ? (operation.where as Record<string, any>)
    : undefined

  const combined = mergeWhereConstraints(baseWhere, opWhere)
  if (combined) {
    out.where = combined
  }
  return out
}
