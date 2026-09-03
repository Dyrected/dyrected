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
  if (count === 2) return "dy-grid-cols-2"
  if (count === 3) return "dy-grid-cols-2 lg:dy-grid-cols-3"
  if (count === 4) return "dy-grid-cols-2 lg:dy-grid-cols-4"
  if (count === 5) return "dy-grid-cols-2 md:dy-grid-cols-3 lg:dy-grid-cols-5"
  return "dy-grid-cols-2 sm:dy-grid-cols-3 lg:dy-grid-cols-4"
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
        card: "dy-bg-purple-500/5 dark:dy-bg-purple-950/20 dy-border-purple-500/20 dark:dy-border-purple-500/30",
        header: "dy-text-purple-600 dark:dy-text-purple-400",
        value: "dy-text-purple-950 dark:dy-text-purple-100",
        unit: "dy-text-purple-700/80 dark:dy-text-purple-300/80",
        subRow: "dy-border-purple-500/15 dark:dy-border-purple-500/20",
        subLabel: "dy-text-purple-700/80 dark:dy-text-purple-300/80",
        subValue: "dy-text-purple-950 dark:dy-text-purple-100 dy-font-semibold",
      }
    case "emerald":
    case "green":
      return {
        card: "dy-bg-emerald-500/5 dark:dy-bg-emerald-950/20 dy-border-emerald-500/20 dark:dy-border-emerald-500/30",
        header: "dy-text-emerald-600 dark:dy-text-emerald-400",
        value: "dy-text-emerald-950 dark:dy-text-emerald-100",
        unit: "dy-text-emerald-700/80 dark:dy-text-emerald-300/80",
        subRow: "dy-border-emerald-500/15 dark:dy-border-emerald-500/20",
        subLabel: "dy-text-emerald-700/80 dark:dy-text-emerald-300/80",
        subValue: "dy-text-emerald-950 dark:dy-text-emerald-100 dy-font-semibold",
      }
    case "amber":
    case "yellow":
    case "orange":
    case "brown":
      return {
        card: "dy-bg-amber-500/5 dark:dy-bg-amber-950/20 dy-border-amber-500/20 dark:dy-border-amber-500/30",
        header: "dy-text-amber-700 dark:dy-text-amber-400",
        value: "dy-text-amber-950 dark:dy-text-amber-100",
        unit: "dy-text-amber-700/80 dark:dy-text-amber-300/80",
        subRow: "dy-border-amber-500/15 dark:dy-border-amber-500/20",
        subLabel: "dy-text-amber-700/80 dark:dy-text-amber-300/80",
        subValue: "dy-text-amber-950 dark:dy-text-amber-100 dy-font-semibold",
      }
    case "rose":
    case "pink":
    case "red":
    case "crimson":
      return {
        card: "dy-bg-rose-500/5 dark:dy-bg-rose-950/20 dy-border-rose-500/20 dark:dy-border-rose-500/30",
        header: "dy-text-rose-600 dark:dy-text-rose-400",
        value: "dy-text-rose-950 dark:dy-text-rose-100",
        unit: "dy-text-rose-700/80 dark:dy-text-rose-300/80",
        subRow: "dy-border-rose-500/15 dark:dy-border-rose-500/20",
        subLabel: "dy-text-rose-700/80 dark:dy-text-rose-300/80",
        subValue: "dy-text-rose-950 dark:dy-text-rose-100 dy-font-semibold",
      }
    case "blue":
    case "indigo":
    case "cyan":
    case "sky":
      return {
        card: "dy-bg-blue-500/5 dark:dy-bg-blue-950/20 dy-border-blue-500/20 dark:dy-border-blue-500/30",
        header: "dy-text-blue-600 dark:dy-text-blue-400",
        value: "dy-text-blue-950 dark:dy-text-blue-100",
        unit: "dy-text-blue-700/80 dark:dy-text-blue-300/80",
        subRow: "dy-border-blue-500/15 dark:dy-border-blue-500/20",
        subLabel: "dy-text-blue-700/80 dark:dy-text-blue-300/80",
        subValue: "dy-text-blue-950 dark:dy-text-blue-100 dy-font-semibold",
      }
    default:
      return {
        card: "dy-bg-card dy-border-border/50",
        header: "dy-text-muted-foreground",
        value: "dy-text-foreground",
        unit: "dy-text-muted-foreground",
        subRow: "dy-border-border/30",
        subLabel: "dy-text-muted-foreground",
        subValue: "dy-text-foreground dy-font-semibold",
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
                  <p className={cn("dy-text-2xl dy-font-bold dy-tracking-tight dy-tabular-nums", colorStyles.value)}>
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
