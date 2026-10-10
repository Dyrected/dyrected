import * as React from "react"
import { ArrowDownRight, ArrowUpRight, ChevronDown, Database, Filter, Layers, Minus, Search } from "lucide-react"
import { Skeleton } from "../../../components/ui/skeleton"
import { Card, CardContent } from "../../../components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover"
import { Input } from "../../../components/ui/input"
import { cn } from "../../../lib/utils"
import type { ResolvedMetric, ResolvedSubMetric, MetricFilterTarget } from "./use-view-metrics"

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
      if (opVal.operator === target.operator && opVal.value === target.value) {
        if (target.value2 !== undefined) {
          return opVal.value2 === target.value2
        }
        return true
      }
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
  activeBadge: string
  activeRing: string
  activePill: string
  activeSegmentRing: string
  trackBg: string
  defaultSubPalette: Array<{ bg: string; hoverBg: string; dot: string }>
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
  gray: { bg: "dy-bg-muted-foreground/60", hoverBg: "hover:dy-bg-muted-foreground/80", dot: "dy-bg-muted-foreground/60" },
}

const COOL_PURPLE_PALETTE = [
  { bg: "dy-bg-violet-600 dark:dy-bg-violet-500", hoverBg: "hover:dy-bg-violet-500", dot: "dy-bg-violet-600 dark:dy-bg-violet-500" },
  { bg: "dy-bg-fuchsia-400 dark:dy-bg-fuchsia-300", hoverBg: "hover:dy-bg-fuchsia-300", dot: "dy-bg-fuchsia-400 dark:dy-bg-fuchsia-300" },
  { bg: "dy-bg-indigo-800 dark:dy-bg-indigo-700", hoverBg: "hover:dy-bg-indigo-700", dot: "dy-bg-indigo-800 dark:dy-bg-indigo-700" },
  { bg: "dy-bg-purple-300 dark:dy-bg-purple-200", hoverBg: "hover:dy-bg-purple-200", dot: "dy-bg-purple-300 dark:dy-bg-purple-200" },
  { bg: "dy-bg-violet-400 dark:dy-bg-violet-300", hoverBg: "hover:dy-bg-violet-300", dot: "dy-bg-violet-400 dark:dy-bg-violet-300" },
  { bg: "dy-bg-pink-600 dark:dy-bg-pink-500", hoverBg: "hover:dy-bg-pink-500", dot: "dy-bg-pink-600 dark:dy-bg-pink-500" },
]

const WARM_AMBER_PALETTE = [
  { bg: "dy-bg-amber-500 dark:dy-bg-amber-400", hoverBg: "hover:dy-bg-amber-400", dot: "dy-bg-amber-500" },
  { bg: "dy-bg-orange-500 dark:dy-bg-orange-400", hoverBg: "hover:dy-bg-orange-400", dot: "dy-bg-orange-500" },
  { bg: "dy-bg-yellow-300 dark:dy-bg-yellow-200", hoverBg: "hover:dy-bg-yellow-200", dot: "dy-bg-yellow-300 dark:dy-bg-yellow-200" },
  { bg: "dy-bg-rose-600 dark:dy-bg-rose-500", hoverBg: "hover:dy-bg-rose-500", dot: "dy-bg-rose-600 dark:dy-bg-rose-500" },
  { bg: "dy-bg-amber-300 dark:dy-bg-amber-200", hoverBg: "hover:dy-bg-amber-200", dot: "dy-bg-amber-300 dark:dy-bg-amber-200" },
  { bg: "dy-bg-orange-800 dark:dy-bg-orange-700", hoverBg: "hover:dy-bg-orange-700", dot: "dy-bg-orange-800 dark:dy-bg-orange-700" },
]

const BOTANICAL_EMERALD_PALETTE = [
  { bg: "dy-bg-emerald-600 dark:dy-bg-emerald-500", hoverBg: "hover:dy-bg-emerald-500", dot: "dy-bg-emerald-600 dark:dy-bg-emerald-500" },
  { bg: "dy-bg-lime-400 dark:dy-bg-lime-300", hoverBg: "hover:dy-bg-lime-300", dot: "dy-bg-lime-400 dark:dy-bg-lime-300" },
  { bg: "dy-bg-teal-800 dark:dy-bg-teal-700", hoverBg: "hover:dy-bg-teal-700", dot: "dy-bg-teal-800 dark:dy-bg-teal-700" },
  { bg: "dy-bg-emerald-300 dark:dy-bg-emerald-200", hoverBg: "hover:dy-bg-emerald-200", dot: "dy-bg-emerald-300 dark:dy-bg-emerald-200" },
  { bg: "dy-bg-teal-500 dark:dy-bg-teal-400", hoverBg: "hover:dy-bg-teal-400", dot: "dy-bg-teal-500 dark:dy-bg-teal-400" },
  { bg: "dy-bg-lime-600 dark:dy-bg-lime-500", hoverBg: "hover:dy-bg-lime-500", dot: "dy-bg-lime-600 dark:dy-bg-lime-500" },
]

const BERRY_ROSE_PALETTE = [
  { bg: "dy-bg-rose-600 dark:dy-bg-rose-500", hoverBg: "hover:dy-bg-rose-500", dot: "dy-bg-rose-600 dark:dy-bg-rose-500" },
  { bg: "dy-bg-pink-300 dark:dy-bg-pink-200", hoverBg: "hover:dy-bg-pink-200", dot: "dy-bg-pink-300 dark:dy-bg-pink-200" },
  { bg: "dy-bg-fuchsia-800 dark:dy-bg-fuchsia-700", hoverBg: "hover:dy-bg-fuchsia-700", dot: "dy-bg-fuchsia-800 dark:dy-bg-fuchsia-700" },
  { bg: "dy-bg-rose-400 dark:dy-bg-rose-300", hoverBg: "hover:dy-bg-rose-300", dot: "dy-bg-rose-400 dark:dy-bg-rose-300" },
  { bg: "dy-bg-purple-700 dark:dy-bg-purple-600", hoverBg: "hover:dy-bg-purple-600", dot: "dy-bg-purple-700 dark:dy-bg-purple-600" },
  { bg: "dy-bg-pink-500 dark:dy-bg-pink-400", hoverBg: "hover:dy-bg-pink-400", dot: "dy-bg-pink-500 dark:dy-bg-pink-400" },
]

const OCEAN_BLUE_PALETTE = [
  { bg: "dy-bg-blue-600 dark:dy-bg-blue-500", hoverBg: "hover:dy-bg-blue-500", dot: "dy-bg-blue-600 dark:dy-bg-blue-500" },
  { bg: "dy-bg-cyan-300 dark:dy-bg-cyan-200", hoverBg: "hover:dy-bg-cyan-200", dot: "dy-bg-cyan-300 dark:dy-bg-cyan-200" },
  { bg: "dy-bg-indigo-800 dark:dy-bg-indigo-700", hoverBg: "hover:dy-bg-indigo-700", dot: "dy-bg-indigo-800 dark:dy-bg-indigo-700" },
  { bg: "dy-bg-sky-400 dark:dy-bg-sky-300", hoverBg: "hover:dy-bg-sky-300", dot: "dy-bg-sky-400 dark:dy-bg-sky-300" },
  { bg: "dy-bg-teal-600 dark:dy-bg-teal-500", hoverBg: "hover:dy-bg-teal-500", dot: "dy-bg-teal-600 dark:dy-bg-teal-500" },
  { bg: "dy-bg-blue-300 dark:dy-bg-blue-200", hoverBg: "hover:dy-bg-blue-200", dot: "dy-bg-blue-300 dark:dy-bg-blue-200" },
]

const WARM_ORANGE_PALETTE = [
  { bg: "dy-bg-orange-600 dark:dy-bg-orange-500", hoverBg: "hover:dy-bg-orange-500", dot: "dy-bg-orange-600 dark:dy-bg-orange-500" },
  { bg: "dy-bg-amber-300 dark:dy-bg-amber-200", hoverBg: "hover:dy-bg-amber-200", dot: "dy-bg-amber-300 dark:dy-bg-amber-200" },
  { bg: "dy-bg-red-700 dark:dy-bg-red-600", hoverBg: "hover:dy-bg-red-600", dot: "dy-bg-red-700 dark:dy-bg-red-600" },
  { bg: "dy-bg-orange-400 dark:dy-bg-orange-300", hoverBg: "hover:dy-bg-orange-300", dot: "dy-bg-orange-400 dark:dy-bg-orange-300" },
  { bg: "dy-bg-rose-800 dark:dy-bg-rose-700", hoverBg: "hover:dy-bg-rose-700", dot: "dy-bg-rose-800 dark:dy-bg-rose-700" },
  { bg: "dy-bg-yellow-400 dark:dy-bg-yellow-300", hoverBg: "hover:dy-bg-yellow-300", dot: "dy-bg-yellow-400 dark:dy-bg-yellow-300" },
]

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

function resolveMetricColor(color?: string): ColorTokens {
  switch (color?.toLowerCase()) {
    case "purple":
    case "violet":
      return {
        card: "dy-bg-purple-500/[0.04] dark:dy-bg-purple-500/[0.08] dy-border-purple-500/20 dark:dy-border-purple-500/30 hover:dy-border-purple-500/40 dark:hover:dy-border-purple-500/45",
        header: "dy-text-purple-700 dark:dy-text-purple-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-purple-700/80 dark:dy-text-purple-300/80",
        subRow: "dy-border-purple-500/15 dark:dy-border-purple-500/25",
        subLabel: "dy-text-purple-700/80 dark:dy-text-purple-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
        activeBadge: "dy-bg-purple-500/20 dy-text-purple-800 dark:dy-text-purple-200",
        activeRing: "dy-ring-2 dy-ring-purple-500/80 dy-border-purple-500 dy-shadow-sm",
        activePill: "dy-bg-purple-500/25 dy-text-purple-900 dark:dy-bg-purple-400/30 dark:dy-text-purple-100 dy-font-semibold",
        activeSegmentRing: "dy-ring-2 dy-ring-purple-600 dark:dy-ring-purple-400 dy-scale-y-125 z-10",
        trackBg: "dy-bg-purple-500/15 dark:dy-bg-purple-400/20",
        defaultSubPalette: COOL_PURPLE_PALETTE,
      }
    case "indigo":
      return {
        card: "dy-bg-indigo-500/[0.04] dark:dy-bg-indigo-500/[0.08] dy-border-indigo-500/20 dark:dy-border-indigo-500/30 hover:dy-border-indigo-500/40 dark:hover:dy-border-indigo-500/45",
        header: "dy-text-indigo-700 dark:dy-text-indigo-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-indigo-700/80 dark:dy-text-indigo-300/80",
        subRow: "dy-border-indigo-500/15 dark:dy-border-indigo-500/25",
        subLabel: "dy-text-indigo-700/80 dark:dy-text-indigo-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
        activeBadge: "dy-bg-indigo-500/20 dy-text-indigo-800 dark:dy-text-indigo-200",
        activeRing: "dy-ring-2 dy-ring-indigo-500/80 dy-border-indigo-500 dy-shadow-sm",
        activePill: "dy-bg-indigo-500/25 dy-text-indigo-900 dark:dy-bg-indigo-400/30 dark:dy-text-indigo-100 dy-font-semibold",
        activeSegmentRing: "dy-ring-2 dy-ring-indigo-600 dark:dy-ring-indigo-400 dy-scale-y-125 z-10",
        trackBg: "dy-bg-indigo-500/15 dark:dy-bg-indigo-400/20",
        defaultSubPalette: COOL_PURPLE_PALETTE,
      }
    case "cyan":
      return {
        card: "dy-bg-cyan-500/[0.04] dark:dy-bg-cyan-500/[0.08] dy-border-cyan-500/20 dark:dy-border-cyan-500/30 hover:dy-border-cyan-500/40 dark:hover:dy-border-cyan-500/45",
        header: "dy-text-cyan-700 dark:dy-text-cyan-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-cyan-700/80 dark:dy-text-cyan-300/80",
        subRow: "dy-border-cyan-500/15 dark:dy-border-cyan-500/25",
        subLabel: "dy-text-cyan-700/80 dark:dy-text-cyan-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
        activeBadge: "dy-bg-cyan-500/20 dy-text-cyan-800 dark:dy-text-cyan-200",
        activeRing: "dy-ring-2 dy-ring-cyan-500/80 dy-border-cyan-500 dy-shadow-sm",
        activePill: "dy-bg-cyan-500/25 dy-text-cyan-950 dark:dy-bg-cyan-400/30 dark:dy-text-cyan-100 dy-font-semibold",
        activeSegmentRing: "dy-ring-2 dy-ring-cyan-600 dark:dy-ring-cyan-400 dy-scale-y-125 z-10",
        trackBg: "dy-bg-cyan-500/15 dark:dy-bg-cyan-400/20",
        defaultSubPalette: OCEAN_BLUE_PALETTE,
      }
    case "emerald":
    case "green":
      return {
        card: "dy-bg-emerald-500/[0.04] dark:dy-bg-emerald-500/[0.08] dy-border-emerald-500/20 dark:dy-border-emerald-500/30 hover:dy-border-emerald-500/40 dark:hover:dy-border-emerald-500/45",
        header: "dy-text-emerald-700 dark:dy-text-emerald-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-emerald-700/80 dark:dy-text-emerald-300/80",
        subRow: "dy-border-emerald-500/15 dark:dy-border-emerald-500/25",
        subLabel: "dy-text-emerald-700/80 dark:dy-text-emerald-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
        activeBadge: "dy-bg-emerald-500/20 dy-text-emerald-800 dark:dy-text-emerald-200",
        activeRing: "dy-ring-2 dy-ring-emerald-500/80 dy-border-emerald-500 dy-shadow-sm",
        activePill: "dy-bg-emerald-500/25 dy-text-emerald-950 dark:dy-bg-emerald-400/30 dark:dy-text-emerald-100 dy-font-semibold",
        activeSegmentRing: "dy-ring-2 dy-ring-emerald-600 dark:dy-ring-emerald-400 dy-scale-y-125 z-10",
        trackBg: "dy-bg-emerald-500/15 dark:dy-bg-emerald-400/20",
        defaultSubPalette: BOTANICAL_EMERALD_PALETTE,
      }
    case "orange":
      return {
        card: "dy-bg-orange-500/[0.04] dark:dy-bg-orange-500/[0.08] dy-border-orange-500/20 dark:dy-border-orange-500/30 hover:dy-border-orange-500/40 dark:hover:dy-border-orange-500/45",
        header: "dy-text-orange-800 dark:dy-text-orange-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-orange-800/80 dark:dy-text-orange-300/80",
        subRow: "dy-border-orange-500/15 dark:dy-border-orange-500/25",
        subLabel: "dy-text-orange-800/80 dark:dy-text-orange-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
        activeBadge: "dy-bg-orange-500/20 dy-text-orange-900 dark:dy-text-orange-200",
        activeRing: "dy-ring-2 dy-ring-orange-500/80 dy-border-orange-500 dy-shadow-sm",
        activePill: "dy-bg-orange-500/25 dy-text-orange-950 dark:dy-bg-orange-400/30 dark:dy-text-orange-100 dy-font-semibold",
        activeSegmentRing: "dy-ring-2 dy-ring-orange-600 dark:dy-ring-orange-400 dy-scale-y-125 z-10",
        trackBg: "dy-bg-orange-500/15 dark:dy-bg-orange-400/20",
        defaultSubPalette: WARM_ORANGE_PALETTE,
      }
    case "amber":
    case "yellow":
    case "brown":
      return {
        card: "dy-bg-amber-500/[0.04] dark:dy-bg-amber-500/[0.08] dy-border-amber-500/20 dark:dy-border-amber-500/30 hover:dy-border-amber-500/40 dark:hover:dy-border-amber-500/45",
        header: "dy-text-amber-800 dark:dy-text-amber-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-amber-800/80 dark:dy-text-amber-300/80",
        subRow: "dy-border-amber-500/15 dark:dy-border-amber-500/25",
        subLabel: "dy-text-amber-800/80 dark:dy-text-amber-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
        activeBadge: "dy-bg-amber-500/25 dy-text-amber-900 dark:dy-text-amber-200",
        activeRing: "dy-ring-2 dy-ring-amber-500/80 dy-border-amber-500 dy-shadow-sm",
        activePill: "dy-bg-amber-500/25 dy-text-amber-950 dark:dy-bg-amber-400/30 dark:dy-text-amber-100 dy-font-semibold",
        activeSegmentRing: "dy-ring-2 dy-ring-amber-600 dark:dy-ring-amber-400 dy-scale-y-125 z-10",
        trackBg: "dy-bg-amber-500/15 dark:dy-bg-amber-400/20",
        defaultSubPalette: WARM_AMBER_PALETTE,
      }
    case "rose":
    case "pink":
    case "red":
    case "crimson":
      return {
        card: "dy-bg-rose-500/[0.04] dark:dy-bg-rose-500/[0.08] dy-border-rose-500/20 dark:dy-border-rose-500/30 hover:dy-border-rose-500/40 dark:hover:dy-border-rose-500/45",
        header: "dy-text-rose-700 dark:dy-text-rose-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-rose-700/80 dark:dy-text-rose-300/80",
        subRow: "dy-border-rose-500/15 dark:dy-border-rose-500/25",
        subLabel: "dy-text-rose-700/80 dark:dy-text-rose-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
        activeBadge: "dy-bg-rose-500/20 dy-text-rose-800 dark:dy-text-rose-200",
        activeRing: "dy-ring-2 dy-ring-rose-500/80 dy-border-rose-500 dy-shadow-sm",
        activePill: "dy-bg-rose-500/25 dy-text-rose-950 dark:dy-bg-rose-400/30 dark:dy-text-rose-100 dy-font-semibold",
        activeSegmentRing: "dy-ring-2 dy-ring-rose-600 dark:dy-ring-rose-400 dy-scale-y-125 z-10",
        trackBg: "dy-bg-rose-500/15 dark:dy-bg-rose-400/20",
        defaultSubPalette: BERRY_ROSE_PALETTE,
      }
    case "blue":
    case "sky":
      return {
        card: "dy-bg-blue-500/[0.04] dark:dy-bg-blue-500/[0.08] dy-border-blue-500/20 dark:dy-border-blue-500/30 hover:dy-border-blue-500/40 dark:hover:dy-border-blue-500/45",
        header: "dy-text-blue-700 dark:dy-text-blue-300",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-blue-700/80 dark:dy-text-blue-300/80",
        subRow: "dy-border-blue-500/15 dark:dy-border-blue-500/25",
        subLabel: "dy-text-blue-700/80 dark:dy-text-blue-300/80",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
        activeBadge: "dy-bg-blue-500/20 dy-text-blue-800 dark:dy-text-blue-200",
        activeRing: "dy-ring-2 dy-ring-blue-500/80 dy-border-blue-500 dy-shadow-sm",
        activePill: "dy-bg-blue-500/25 dy-text-blue-950 dark:dy-bg-blue-400/30 dark:dy-text-blue-100 dy-font-semibold",
        activeSegmentRing: "dy-ring-2 dy-ring-blue-600 dark:dy-ring-blue-400 dy-scale-y-125 z-10",
        trackBg: "dy-bg-blue-500/15 dark:dy-bg-blue-400/20",
        defaultSubPalette: OCEAN_BLUE_PALETTE,
      }
    default:
      return {
        card: "dy-bg-card dy-border-border/60 dark:dy-border-border/60 dark:dy-bg-card/90 hover:dy-border-border",
        header: "dy-text-muted-foreground",
        value: "dy-text-foreground dark:dy-text-white",
        unit: "dy-text-muted-foreground",
        subRow: "dy-border-border/40",
        subLabel: "dy-text-muted-foreground",
        subValue: "dy-text-foreground dark:dy-text-white dy-font-semibold",
        activeBadge: "dy-bg-foreground/10 dy-text-foreground",
        activeRing: "dy-ring-2 dy-ring-foreground/50 dy-border-foreground/60 dy-shadow-sm",
        activePill: "dy-bg-foreground/10 dy-text-foreground dy-font-semibold",
        activeSegmentRing: "dy-ring-2 dy-ring-foreground dy-scale-y-125 z-10",
        trackBg: "dy-bg-muted/50 dark:dy-bg-muted/40",
        defaultSubPalette: DEFAULT_PALETTE_ORDER,
      }
  }
}

function getSubMetricPalette(sub: ResolvedSubMetric, index: number, colorStyles?: ColorTokens) {
  if (sub.color && COLOR_MAP[sub.color.toLowerCase()]) {
    return COLOR_MAP[sub.color.toLowerCase()]
  }
  const paletteList = colorStyles?.defaultSubPalette ?? DEFAULT_PALETTE_ORDER
  return paletteList[index % paletteList.length]
}

function getSpanClass(span?: 1 | 2 | 3 | 4 | "full", isFullWidthMobileFallback?: boolean) {
  if (span === "full") return "dy-col-span-full"
  if (span === 4) return "dy-col-span-1 md:dy-col-span-2 lg:dy-col-span-4"
  if (span === 3) return "dy-col-span-1 md:dy-col-span-2 lg:dy-col-span-3"
  if (span === 2) return "dy-col-span-1 md:dy-col-span-2"
  if (span === 1) return "dy-col-span-1"
  return isFullWidthMobileFallback ? "dy-col-span-2 lg:dy-col-span-1" : "dy-col-span-1"
}

interface OtherGroupPopoverProps {
  sub: ResolvedSubMetric
  colorStyles: ColorTokens
  shouldShowDistribution: boolean
  palette: { bg: string; hoverBg: string; dot: string }
  totalSubSum: number
  activeFilters?: Array<{ id: string; value: unknown }>
  onToggleFilter?: (target: MetricFilterTarget) => void
  isHovered?: boolean
  onHoverChange?: (hovered: boolean) => void
}

function OtherGroupPopover({
  sub,
  colorStyles,
  shouldShowDistribution,
  palette,
  totalSubSum,
  activeFilters,
  onToggleFilter,
  isHovered,
  onHoverChange,
}: OtherGroupPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const overflow = React.useMemo(() => sub.overflowGroups ?? [], [sub.overflowGroups])
  const isAnyOverflowActive = overflow.some((g) => isFilterActive(g.filterTarget, activeFilters))
  const isAllOtherActive = isFilterActive(sub.filterTarget, activeFilters)
  const isSubActive = isAnyOverflowActive || isAllOtherActive

  const filtered = React.useMemo(() => {
    if (!search.trim()) return overflow
    const q = search.toLowerCase()
    return overflow.filter((g) => g.label.toLowerCase().includes(q))
  }, [overflow, search])

  const itemNum = typeof sub.value === "number" && !isNaN(sub.value) && sub.value > 0 ? sub.value : 0
  const pct = totalSubSum > 0 && itemNum > 0 ? (itemNum / totalSubSum) * 100 : 0
  const pctDisplay = pct >= 1 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => onHoverChange?.(true)}
          onMouseLeave={() => onHoverChange?.(false)}
          onClick={(e) => {
            e.stopPropagation()
          }}
          className={cn(
            "dy-flex dy-items-center dy-gap-1 dy-rounded dy-px-1.5 dy-py-0.5 -dy-mx-1 dy-transition-all",
            "hover:dy-bg-black/5 dark:hover:dy-bg-white/10",
            isHovered && "dy-bg-black/5 dark:dy-bg-white/10 dy-font-semibold",
            isSubActive ? colorStyles.activePill : "dy-text-muted-foreground"
          )}
          title={`Click to browse all ${overflow.length} other items`}
        >
          {shouldShowDistribution && (
            <span
              className={cn(
                "dy-inline-block dy-h-2 dy-w-2 dy-rounded-full dy-shrink-0 dy-ring-1 dy-ring-black/15 dark:dy-ring-white/20 dy-transition-transform",
                palette.dot,
                isHovered && "dy-scale-125"
              )}
            />
          )}
          <span className={colorStyles.subLabel}>{sub.label}:</span>
          <span className={colorStyles.subValue}>{sub.formatted}</span>
          {shouldShowDistribution && itemNum > 0 && (
            <span className="dy-text-[10px] dy-opacity-50 dy-tabular-nums">({pctDisplay})</span>
          )}
          <ChevronDown className="dy-h-2.5 dy-w-2.5 dy-opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="dy-w-64 dy-p-0 dy-shadow-lg dy-border dy-border-border dy-bg-popover dy-rounded-lg dy-overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dy-p-2 dy-border-b dy-border-border/50 dy-bg-muted/30 dy-flex dy-items-center dy-justify-between">
          <span className="dy-text-[11px] dy-font-semibold dy-text-foreground">
            Other Breakdown ({overflow.length})
          </span>
          {sub.filterTarget && (
            <button
              type="button"
              onClick={() => {
                onToggleFilter?.(sub.filterTarget!)
                setOpen(false)
              }}
              className="dy-text-[10px] dy-font-medium dy-text-primary hover:dy-underline"
            >
              Filter all other
            </button>
          )}
        </div>
        <div className="dy-p-2 dy-border-b dy-border-border/30">
          <div className="dy-relative">
            <Search className="dy-absolute dy-left-2 dy-top-1/2 -dy-translate-y-1/2 dy-h-3 dy-w-3 dy-text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${overflow.length} items...`}
              className="dy-h-6 dy-pl-6 dy-pr-2 dy-text-[11px] dy-bg-background"
            />
          </div>
        </div>
        <div className="dy-max-h-48 dy-overflow-y-auto dy-p-1 dy-space-y-0.5">
          {filtered.length === 0 ? (
            <div className="dy-py-3 dy-text-center dy-text-[11px] dy-text-muted-foreground">
              No matching items
            </div>
          ) : (
            filtered.map((g) => {
              const isActive = isFilterActive(g.filterTarget, activeFilters)
              return (
                <button
                  key={String(g.value)}
                  type="button"
                  onClick={() => {
                    if (g.filterTarget) {
                      onToggleFilter?.(g.filterTarget)
                    }
                    setOpen(false)
                  }}
                  className={cn(
                    "dy-w-full dy-text-left dy-px-2 dy-py-1 dy-rounded dy-text-xs dy-flex dy-items-center dy-justify-between dy-transition-colors",
                    "hover:dy-bg-accent hover:dy-text-accent-foreground",
                    isActive ? "dy-bg-accent dy-font-semibold dy-text-accent-foreground" : "dy-text-foreground"
                  )}
                >
                  <span className="dy-truncate">{g.label}</span>
                  {isActive && (
                    <span className="dy-text-[9px] dy-px-1.5 dy-py-0.2 dy-rounded dy-bg-primary/10 dy-text-primary dy-font-semibold">
                      Active
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface MetricCardItemProps {
  metric: ResolvedMetric
  count: number
  index: number
  isRefetching?: boolean
  activeFilters?: Array<{ id: string; value: unknown }>
  onToggleFilter?: (target: MetricFilterTarget) => void
}

function MetricCardItem({
  metric,
  count,
  index,
  isRefetching,
  activeFilters,
  onToggleFilter,
}: MetricCardItemProps) {
  const [hoveredSubLabel, setHoveredSubLabel] = React.useState<string | null>(null)
  const isLastOdd = count % 2 === 1 && index === count - 1
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
        isCardClickable && "dy-cursor-pointer hover:dy-shadow-md hover:dy-scale-[1.01] hover:dy-border-current/40 select-none",
        isCardActive && colorStyles.activeRing,
        isRefetching && "dy-opacity-90",
        getSpanClass(metric.span, isFullWidthMobile)
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
              <span className={cn("dy-inline-flex dy-items-center dy-text-[9px] dy-font-semibold dy-px-1.5 dy-py-0.5 dy-rounded-full", colorStyles.activeBadge)}>
                Active
              </span>
            )}
          </div>
          {isRefetching && (
            <span className="dy-inline-block dy-h-1.5 dy-w-1.5 dy-rounded-full dy-bg-current dy-animate-ping dy-opacity-75" title="Updating..." />
          )}
        </div>
        <div className="dy-flex dy-items-baseline dy-justify-between dy-gap-2">
          <div className="dy-flex dy-items-baseline dy-gap-2">
            <p className={cn("dy-text-xl sm:dy-text-2xl dy-font-bold dy-tracking-tight dy-tabular-nums", colorStyles.value)}>
              {metric.formatted}
            </p>
            {metric.trend && (
              <span
                data-testid={`metric-trend-${metric.label}`}
                className={cn(
                  "dy-inline-flex dy-items-center dy-gap-0.5 dy-text-xs dy-font-semibold dy-px-1.5 dy-py-0.5 dy-rounded-full dy-tabular-nums dy-transition-colors select-none",
                  metric.trend.tone === "emerald" && "dy-bg-emerald-500/15 dy-text-emerald-700 dark:dy-text-emerald-400 dark:dy-bg-emerald-500/20",
                  metric.trend.tone === "rose" && "dy-bg-rose-500/15 dy-text-rose-700 dark:dy-text-rose-400 dark:dy-bg-rose-500/20",
                  metric.trend.tone === "muted" && "dy-bg-muted dy-text-muted-foreground",
                )}
                title={metric.trend.previousValue !== null ? `Previous period: ${metric.trend.previousValue} (${metric.trend.formatted})` : `Trend: ${metric.trend.formatted}`}
              >
                {metric.trend.direction === "up" && <ArrowUpRight className="dy-h-3 dy-w-3" />}
                {metric.trend.direction === "down" && <ArrowDownRight className="dy-h-3 dy-w-3" />}
                {metric.trend.direction === "flat" && <Minus className="dy-h-3 dy-w-3" />}
                <span>{metric.trend.formatted}</span>
              </span>
            )}
          </div>
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
            className={cn(
              "dy-w-full dy-h-2 dy-rounded-full dy-overflow-hidden dy-flex dy-gap-0.5 dy-my-2.5 dy-p-[1px] select-none",
              colorStyles.trackBg
            )}
          >
            {numericSubItems.map(({ sub, idx, num }) => {
              if (num <= 0) return null
              const pct = (num / totalSubSum) * 100
              const pctDisplay = pct >= 1 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`
              const palette = getSubMetricPalette(sub, idx, colorStyles)
              const isSubActive = isFilterActive(sub.filterTarget, activeFilters)
              const isSubClickable = Boolean(sub.filterTarget && onToggleFilter)
              const isHovered = hoveredSubLabel === sub.label
              const hasAnyHover = hoveredSubLabel !== null

              return (
                <div
                  key={sub.label}
                  data-testid={`distribution-segment-${sub.label}`}
                  style={{ width: `${pct}%` }}
                  onMouseEnter={() => setHoveredSubLabel(sub.label)}
                  onMouseLeave={() => setHoveredSubLabel(null)}
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
                    "dy-h-full dy-rounded-[2px] dy-transition-all dy-duration-200 dy-ring-1 dy-ring-black/10 dark:dy-ring-white/15",
                    palette.bg,
                    isSubClickable && "dy-cursor-pointer",
                    isSubClickable && palette.hoverBg,
                    "hover:dy-brightness-125 hover:dy-scale-y-110",
                    hasAnyHover && !isHovered && "dy-opacity-40",
                    isHovered && "dy-scale-y-125 dy-brightness-125 dy-z-10 dy-shadow-xs",
                    isSubActive && colorStyles.activeSegmentRing
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
              const palette = getSubMetricPalette(sub, idx, colorStyles)
              const itemNum = typeof sub.value === "number" && !isNaN(sub.value) && sub.value > 0 ? sub.value : 0
              const pct = totalSubSum > 0 && itemNum > 0 ? (itemNum / totalSubSum) * 100 : 0
              const pctDisplay = pct >= 1 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`
              const isHovered = hoveredSubLabel === sub.label

              if (sub.overflowGroups?.length) {
                return (
                  <OtherGroupPopover
                    key={sub.label}
                    sub={sub}
                    colorStyles={colorStyles}
                    shouldShowDistribution={shouldShowDistribution}
                    palette={palette}
                    totalSubSum={totalSubSum}
                    activeFilters={activeFilters}
                    onToggleFilter={onToggleFilter}
                    isHovered={isHovered}
                    onHoverChange={(h) => setHoveredSubLabel(h ? sub.label : null)}
                  />
                )
              }

              if (isSubClickable) {
                return (
                  <button
                    key={sub.label}
                    type="button"
                    onMouseEnter={() => setHoveredSubLabel(sub.label)}
                    onMouseLeave={() => setHoveredSubLabel(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFilter?.(sub.filterTarget!)
                    }}
                    className={cn(
                      "dy-flex dy-items-center dy-gap-1.5 dy-rounded dy-px-1.5 dy-py-0.5 -dy-mx-1 dy-transition-all",
                      "hover:dy-bg-black/5 dark:hover:dy-bg-white/10",
                      isHovered && "dy-bg-black/5 dark:dy-bg-white/10 dy-font-semibold",
                      isSubActive && colorStyles.activePill
                    )}
                    title={isSubActive ? `Active filter: click to clear ${sub.label}` : `Click to filter view by ${sub.label}`}
                  >
                    {shouldShowDistribution && (
                      <span
                        className={cn(
                          "dy-inline-block dy-h-2 dy-w-2 dy-rounded-full dy-shrink-0 dy-ring-1 dy-ring-black/15 dark:dy-ring-white/20 dy-transition-transform",
                          palette.dot,
                          isHovered && "dy-scale-125"
                        )}
                      />
                    )}
                    <span className={colorStyles.subLabel}>{sub.label}:</span>
                    <span className={colorStyles.subValue}>{sub.formatted}</span>
                    {sub.trend && (
                      <span
                        data-testid={`submetric-trend-${sub.label}`}
                        className={cn(
                          "dy-inline-flex dy-items-center dy-gap-0.5 dy-text-[10px] dy-font-semibold dy-px-1 dy-rounded dy-tabular-nums",
                          sub.trend.tone === "emerald" && "dy-text-emerald-600 dark:dy-text-emerald-400",
                          sub.trend.tone === "rose" && "dy-text-rose-600 dark:dy-text-rose-400",
                          sub.trend.tone === "muted" && "dy-text-muted-foreground",
                        )}
                        title={sub.trend.previousValue !== null ? `Previous: ${sub.trend.previousValue} (${sub.trend.formatted})` : `Trend: ${sub.trend.formatted}`}
                      >
                        {sub.trend.direction === "up" && "↑"}
                        {sub.trend.direction === "down" && "↓"}
                        <span>{sub.trend.formatted}</span>
                      </span>
                    )}
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
                <div
                  key={sub.label}
                  onMouseEnter={() => setHoveredSubLabel(sub.label)}
                  onMouseLeave={() => setHoveredSubLabel(null)}
                  className={cn(
                    "dy-flex dy-items-center dy-gap-1.5 dy-rounded dy-px-1 -dy-mx-1 dy-transition-all",
                    isHovered && "dy-bg-black/5 dark:dy-bg-white/10"
                  )}
                >
                  {shouldShowDistribution && (
                    <span
                      className={cn(
                        "dy-inline-block dy-h-2 dy-w-2 dy-rounded-full dy-shrink-0 dy-ring-1 dy-ring-black/15 dark:dy-ring-white/20 dy-transition-transform",
                        palette.dot,
                        isHovered && "dy-scale-125"
                      )}
                    />
                  )}
                  <span className={colorStyles.subLabel}>{sub.label}:</span>
                  <span className={colorStyles.subValue}>{sub.formatted}</span>
                  {sub.trend && (
                    <span
                      data-testid={`submetric-trend-${sub.label}`}
                      className={cn(
                        "dy-inline-flex dy-items-center dy-gap-0.5 dy-text-[10px] dy-font-semibold dy-px-1 dy-rounded dy-tabular-nums",
                        sub.trend.tone === "emerald" && "dy-text-emerald-600 dark:dy-text-emerald-400",
                        sub.trend.tone === "rose" && "dy-text-rose-600 dark:dy-text-rose-400",
                        sub.trend.tone === "muted" && "dy-text-muted-foreground",
                      )}
                      title={sub.trend.previousValue !== null ? `Previous: ${sub.trend.previousValue} (${sub.trend.formatted})` : `Trend: ${sub.trend.formatted}`}
                    >
                      {sub.trend.direction === "up" && "↑"}
                      {sub.trend.direction === "down" && "↓"}
                      <span>{sub.trend.formatted}</span>
                    </span>
                  )}
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
        : metrics.map((metric, i) => (
          <MetricCardItem
            key={metric.label}
            metric={metric}
            count={count}
            index={i}
            isRefetching={isRefetching}
            activeFilters={activeFilters}
            onToggleFilter={onToggleFilter}
          />
        ))}
    </div>
  )
}
