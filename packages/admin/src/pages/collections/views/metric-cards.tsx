import { Skeleton } from "../../../components/ui/skeleton"
import { Card, CardContent } from "../../../components/ui/card"
import { cn } from "../../../lib/utils"
import type { ResolvedMetric } from "./use-view-metrics"

interface MetricCardsProps {
  metrics: ResolvedMetric[]
  isLoading?: boolean
  isRefetching?: boolean
  className?: string
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

export function MetricCards({ metrics, isLoading = false, isRefetching = false, className }: MetricCardsProps) {
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

          return (
            <Card
              key={metric.label}
              className={cn(
                colorStyles.card,
                "dy-shadow-xs dy-transition-opacity dy-duration-200",
                isRefetching && "dy-opacity-90",
                isFullWidthMobile ? "dy-col-span-2 lg:dy-col-span-1" : "dy-col-span-1"
              )}
            >
              <CardContent className="dy-space-y-2 !dy-p-4">
                <div className="dy-flex dy-items-center dy-justify-between dy-gap-2">
                  <p className={cn("dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-wider", colorStyles.header)}>
                    {metric.label}
                  </p>
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

                {hasSubMetrics && (
                  <div
                    className={cn(
                      "dy-flex dy-flex-wrap dy-items-center dy-justify-between dy-gap-x-3 dy-gap-y-1 dy-pt-2.5 dy-border-t dy-text-xs",
                      colorStyles.subRow
                    )}
                  >
                    {metric.subMetrics!.map((sub) => (
                      <div key={sub.label} className="dy-flex dy-items-center dy-gap-1">
                        <span className={colorStyles.subLabel}>{sub.label}:</span>
                        <span className={colorStyles.subValue}>{sub.formatted}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
    </div>
  )
}
