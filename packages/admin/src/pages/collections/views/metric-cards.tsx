import { Skeleton } from "../../../components/ui/skeleton"
import { Card, CardContent } from "../../../components/ui/card"
import { cn } from "../../../lib/utils"
import type { ResolvedMetric } from "./use-view-metrics"

interface MetricCardsProps {
  metrics: ResolvedMetric[]
  isLoading?: boolean
  className?: string
}

/**
 * Summary stat cards rendered above an operational view.
 * Values come from the collection aggregation engine — see `useViewMetrics`.
 */
export function MetricCards({ metrics, isLoading = false, className }: MetricCardsProps) {
  if (!metrics.length && !isLoading) return null

  return (
    <div
      className={cn(
        "dy-grid dy-gap-3",
        metrics.length >= 4 ? "dy-grid-cols-2 lg:dy-grid-cols-4" : "dy-grid-cols-1 sm:dy-grid-cols-3",
        className,
      )}
    >
      {isLoading
        ? Array.from({ length: Math.max(metrics.length, 1) }, (_, i) => (
            <Card key={i}>
              <CardContent className="dy-space-y-2">
                <Skeleton className="dy-h-3 dy-w-24" />
                <Skeleton className="dy-h-6 dy-w-16" />
              </CardContent>
            </Card>
          ))
        : metrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent className="dy-space-y-0.5">
                <p className="dy-text-xs dy-font-medium dy-text-muted-foreground">{metric.label}</p>
                <p className="dy-text-xl dy-font-bold dy-tracking-tight dy-tabular-nums">{metric.formatted}</p>
              </CardContent>
            </Card>
          ))}
    </div>
  )
}
