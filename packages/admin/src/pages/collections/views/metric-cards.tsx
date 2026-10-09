import { Database, Filter, Layers } from "lucide-react"
import { Skeleton } from "../../../components/ui/skeleton"
import { Card, CardContent } from "../../../components/ui/card"
import { cn } from "../../../lib/utils"
import type { ResolvedMetric, MetricFilterTarget } from "./use-view-metrics"

export interface MetricCardsProps {
  metrics: ResolvedMetric[]
  isLoading?: boolean
  isRefetching?: boolean
  className?: string
  activeFilters?: Array<{ id: string; value: unknown }>
  onToggleFilter?: (target: MetricFilterTarget) => void
}

function isFilterActive(
  target?: MetricFilterTarget,
  activeFilters?: Array<{ id: string; value: unknown }>
): boolean {
  if (!target || !activeFilters?.length) return false
  return activeFilters.some((f) => {
    if (f.id !== target.columnId) return false
    if (f.value === target.value) return true
    if (typeof f.value === "object" && f.value !== null) {
      const opVal = f.value as any
      if (opVal.value === target.value) return true
      if (opVal.operator === target.operator && opVal.value === target.value) return true
      if (Array.isArray(opVal.value) && Array.isArray(target.value)) {
        return JSON.stringify(opVal.value) === JSON.stringify(target.value)
      }
    }
    return false
  })
}

/**
 * Summary stat cards rendered above an operational view.
 * Values come from the collection aggregation engine — see `useViewMetrics`.
 */
function getGridCols(count: number) {
  if (count <= 1) return "dy-grid-cols-1"
  return "dy-grid-cols-[repeat(auto-fit,minmax(220px,1fr))]"
}

interface ColorTokens {
  card: string
  header: string
  value: string
  unit: string
  subRow: string
  subLabel: string
  subValue: string
}

const SCOPE_CONFIGS = {
  filtered: {
    icon: Filter,
    title: "Filtered scope: synced with active table filters and search",
    label: "Filtered scope",
  },
  collection: {
    icon: Database,
    title: "Collection scope: aggregated across all records in collection",
    label: "Collection scope",
  },
  view: {
    icon: Layers,
    title: "View scope: aggregated across saved view definition",
    label: "View scope",
  },
} as const

interface MetricScopeIconProps {
  scope?: "view" | "filtered" | "collection"
  className?: string
  sizeClassName?: string
}

function MetricScopeIcon({ scope, className, sizeClassName = "dy-h-3 dy-w-3" }: MetricScopeIconProps) {
  if (!scope || !(scope in SCOPE_CONFIGS)) return null
  const config = SCOPE_CONFIGS[scope]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "dy-inline-flex dy-items-center dy-justify-center dy-opacity-50 hover:dy-opacity-90 dy-transition-opacity dy-cursor-help",
        className
      )}
      title={config.title}
      aria-label={config.label}
    >
      <Icon className={sizeClassName} />
    </span>
  )
}

function resolveMetricColor(color?: string): ColorTokens {
  switch (color?.toLowerCase()) {
    case "purple":
    case "violet":
      return {
        card: "dy-bg-purple-500/[0.04] dark:dy-bg-purple-500/[0.08] dy-border-purple-500/20 dark:dy-border-purple-500/30 dark:hover:dy-border-purple-500/45",
        header: "dy-text-purple-700 dark:dy-text-purple-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-purple-700/80 dark:dy-text-purple-300/80",
        subRow: "dy-border-purple-500/15 dark:dy-border-purple-500/25",
        subLabel: "dy-text-purple-700/80 dark:dy-text-purple-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
      }
    case "indigo":
      return {
        card: "dy-bg-indigo-500/[0.04] dark:dy-bg-indigo-500/[0.08] dy-border-indigo-500/20 dark:dy-border-indigo-500/30 dark:hover:dy-border-indigo-500/45",
        header: "dy-text-indigo-700 dark:dy-text-indigo-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-indigo-700/80 dark:dy-text-indigo-300/80",
        subRow: "dy-border-indigo-500/15 dark:dy-border-indigo-500/25",
        subLabel: "dy-text-indigo-700/80 dark:dy-text-indigo-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
      }
    case "cyan":
      return {
        card: "dy-bg-cyan-500/[0.04] dark:dy-bg-cyan-500/[0.08] dy-border-cyan-500/20 dark:dy-border-cyan-500/30 dark:hover:dy-border-cyan-500/45",
        header: "dy-text-cyan-700 dark:dy-text-cyan-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-cyan-700/80 dark:dy-text-cyan-300/80",
        subRow: "dy-border-cyan-500/15 dark:dy-border-cyan-500/25",
        subLabel: "dy-text-cyan-700/80 dark:dy-text-cyan-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
      }
    case "emerald":
    case "green":
      return {
        card: "dy-bg-emerald-500/[0.04] dark:dy-bg-emerald-500/[0.08] dy-border-emerald-500/20 dark:dy-border-emerald-500/30 dark:hover:dy-border-emerald-500/45",
        header: "dy-text-emerald-700 dark:dy-text-emerald-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-emerald-700/80 dark:dy-text-emerald-300/80",
        subRow: "dy-border-emerald-500/15 dark:dy-border-emerald-500/25",
        subLabel: "dy-text-emerald-700/80 dark:dy-text-emerald-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
      }
    case "orange":
      return {
        card: "dy-bg-orange-500/[0.04] dark:dy-bg-orange-500/[0.08] dy-border-orange-500/20 dark:dy-border-orange-500/30 dark:hover:dy-border-orange-500/45",
        header: "dy-text-orange-800 dark:dy-text-orange-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-orange-800/80 dark:dy-text-orange-300/80",
        subRow: "dy-border-orange-500/15 dark:dy-border-orange-500/25",
        subLabel: "dy-text-orange-800/80 dark:dy-text-orange-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
      }
    case "amber":
    case "yellow":
    case "brown":
      return {
        card: "dy-bg-amber-500/[0.04] dark:dy-bg-amber-500/[0.08] dy-border-amber-500/20 dark:dy-border-amber-500/30 dark:hover:dy-border-amber-500/45",
        header: "dy-text-amber-800 dark:dy-text-amber-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-amber-800/80 dark:dy-text-amber-300/80",
        subRow: "dy-border-amber-500/15 dark:dy-border-amber-500/25",
        subLabel: "dy-text-amber-800/80 dark:dy-text-amber-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
      }
    case "rose":
    case "pink":
    case "red":
    case "crimson":
      return {
        card: "dy-bg-rose-500/[0.04] dark:dy-bg-rose-500/[0.08] dy-border-rose-500/20 dark:dy-border-rose-500/30 dark:hover:dy-border-rose-500/45",
        header: "dy-text-rose-700 dark:dy-text-rose-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-rose-700/80 dark:dy-text-rose-300/80",
        subRow: "dy-border-rose-500/15 dark:dy-border-rose-500/25",
        subLabel: "dy-text-rose-700/80 dark:dy-text-rose-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
      }
    case "blue":
    case "sky":
      return {
        card: "dy-bg-blue-500/[0.04] dark:dy-bg-blue-500/[0.08] dy-border-blue-500/20 dark:dy-border-blue-500/30 dark:hover:dy-border-blue-500/45",
        header: "dy-text-blue-700 dark:dy-text-blue-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-blue-700/80 dark:dy-text-blue-300/80",
        subRow: "dy-border-blue-500/15 dark:dy-border-blue-500/25",
        subLabel: "dy-text-blue-700/80 dark:dy-text-blue-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
      }
    default:
      return {
        card: "dy-bg-card dy-border-border/60 dark:dy-border-border/60 dark:dy-bg-card/90 dark:hover:dy-border-border",
        header: "dy-text-muted-foreground",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-muted-foreground",
        subRow: "dy-border-border/40",
        subLabel: "dy-text-muted-foreground",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
      }
  }
}

const COLOR_MAP: Record<string, { bg: string; hoverBg: string; dot: string }> = {
  emerald: { bg: "dy-bg-emerald-500", hoverBg: "hover:dy-bg-emerald-400", dot: "dy-bg-emerald-500" },
  green: { bg: "dy-bg-emerald-500", hoverBg: "hover:dy-bg-emerald-400", dot: "dy-bg-emerald-500" },
  sky: { bg: "dy-bg-sky-500", hoverBg: "hover:dy-bg-sky-400", dot: "dy-bg-sky-500" },
  blue: { bg: "dy-bg-blue-500", hoverBg: "hover:dy-bg-blue-400", dot: "dy-bg-blue-500" },
  amber: { bg: "dy-bg-amber-500", hoverBg: "hover:dy-bg-amber-400", dot: "dy-bg-amber-500" },
  yellow: { bg: "dy-bg-amber-500", hoverBg: "hover:dy-bg-amber-400", dot: "dy-bg-amber-500" },
  violet: { bg: "dy-bg-violet-500", hoverBg: "hover:dy-bg-violet-400", dot: "dy-bg-violet-500" },
  purple: { bg: "dy-bg-purple-500", hoverBg: "hover:dy-bg-purple-400", dot: "dy-bg-purple-500" },
  rose: { bg: "dy-bg-rose-500", hoverBg: "hover:dy-bg-rose-400", dot: "dy-bg-rose-500" },
  red: { bg: "dy-bg-rose-500", hoverBg: "hover:dy-bg-rose-400", dot: "dy-bg-rose-500" },
  pink: { bg: "dy-bg-rose-500", hoverBg: "hover:dy-bg-rose-400", dot: "dy-bg-rose-500" },
  cyan: { bg: "dy-bg-cyan-500", hoverBg: "hover:dy-bg-cyan-400", dot: "dy-bg-cyan-500" },
  indigo: { bg: "dy-bg-indigo-500", hoverBg: "hover:dy-bg-indigo-400", dot: "dy-bg-indigo-500" },
  orange: { bg: "dy-bg-orange-500", hoverBg: "hover:dy-bg-orange-400", dot: "dy-bg-orange-500" },
  teal: { bg: "dy-bg-teal-500", hoverBg: "hover:dy-bg-teal-400", dot: "dy-bg-teal-500" },
}

const DEFAULT_PALETTE_ORDER = [
  COLOR_MAP.emerald,
  COLOR_MAP.sky,
  COLOR_MAP.amber,
  COLOR_MAP.violet,
  COLOR_MAP.rose,
  COLOR_MAP.cyan,
  COLOR_MAP.indigo,
  COLOR_MAP.orange,
  COLOR_MAP.teal,
]

function getSubMetricPalette(sub: ResolvedSubMetric, index: number) {
  if (sub.color && COLOR_MAP[sub.color.toLowerCase()]) {
    return COLOR_MAP[sub.color.toLowerCase()]
  }
  return DEFAULT_PALETTE_ORDER[index % DEFAULT_PALETTE_ORDER.length]
}

export function MetricCards({
  metrics,
  isLoading = false,
  isRefetching = false,
  className,
  activeFilters,
  onToggleFilter,
}: MetricCardsProps) {
  if (!metrics.length && !isLoading) return null

  const count = isLoading ? Math.max(metrics.length, 3) : metrics.length

  return (
    <div className={cn("dy-grid dy-gap-3", getGridCols(count), className)}>
      {isLoading
        ? Array.from({ length: count }, (_, i) => {
          const isLastOdd = count % 2 === 1 && i === count - 1
          return (
            <Card
              key={i}
              className={cn(
                "dy-border-border/50 dy-bg-card",
                isLastOdd && "dy-col-span-2 lg:dy-col-span-1"
              )}
            >
              <CardContent className="dy-space-y-2 !dy-p-4">
                <Skeleton className="dy-h-3 dy-w-24" />
                <Skeleton className="dy-h-6 dy-w-16" />
              </CardContent>
            </Card>
          )
        })
        : metrics.map((metric, i) => {
          const isLastOdd = count % 2 === 1 && i === count - 1
          const colorStyles = resolveMetricColor(metric.color)
          const hasSubMetrics = Boolean(metric.subMetrics?.length)
          const isFullWidthMobile = hasSubMetrics || isLastOdd

          const isCardClickable = Boolean(metric.filterTarget && onToggleFilter)
          const isCardActive = isFilterActive(metric.filterTarget, activeFilters)

          const numericSubItems = (metric.subMetrics ?? []).map((sub, idx) => {
            const num = typeof sub.value === "number" && !isNaN(sub.value) && sub.value > 0 ? sub.value : 0
            return { sub, idx, num }
          })
          const totalSubSum = numericSubItems.reduce((acc, curr) => acc + curr.num, 0)
          const shouldShowDistribution =
            metric.showDistribution !== false &&
            (metric.subMetrics?.length ?? 0) >= 2 &&
            totalSubSum > 0

          return (
            <Card
              key={metric.label}
              role={isCardClickable ? "button" : undefined}
              tabIndex={isCardClickable ? 0 : undefined}
              onClick={isCardClickable ? () => onToggleFilter?.(metric.filterTarget!) : undefined}
              onKeyDown={
                isCardClickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onToggleFilter?.(metric.filterTarget!)
                      }
                    }
                  : undefined
              }
              title={
                isCardClickable
                  ? isCardActive
                    ? `Active filter: click to clear ${metric.label}`
                    : `Click to filter view by ${metric.label}`
                  : undefined
              }
              className={cn(
                colorStyles.card,
                "dy-shadow-xs dy-transition-all dy-duration-200",
                isCardClickable && "dy-cursor-pointer hover:dy-shadow-md hover:dy-scale-[1.01] hover:dy-border-primary/50 select-none",
                isCardActive && "dy-ring-2 dy-ring-primary/80 dy-border-primary dy-shadow-sm",
                isRefetching && "dy-opacity-90",
                isFullWidthMobile ? "dy-col-span-2 lg:dy-col-span-1" : "dy-col-span-1"
              )}
            >
              <CardContent className="dy-space-y-2 !dy-p-4">
                <div className="dy-flex dy-items-center dy-justify-between dy-gap-2">
                  <div className="dy-flex dy-items-center dy-gap-1.5">
                    <p className={cn("dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-wider", colorStyles.header)}>
                      {metric.label}
                    </p>
                    <MetricScopeIcon scope={metric.scope} />
                    {isCardActive && (
                      <span className="dy-inline-flex dy-items-center dy-text-[9px] dy-font-semibold dy-bg-primary/10 dy-text-primary dy-px-1.5 dy-py-0.5 dy-rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  {isRefetching && (
                    <span className="dy-inline-block dy-h-1.5 dy-w-1.5 dy-rounded-full dy-bg-current dy-animate-ping dy-opacity-75" title="Updating..." />
                  )}
                </div>
                <div className="dy-flex dy-items-baseline dy-justify-between dy-gap-2">
                  <p className={cn("dy-text-xl sm:dy-text-2xl dy-font-bold dy-tracking-tight dy-tabular-nums", colorStyles.value)}>
                    {metric.formatted}
                  </p>
                  {metric.unit && (
                    <span className={cn("dy-text-xs dy-font-medium", colorStyles.unit)}>
                      {metric.unit}
                    </span>
                  )}
                </div>

                {shouldShowDistribution && (
                  <div
                    role="group"
                    aria-label="Sub-metric distribution breakdown"
                    className="dy-w-full dy-h-1.5 dy-rounded-full dy-bg-muted/40 dy-overflow-hidden dy-flex dy-gap-0.5 dy-my-2.5 select-none"
                  >
                    {numericSubItems.map(({ sub, idx, num }) => {
                      if (num <= 0) return null
                      const pct = (num / totalSubSum) * 100
                      const pctDisplay = pct >= 1 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`
                      const palette = getSubMetricPalette(sub, idx)
                      const isSubActive = isFilterActive(sub.filterTarget, activeFilters)
                      const isSubClickable = Boolean(sub.filterTarget && onToggleFilter)

                      return (
                        <div
                          key={sub.label}
                          data-testid={`distribution-segment-${sub.label}`}
                          style={{ width: `${pct}%` }}
                          onClick={
                            isSubClickable
                              ? (e) => {
                                  e.stopPropagation()
                                  onToggleFilter?.(sub.filterTarget!)
                                }
                              : undefined
                          }
                          title={`${sub.label}: ${sub.formatted} (${pctDisplay})${isSubClickable ? " • Click to filter" : ""}`}
                          className={cn(
                            "dy-h-full dy-transition-all dy-duration-200",
                            palette.bg,
                            isSubClickable && "dy-cursor-pointer",
                            isSubClickable && palette.hoverBg,
                            isSubActive && "dy-ring-2 dy-ring-primary dy-scale-y-125 z-10"
                          )}
                        />
                      )
                    })}
                  </div>
                )}

                {hasSubMetrics && (
                  <div
                    className={cn(
                      "dy-flex dy-flex-wrap dy-items-center dy-justify-between dy-gap-x-3 dy-gap-y-1 dy-pt-2.5 dy-border-t dy-text-xs",
                      colorStyles.subRow
                    )}
                  >
                    {metric.subMetrics!.map((sub, idx) => {
                      const isSubClickable = Boolean(sub.filterTarget && onToggleFilter)
                      const isSubActive = isFilterActive(sub.filterTarget, activeFilters)
                      const palette = getSubMetricPalette(sub, idx)
                      const itemNum = typeof sub.value === "number" && !isNaN(sub.value) && sub.value > 0 ? sub.value : 0
                      const pct = totalSubSum > 0 && itemNum > 0 ? (itemNum / totalSubSum) * 100 : 0
                      const pctDisplay = pct >= 1 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`

                      if (isSubClickable) {
                        return (
                          <button
                            key={sub.label}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleFilter?.(sub.filterTarget!)
                            }}
                            className={cn(
                              "dy-flex dy-items-center dy-gap-1.5 dy-rounded dy-px-1.5 dy-py-0.5 -dy-mx-1 dy-transition-colors",
                              "hover:dy-bg-black/5 dark:hover:dy-bg-white/10",
                              isSubActive && "dy-bg-primary/15 dy-text-primary dy-font-semibold"
                            )}
                            title={isSubActive ? `Active filter: click to clear ${sub.label}` : `Click to filter view by ${sub.label}`}
                          >
                            {shouldShowDistribution && (
                              <span className={cn("dy-inline-block dy-h-1.5 dy-w-1.5 dy-rounded-full dy-shrink-0", palette.dot)} />
                            )}
                            <span className={colorStyles.subLabel}>{sub.label}:</span>
                            <span className={colorStyles.subValue}>{sub.formatted}</span>
                            {shouldShowDistribution && itemNum > 0 && (
                              <span className="dy-text-[10px] dy-opacity-50 dy-tabular-nums">({pctDisplay})</span>
                            )}
                            {sub.scope && sub.scope !== metric.scope && (
                              <MetricScopeIcon scope={sub.scope} sizeClassName="dy-h-2.5 dy-w-2.5" />
                            )}
                          </button>
                        )
                      }

                      return (
                        <div key={sub.label} className="dy-flex dy-items-center dy-gap-1.5">
                          {shouldShowDistribution && (
                            <span className={cn("dy-inline-block dy-h-1.5 dy-w-1.5 dy-rounded-full dy-shrink-0", palette.dot)} />
                          )}
                          <span className={colorStyles.subLabel}>{sub.label}:</span>
                          <span className={colorStyles.subValue}>{sub.formatted}</span>
                          {shouldShowDistribution && itemNum > 0 && (
                            <span className="dy-text-[10px] dy-opacity-50 dy-tabular-nums">({pctDisplay})</span>
                          )}
                          {sub.scope && sub.scope !== metric.scope && (
                            <MetricScopeIcon scope={sub.scope} sizeClassName="dy-h-2.5 dy-w-2.5" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
    </div>
  )
}
