import * as React from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { evaluateJexlSync } from "@dyrected/core"
import { useDyrected } from "../../../providers/dyrected-context"
import type { SerializedViewMetric, SerializedViewSubMetric } from "./types"
import { resolveViewFilter } from "./resolve-view-filter"
import { formatMetricValue } from "./format-metric"
import { normalizeGroupBy, useMetricGroups, type MetricGroupOption } from "./use-metric-groups"

export interface MetricFilterTarget {
  columnId: string
  value: unknown
  operator?: string
}

export interface ResolvedSubMetricGroup {
  value: unknown
  label: string
  filterTarget?: MetricFilterTarget
}

export interface ResolvedSubMetric {
  label: string
  value: number | string | null
  formatted: string
  color?: string
  scope?: "view" | "filtered" | "collection"
  filterTarget?: MetricFilterTarget
  /** Present if this submetric is an "Other (N)" roll-up with drilldown items */
  overflowGroups?: ResolvedSubMetricGroup[]
}

export interface ResolvedMetric {
  label: string
  value: number | string | null
  formatted: string
  color?: string
  unit?: string
  scope?: "view" | "filtered" | "collection"
  span?: 1 | 2 | 3 | 4 | "full"
  showDistribution?: boolean
  subMetrics?: ResolvedSubMetric[]
  filterTarget?: MetricFilterTarget
}

export interface UseViewMetricsOptions {
  slug: string
  viewSlug: string
  metrics?: SerializedViewMetric[]
  metricsScope?: "view" | "filtered" | "collection"
  viewFilter?: Record<string, any> | string
  filteredWhere?: Record<string, any>
  schema?: any
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

export function interpolateLabel(template: string | undefined, group: { value: any; label: string }): string {
  if (!template || !template.trim()) {
    return group.label
  }
  let str = template
  if (str.includes("{{group.label}}")) {
    str = str.replaceAll("{{group.label}}", group.label)
  }
  if (str.includes("{{group.value}}")) {
    str = str.replaceAll("{{group.value}}", String(group.value))
  }
  if (!template.includes("{{group.label}}") && !template.includes("{{group.value}}")) {
    return `${group.label} - ${template}`
  }
  return str
}

function mergeGroupWhere(
  op: NonNullable<SerializedViewMetric["aggregate"]> | undefined,
  groupWhere: Record<string, any>,
) {
  if (!op) return undefined
  const mergedWhere = mergeWhereConstraints(op.where, groupWhere)
  return {
    ...op,
    where: mergedWhere,
  }
}

function mergeGroupWhereMap(
  aggregates: Record<string, NonNullable<SerializedViewMetric["aggregate"]>> | undefined,
  groupWhere: Record<string, any>,
) {
  if (!aggregates) return undefined
  const res: Record<string, NonNullable<SerializedViewMetric["aggregate"]>> = {}
  for (const [k, v] of Object.entries(aggregates)) {
    res[k] = mergeGroupWhere(v, groupWhere)!
  }
  return res
}

export function inferFilterTargetFromWhere(where?: Record<string, any>): MetricFilterTarget | undefined {
  if (!where || typeof where !== "object" || Array.isArray(where)) return undefined
  const keys = Object.keys(where).filter((k) => k !== "AND" && k !== "OR")
  if (keys.length !== 1) return undefined
  const columnId = keys[0]
  const condition = where[columnId]
  if (condition === undefined || condition === null) return undefined

  if (typeof condition === "object" && !Array.isArray(condition)) {
    if ("equals" in condition) {
      return { columnId, value: condition.equals, operator: "eq" }
    }
    if ("in" in condition && Array.isArray(condition.in)) {
      return { columnId, value: condition.in, operator: "in" }
    }
    if ("not_equals" in condition) {
      return { columnId, value: condition.not_equals, operator: "ne" }
    }
  } else {
    return { columnId, value: condition, operator: "eq" }
  }
  return undefined
}

export function expandMetrics(
  metrics: SerializedViewMetric[] | undefined,
  groupsByField: Record<string, MetricGroupOption[]>,
  allGroupsByField: Record<string, MetricGroupOption[]> = {},
): SerializedViewMetric[] {
  if (!metrics?.length) return []

  const expanded: SerializedViewMetric[] = []

  for (const metric of metrics) {
    const cardGb = normalizeGroupBy(metric.groupBy)
    const cardGroups = cardGb ? groupsByField[cardGb.field] : undefined

    if (cardGb && cardGroups) {
      // Expand metric into 1 card per group
      for (const group of cardGroups) {
        const groupWhere = { [cardGb.field]: { equals: group.value } }

        const expandedSubMetrics = metric.subMetrics?.map((sub) => {
          return {
            ...sub,
            aggregate: mergeGroupWhere(sub.aggregate, groupWhere),
            aggregates: mergeGroupWhereMap(sub.aggregates, groupWhere),
          }
        })

        const filterTarget: MetricFilterTarget = { columnId: cardGb.field, value: group.value, operator: "eq" }

        expanded.push({
          ...metric,
          _filterTarget: filterTarget,
          _groupOrder: cardGb.orderBy,
          label: interpolateLabel(metric.label, group),
          groupBy: undefined,
          aggregate: mergeGroupWhere(metric.aggregate, groupWhere),
          aggregates: mergeGroupWhereMap(metric.aggregates, groupWhere),
          subMetrics: expandedSubMetrics,
        } as any)
      }
    } else {
      // Single card: check if any sub-metrics specify groupBy
      let hasGroupedSub = false
      const expandedSubMetrics: SerializedViewSubMetric[] = []

      if (metric.subMetrics?.length) {
        for (const sub of metric.subMetrics) {
          const subGb = normalizeGroupBy(sub.groupBy)
          const subGroups = subGb ? groupsByField[subGb.field] : undefined
          const allSubGroups = subGb ? allGroupsByField[subGb.field] ?? subGroups : undefined

          if (subGb && subGroups) {
            hasGroupedSub = true
            const topGroups = subGroups
            for (const group of topGroups) {
              const groupWhere = { [subGb.field]: { equals: group.value } }
              const subFilterTarget: MetricFilterTarget = { columnId: subGb.field, value: group.value, operator: "eq" }
              expandedSubMetrics.push({
                ...sub,
                _filterTarget: subFilterTarget,
                _groupOrder: subGb.orderBy,
                label: interpolateLabel(sub.label, group),
                groupBy: undefined,
                aggregate: mergeGroupWhere(sub.aggregate, groupWhere),
                aggregates: mergeGroupWhereMap(sub.aggregates, groupWhere),
              } as any)
            }

            // High cardinality roll-up: if total discovered groups exceed the Top-N limit, roll up into "Other (N)"
            if (allSubGroups && allSubGroups.length > topGroups.length) {
              const overflow = allSubGroups.slice(topGroups.length)
              const topValues = topGroups.map((g) => g.value)
              const otherWhere = { [subGb.field]: { not_in: topValues } }
              const otherFilterTarget: MetricFilterTarget = { columnId: subGb.field, value: topValues, operator: "not_in" }
              expandedSubMetrics.push({
                ...sub,
                _filterTarget: otherFilterTarget,
                _overflowGroups: overflow.map((g) => ({
                  value: g.value,
                  label: g.label,
                  filterTarget: { columnId: subGb.field, value: g.value, operator: "eq" },
                })),
                _groupOrder: subGb.orderBy,
                label: `Other (${overflow.length})`,
                color: "gray",
                groupBy: undefined,
                aggregate: mergeGroupWhere(sub.aggregate, otherWhere),
                aggregates: mergeGroupWhereMap(sub.aggregates, otherWhere),
              } as any)
            }
          } else {
            expandedSubMetrics.push(sub)
          }
        }
      }

      expanded.push({
        ...metric,
        subMetrics: hasGroupedSub ? expandedSubMetrics : metric.subMetrics,
      })
    }
  }

  return expanded
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
  schema,
}: UseViewMetricsOptions) {
  const { client } = useDyrected()
  const resolvedViewFilter = resolveViewFilter(viewFilter)
  const resolvedFilteredWhere = filteredWhere ? resolveViewFilter(filteredWhere) : undefined

  const { groupsByField, allGroupsByField, isLoading: isGroupsLoading } = useMetricGroups({ slug, metrics, schema })

  const hasAnyGroupBy = React.useMemo(() => {
    return (
      metrics?.some(
        (m) => Boolean(m.groupBy) || m.subMetrics?.some((s) => Boolean(s.groupBy)),
      ) ?? false
    )
  }, [metrics])

  const expandedMetrics = React.useMemo(() => {
    return expandMetrics(metrics, groupsByField, allGroupsByField)
  }, [metrics, groupsByField, allGroupsByField])

  // Determine if any metric relies on the active filtered scope
  const hasFilteredMetrics =
    (metricsScope === "filtered" && expandedMetrics?.some((m) => m.scope !== "view" && m.scope !== "collection")) ||
    expandedMetrics?.some(
      (m) =>
        m.scope === "filtered" ||
        m.subMetrics?.some((s) => s.scope === "filtered"),
    )

  const activeFilteredHash = hasFilteredMetrics ? JSON.stringify(resolvedFilteredWhere ?? null) : null
  const viewFilterHash = JSON.stringify(resolvedViewFilter ?? null)
  const groupsHash = React.useMemo(() => JSON.stringify(groupsByField), [groupsByField])

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
      groupsHash,
    ],
    queryFn: async (): Promise<ResolvedMetric[]> => {
      if (!client || !expandedMetrics?.length) return []

      // Fan every requested operation into one aggregate call.
      const input: Record<string, Record<string, unknown>> = {}
      const plan: MetricPlanEntry[] = []
      expandedMetrics.forEach((metric, index) => {
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
      if (!Object.keys(input).length) return expandedMetrics.map((m) => emptyMetric(m, metricsScope))

      let raw: Record<string, number | string | null>
      try {
        raw = await (client as any).collection(slug).aggregate(input)
      } catch {
        return expandedMetrics.map((m) => emptyMetric(m, metricsScope))
      }

      const resolved = plan.map(({ metric, single, named, subPlans }) => {
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
            color: subMetric.color,
            scope: subMetric.scope ?? effectiveScope,
            filterTarget: (subMetric as any)._filterTarget || inferFilterTargetFromWhere(subMetric.aggregate?.where),
            overflowGroups: (subMetric as any)._overflowGroups,
          }
        })

        // Sort submetrics descending if orderBy is "count", keeping overflow at the end
        if ((subPlans?.[0]?.subMetric as any)?._groupOrder === "count") {
          resolvedSubMetrics.sort((a, b) => {
            if (a.overflowGroups) return 1
            if (b.overflowGroups) return -1
            const numA = typeof a.value === "number" ? a.value : -Infinity
            const numB = typeof b.value === "number" ? b.value : -Infinity
            return numB - numA
          })
        }

        return {
          label: metric.label,
          value,
          formatted: formatMetricValue(value, metric.format, metric.currency),
          color: metric.color,
          unit: metric.unit,
          scope: effectiveScope,
          span: metric.span,
          showDistribution: metric.showDistribution,
          subMetrics: resolvedSubMetrics.length > 0 ? resolvedSubMetrics : undefined,
          filterTarget: (metric as any)._filterTarget || inferFilterTargetFromWhere(metric.aggregate?.where),
        }
      })

      // Sort consecutive cards that share a group field if orderBy is "count"
      let i = 0
      while (i < resolved.length) {
        const itemPlan = plan[i]
        const order = (itemPlan?.metric as any)?._groupOrder
        const groupField = (itemPlan?.metric as any)?._filterTarget?.columnId
        if (order === "count" && groupField) {
          let j = i
          while (j < resolved.length && (plan[j]?.metric as any)?._filterTarget?.columnId === groupField) {
            j++
          }
          const slice = resolved.slice(i, j)
          slice.sort((a, b) => {
            const numA = typeof a.value === "number" ? a.value : -Infinity
            const numB = typeof b.value === "number" ? b.value : -Infinity
            return numB - numA
          })
          resolved.splice(i, slice.length, ...slice)
          i = j
        } else {
          i++
        }
      }

      return resolved
    },
    enabled: Boolean(metrics?.length && client && (!hasAnyGroupBy || !isGroupsLoading)),
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
    span: metric.span,
    showDistribution: metric.showDistribution,
    filterTarget: (metric as any)._filterTarget || inferFilterTargetFromWhere(metric.aggregate?.where),
    subMetrics: metric.subMetrics?.map((sub) => ({
      label: sub.label,
      value: null,
      formatted: "—",
      color: sub.color,
      scope: sub.scope ?? effectiveScope,
      filterTarget: (sub as any)._filterTarget || inferFilterTargetFromWhere(sub.aggregate?.where),
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
