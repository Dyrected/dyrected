import * as React from "react"
import { BarChart2, Calendar, ChevronDown, ChevronRight, Hash, Pencil, Sparkles, X } from "lucide-react"
import type { AggregateOperation, MetricColor, ViewMetric } from "@dyrected/core"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { cn } from "../../lib/utils"

export interface ViewMetricsBuilderProps {
  metrics: ViewMetric[]
  onChange: (metrics: ViewMetric[]) => void
  collectionSlug?: string
  viewFilter?: any
  schemas?: any
  metricsScope?: "view" | "filtered" | "collection"
  onMetricsScopeChange?: (scope: "view" | "filtered" | "collection") => void
}

const COLOR_OPTIONS: { label: string; value: MetricColor; bgClass: string }[] = [
  { label: "Emerald", value: "emerald", bgClass: "dy-bg-emerald-500" },
  { label: "Blue", value: "blue", bgClass: "dy-bg-blue-500" },
  { label: "Purple", value: "purple", bgClass: "dy-bg-purple-500" },
  { label: "Amber", value: "amber", bgClass: "dy-bg-amber-500" },
  { label: "Rose", value: "rose", bgClass: "dy-bg-rose-500" },
  { label: "Indigo", value: "indigo", bgClass: "dy-bg-indigo-500" },
  { label: "Cyan", value: "cyan", bgClass: "dy-bg-cyan-500" },
  { label: "Orange", value: "orange", bgClass: "dy-bg-orange-500" },
]

function isNumericField(f: any): boolean {
  if (!f) return false
  if (f.type === "number" || f.type === "currency") return true
  const lower = (f.name || "").toLowerCase()
  return (
    lower.includes("amount") ||
    lower.includes("price") ||
    lower.includes("total") ||
    lower.includes("balance") ||
    lower.includes("cost") ||
    lower.includes("fee") ||
    lower.includes("quantity") ||
    lower.includes("qty") ||
    lower.includes("score") ||
    lower.includes("points") ||
    lower.includes("subtotal") ||
    lower.includes("tax") ||
    lower.includes("rate") ||
    lower.includes("discount")
  )
}

function isCurrencyField(f: any): boolean {
  if (!f) return false
  if (f.type === "currency") return true
  const lower = (f.name || "").toLowerCase()
  return (
    lower.includes("amount") ||
    lower.includes("price") ||
    lower.includes("cost") ||
    lower.includes("fee") ||
    lower.includes("balance") ||
    lower.includes("revenue") ||
    lower.includes("salary") ||
    lower.includes("subtotal") ||
    lower.includes("total")
  )
}

function isDateField(f: any): boolean {
  if (!f) return false
  if (f.type === "date" || f.type === "datetime" || f.type === "time") return true
  const lower = (f.name || "").toLowerCase()
  return (
    lower.endsWith("at") ||
    lower.includes("date") ||
    lower.includes("time") ||
    lower === "createdat" ||
    lower === "updatedat"
  )
}

function isDistinctCandidateField(f: any): boolean {
  if (!f) return false
  const excludedTypes = ["richText", "textarea", "blocks", "json", "image", "join", "row"]
  if (excludedTypes.includes(f.type)) return false
  return true
}

export function ViewMetricsBuilder({
  metrics,
  onChange,
  collectionSlug,
  viewFilter,
  schemas,
  metricsScope,
  onMetricsScopeChange,
}: ViewMetricsBuilderProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [showCustomForm, setShowCustomForm] = React.useState(false)
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)

  // Custom metric form state
  const [metricLabel, setMetricLabel] = React.useState("")
  const [operation, setOperation] = React.useState<"count" | "sum" | "avg" | "min" | "max" | "countDistinct">("count")
  const [field, setField] = React.useState("")
  const [color, setColor] = React.useState<MetricColor>("blue")
  const [format, setFormat] = React.useState<"number" | "currency" | "percent">("number")
  const [currency, setCurrency] = React.useState("USD")
  const [scope, setScope] = React.useState<"view" | "filtered" | "collection">("view")
  const [groupBy, setGroupBy] = React.useState<string>("")

  // Resolve target collection schema
  const targetCol = React.useMemo(() => {
    if (!collectionSlug || !schemas?.collections) return undefined
    return schemas.collections.find((c: any) => c.slug === collectionSlug)
  }, [collectionSlug, schemas])

  // Categorized fields in collection
  const allFields = React.useMemo(() => {
    if (!targetCol?.fields) return []
    return targetCol.fields
  }, [targetCol])

  const numericFields = React.useMemo(() => {
    return allFields.filter(isNumericField)
  }, [allFields])

  const dateFields = React.useMemo(() => {
    return allFields.filter(isDateField)
  }, [allFields])

  const distinctFields = React.useMemo(() => {
    return allFields.filter(isDistinctCandidateField)
  }, [allFields])

  const groupableFields = React.useMemo(() => {
    return allFields.filter(
      (f: any) =>
        f?.type &&
        ["select", "radio", "boolean", "relationship", "number", "text"].includes(f.type)
    )
  }, [allFields])

  // Available fields based on current operation
  const availableFields = React.useMemo(() => {
    if (operation === "sum" || operation === "avg") {
      return numericFields
    }
    if (operation === "min" || operation === "max") {
      // Numbers + Dates
      const seen = new Set<string>()
      const list: any[] = []
      for (const f of [...numericFields, ...dateFields]) {
        if (!seen.has(f.name)) {
          seen.add(f.name)
          list.push(f)
        }
      }
      return list
    }
    if (operation === "countDistinct") {
      return distinctFields
    }
    return []
  }, [operation, numericFields, dateFields, distinctFields])

  const handleOperationChange = (newOp: "count" | "sum" | "avg" | "min" | "max" | "countDistinct") => {
    setOperation(newOp)

    if (newOp === "count") {
      setField("")
      if (!metricLabel.trim() || metricLabel.startsWith("Total ") || metricLabel.startsWith("Avg ") || metricLabel.startsWith("Min ") || metricLabel.startsWith("Latest ")) {
        const colName = targetCol?.labels?.plural || collectionSlug || "Records"
        setMetricLabel(`Total ${colName}`)
      }
      setFormat("number")
      return
    }

    // Determine target fields for the new operator
    let validFields: any[] = []
    if (newOp === "sum" || newOp === "avg") validFields = numericFields
    else if (newOp === "min" || newOp === "max") validFields = [...numericFields, ...dateFields]
    else if (newOp === "countDistinct") validFields = distinctFields

    // If current field is not valid under new operator, pick the first valid one
    const isCurrentValid = validFields.some((f) => f.name === field)
    const nextField = isCurrentValid ? field : (validFields[0]?.name || "")
    setField(nextField)

    if (nextField) {
      const fieldObj = validFields.find((f) => f.name === nextField)
      const fieldTitle = fieldObj?.label || fieldObj?.name || nextField
      if (newOp === "sum") setMetricLabel(`Total ${fieldTitle}`)
      else if (newOp === "avg") setMetricLabel(`Avg ${fieldTitle}`)
      else if (newOp === "min") setMetricLabel(isDateField(fieldObj) ? `Earliest ${fieldTitle}` : `Min ${fieldTitle}`)
      else if (newOp === "max") setMetricLabel(isDateField(fieldObj) ? `Latest ${fieldTitle}` : `Max ${fieldTitle}`)
      else if (newOp === "countDistinct") setMetricLabel(`Unique ${fieldTitle}`)

      if (isCurrencyField(fieldObj)) setFormat("currency")
      else setFormat("number")
    }
  }

  const handleFieldChange = (selectedFieldName: string) => {
    setField(selectedFieldName)
    const fieldObj = availableFields.find((f) => f.name === selectedFieldName)
    if (!fieldObj) return

    const fieldTitle = fieldObj.label || fieldObj.name
    if (operation === "sum") setMetricLabel(`Total ${fieldTitle}`)
    else if (operation === "avg") setMetricLabel(`Avg ${fieldTitle}`)
    else if (operation === "min") setMetricLabel(isDateField(fieldObj) ? `Earliest ${fieldTitle}` : `Min ${fieldTitle}`)
    else if (operation === "max") setMetricLabel(isDateField(fieldObj) ? `Latest ${fieldTitle}` : `Max ${fieldTitle}`)
    else if (operation === "countDistinct") setMetricLabel(`Unique ${fieldTitle}`)

    if (isCurrencyField(fieldObj)) setFormat("currency")
    else setFormat("number")
  }

  const handleAddPresetTotalCount = () => {
    const colName = targetCol?.labels?.plural || collectionSlug || "Records"
    const newMetric: ViewMetric = {
      label: `Total ${colName}`,
      aggregate: { count: "*" },
      scope: "collection",
      color: "blue",
      format: "number",
    }
    onChange([...metrics, newMetric])
    setExpanded(true)
  }

  const handleAddPresetFilteredCount = () => {
    const newMetric: ViewMetric = {
      label: "Filtered Count",
      aggregate: { count: "*" },
      scope: "filtered",
      color: "emerald",
      format: "number",
    }
    onChange([...metrics, newMetric])
    setExpanded(true)
  }

  const handleAddPresetSum = (f: any) => {
    const isCurrency = isCurrencyField(f)
    const newMetric: ViewMetric = {
      label: `Total ${f.label || f.name}`,
      aggregate: { sum: f.name, cast: "number", where: viewFilter || undefined },
      color: "emerald",
      format: isCurrency ? "currency" : "number",
      currency: isCurrency ? "USD" : undefined,
    }
    onChange([...metrics, newMetric])
    setExpanded(true)
  }

  const handleAddPresetAvg = (f: any) => {
    const isCurrency = isCurrencyField(f)
    const newMetric: ViewMetric = {
      label: `Avg ${f.label || f.name}`,
      aggregate: { avg: f.name, cast: "number", where: viewFilter || undefined },
      color: "purple",
      format: isCurrency ? "currency" : "number",
      currency: isCurrency ? "USD" : undefined,
    }
    onChange([...metrics, newMetric])
    setExpanded(true)
  }

  const handleAddPresetLatest = (f: any) => {
    const newMetric: ViewMetric = {
      label: `Latest ${f.label || f.name}`,
      aggregate: { max: f.name, cast: "date", where: viewFilter || undefined } as any,
      color: "indigo",
      format: "number",
    }
    onChange([...metrics, newMetric])
    setExpanded(true)
  }

  const handleStartEditMetric = (idx: number) => {
    const m = metrics[idx]
    if (!m) return
    setEditingIndex(idx)
    setMetricLabel(m.label || "")
    const agg = (m.aggregate || (m.aggregates ? Object.values(m.aggregates)[0] : undefined)) as any
    if (agg?.countDistinct) {
      setOperation("countDistinct")
      setField(agg.countDistinct)
    } else if (agg?.sum) {
      setOperation("sum")
      setField(agg.sum)
    } else if (agg?.avg) {
      setOperation("avg")
      setField(agg.avg)
    } else if (agg?.min) {
      setOperation("min")
      setField(agg.min)
    } else if (agg?.max) {
      setOperation("max")
      setField(agg.max)
    } else {
      setOperation("count")
      setField("")
    }
    setColor(m.color || "blue")
    setFormat((m.format as "number" | "currency" | "percent") || "number")
    setCurrency(m.currency || "USD")
    setScope(m.scope || "view")
    const gb = typeof m.groupBy === "string" ? m.groupBy : m.groupBy?.field || ""
    setGroupBy(gb)
    setShowCustomForm(true)
  }

  const handleCancelCustomForm = () => {
    setShowCustomForm(false)
    setEditingIndex(null)
    setMetricLabel("")
    setField("")
    setScope("view")
    setGroupBy("")
  }

  const handleAddCustomMetric = () => {
    if (!metricLabel.trim()) return

    const isEditing = editingIndex !== null && editingIndex >= 0 && editingIndex < metrics.length
    const existingMetric = isEditing ? metrics[editingIndex!] : undefined
    const existingWhere = (existingMetric?.aggregate as any)?.where

    let agg: AggregateOperation
    if (operation === "count") {
      agg = { count: "*", where: existingWhere || viewFilter || undefined }
    } else if (operation === "countDistinct") {
      agg = { countDistinct: field, where: existingWhere || viewFilter || undefined }
    } else {
      const isDate = isDateField(allFields.find((f: any) => f.name === field))
      agg = { [operation]: field, cast: isDate ? "date" : "number", where: existingWhere || viewFilter || undefined } as any
    }

    const newMetric: ViewMetric = {
      ...(existingMetric || {}),
      label: metricLabel.trim(),
      aggregate: agg,
      color,
      format,
      currency: format === "currency" ? currency || "USD" : undefined,
      scope: scope !== "view" ? scope : undefined,
      groupBy: groupBy.trim() || undefined,
    }

    if (isEditing) {
      const updated = [...metrics]
      updated[editingIndex!] = newMetric
      onChange(updated)
    } else {
      onChange([...metrics, newMetric])
    }

    setMetricLabel("")
    setField("")
    setScope("view")
    setGroupBy("")
    setEditingIndex(null)
    setShowCustomForm(false)
  }

  const handleRemoveMetric = (index: number) => {
    if (editingIndex === index) {
      handleCancelCustomForm()
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1)
    }
    onChange(metrics.filter((_, i) => i !== index))
  }

  const formatSummary = (m: ViewMetric) => {
    const agg = m.aggregate as any
    if (!agg) return "metric"
    if (agg.count) return `count(${agg.count})`
    if (agg.countDistinct) return `distinct(${agg.countDistinct})`
    if (agg.sum) return `sum(${agg.sum})`
    if (agg.avg) return `avg(${agg.avg})`
    if (agg.min) return `min(${agg.min})`
    if (agg.max) return `max(${agg.max})`
    return "kpi"
  }

  return (
    <div className="dy-rounded-md dy-border dy-border-border/60 dy-bg-background/50 dy-p-1.5 dy-space-y-1.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="dy-flex dy-w-full dy-items-center dy-justify-between dy-text-[11px] dy-font-semibold dy-text-foreground hover:dy-text-primary dy-transition-colors"
      >
        <div className="dy-flex dy-items-center dy-gap-1.5">
          <BarChart2 className="dy-h-3.5 dy-w-3.5 dy-text-primary" />
          <span>KPI Metrics</span>
          {metrics.length > 0 && (
            <span className="dy-rounded-full dy-bg-primary/10 dy-px-1.5 dy-py-0.2 dy-text-[9px] dy-font-bold dy-text-primary">
              {metrics.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronDown className="dy-h-3.5 dy-w-3.5" /> : <ChevronRight className="dy-h-3.5 dy-w-3.5" />}
      </button>

      {expanded && (
        <div className="dy-space-y-2 dy-pt-1">
          {/* Optional Default Metrics Scope */}
          {onMetricsScopeChange && (
            <div className="dy-flex dy-items-center dy-justify-between dy-gap-2 dy-pb-1 dy-border-b dy-border-border/40">
              <span className="dy-text-[10px] dy-font-medium dy-text-muted-foreground">Default Metrics Scope:</span>
              <Select
                value={metricsScope || "view"}
                onValueChange={(v: any) => onMetricsScopeChange(v)}
              >
                <SelectTrigger className="dy-h-5 dy-w-36 dy-px-1.5 dy-text-[10px] dy-bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view" className="dy-text-xs">View (Standard)</SelectItem>
                  <SelectItem value="filtered" className="dy-text-xs">Filtered (Live Sync)</SelectItem>
                  <SelectItem value="collection" className="dy-text-xs">Collection (Global)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Active Metrics Chips */}
          {metrics.length > 0 && (
            <div className="dy-flex dy-flex-wrap dy-gap-1">
              {metrics.map((m, idx) => {
                const colorObj = COLOR_OPTIONS.find((c) => c.value === m.color) || COLOR_OPTIONS[0]
                const groupField = typeof m.groupBy === "string" ? m.groupBy : m.groupBy?.field
                const isEditing = editingIndex === idx
                return (
                  <div
                    key={idx}
                    className={cn(
                      "dy-group dy-flex dy-items-center dy-gap-1.5 dy-rounded-md dy-border dy-px-2 dy-py-0.5 dy-text-[10px] dy-transition-all",
                      isEditing
                        ? "dy-border-primary dy-bg-primary/10 dy-ring-1 dy-ring-primary"
                        : "dy-border-border dy-bg-muted/40 hover:dy-border-primary/50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleStartEditMetric(idx)}
                      className="dy-flex dy-items-center dy-gap-1.5 dy-text-left hover:dy-opacity-80"
                      title="Click to edit KPI (scope, groupBy, format, color)"
                    >
                      <span className={cn("dy-h-1.5 dy-w-1.5 dy-rounded-full", colorObj.bgClass)} />
                      <span className="dy-font-medium dy-text-foreground">{m.label}</span>
                      <span className="dy-text-[9px] dy-text-muted-foreground/70">
                        ({formatSummary(m)})
                      </span>
                      {m.scope && m.scope !== "view" && (
                        <span className="dy-rounded dy-bg-primary/15 dy-px-1 dy-text-[8px] dy-font-semibold dy-text-primary">
                          {m.scope}
                        </span>
                      )}
                      {groupField && (
                        <span className="dy-rounded dy-bg-purple-500/15 dy-px-1 dy-text-[8px] dy-font-semibold dy-text-purple-600 dark:dy-text-purple-400">
                          by: {groupField}
                        </span>
                      )}
                      <Pencil className="dy-h-2 dy-w-2 dy-text-muted-foreground/50 group-hover:dy-text-primary" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveMetric(idx)
                      }}
                      className="dy-text-muted-foreground hover:dy-text-destructive dy-transition-colors dy-ml-0.5"
                      title="Remove metric"
                    >
                      <X className="dy-h-2.5 dy-w-2.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick Presets Section */}
          <div className="dy-space-y-1">
            <div className="dy-text-[10px] dy-font-medium dy-text-muted-foreground dy-flex dy-items-center dy-gap-1">
              <Sparkles className="dy-h-2.5 dy-w-2.5 text-amber-500" />
              <span>Quick KPI Presets</span>
            </div>
            <div className="dy-flex dy-flex-wrap dy-gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="dy-h-5 dy-px-1.5 dy-text-[10px]"
                onClick={handleAddPresetTotalCount}
              >
                + Total Count
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="dy-h-5 dy-px-1.5 dy-text-[10px]"
                onClick={handleAddPresetFilteredCount}
              >
                + Filtered Count
              </Button>
              {numericFields.slice(0, 3).map((f: any) => (
                <React.Fragment key={f.name}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="dy-h-5 dy-px-1.5 dy-text-[10px]"
                    onClick={() => handleAddPresetSum(f)}
                  >
                    + Sum {f.label || f.name}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="dy-h-5 dy-px-1.5 dy-text-[10px]"
                    onClick={() => handleAddPresetAvg(f)}
                  >
                    + Avg {f.label || f.name}
                  </Button>
                </React.Fragment>
              ))}
              {dateFields.slice(0, 1).map((f: any) => (
                <Button
                  key={`latest-${f.name}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="dy-h-5 dy-px-1.5 dy-text-[10px]"
                  onClick={() => handleAddPresetLatest(f)}
                >
                  + Latest {f.label || f.name}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="dy-h-5 dy-px-1.5 dy-text-[10px] dy-text-primary hover:dy-bg-primary/10"
                onClick={() => {
                  if (showCustomForm) {
                    handleCancelCustomForm()
                  } else {
                    setEditingIndex(null)
                    setShowCustomForm(true)
                  }
                }}
              >
                {showCustomForm && editingIndex === null ? "Close Builder" : "+ Custom KPI"}
              </Button>
            </div>
          </div>

          {/* Custom Metric Builder Form */}
          {showCustomForm && (
            <div className="dy-rounded-md dy-border dy-border-border dy-bg-muted/30 dy-p-2 dy-space-y-1.5">
              <div className="dy-text-[10px] dy-font-semibold dy-text-foreground">
                {editingIndex !== null ? `Edit KPI: "${metrics[editingIndex]?.label || "Card"}"` : "Custom KPI Card"}
              </div>
              <Input
                size="sm"
                placeholder="Metric Title (e.g. VIP Revenue)..."
                value={metricLabel}
                onChange={(e) => setMetricLabel(e.target.value)}
                className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background"
              />

              <div className="dy-grid dy-grid-cols-2 dy-gap-1">
                <Select value={operation} onValueChange={(v: any) => handleOperationChange(v)}>
                  <SelectTrigger className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background">
                    <SelectValue placeholder="Operation..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count" className="dy-text-xs">Count (All Rows)</SelectItem>
                    <SelectItem value="sum" className="dy-text-xs" disabled={numericFields.length === 0}>
                      Sum {numericFields.length === 0 ? "(no numbers)" : ""}
                    </SelectItem>
                    <SelectItem value="avg" className="dy-text-xs" disabled={numericFields.length === 0}>
                      Average {numericFields.length === 0 ? "(no numbers)" : ""}
                    </SelectItem>
                    <SelectItem value="min" className="dy-text-xs" disabled={numericFields.length === 0 && dateFields.length === 0}>
                      Min / Earliest
                    </SelectItem>
                    <SelectItem value="max" className="dy-text-xs" disabled={numericFields.length === 0 && dateFields.length === 0}>
                      Max / Latest
                    </SelectItem>
                    <SelectItem value="countDistinct" className="dy-text-xs" disabled={distinctFields.length === 0}>
                      Unique Count
                    </SelectItem>
                  </SelectContent>
                </Select>

                {operation === "count" ? (
                  <div className="dy-flex dy-items-center dy-gap-1.5 dy-h-6 dy-px-2 dy-rounded dy-bg-muted/40 dy-border dy-border-border/40 dy-text-[10px] dy-text-muted-foreground">
                    <span className="dy-font-mono dy-text-primary dy-font-bold">*</span>
                    <span className="dy-truncate">All matching rows</span>
                  </div>
                ) : (
                  <Select value={field} onValueChange={handleFieldChange}>
                    <SelectTrigger className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background">
                      <SelectValue placeholder="Target field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map((f: any) => {
                        const isNum = isNumericField(f)
                        const isDate = isDateField(f)
                        return (
                          <SelectItem key={f.name} value={f.name} className="dy-text-xs">
                            <div className="dy-flex dy-items-center dy-gap-1.5">
                              {isNum ? (
                                <Hash className="dy-h-3 dy-w-3 dy-text-muted-foreground/70" />
                              ) : isDate ? (
                                <Calendar className="dy-h-3 dy-w-3 dy-text-muted-foreground/70" />
                              ) : null}
                              <span>{f.label || f.name}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="dy-grid dy-grid-cols-2 dy-gap-1">
                <Select value={color} onValueChange={(v: any) => setColor(v)}>
                  <SelectTrigger className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background">
                    <SelectValue placeholder="Card Color..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="dy-text-xs">
                        <div className="dy-flex dy-items-center dy-gap-1.5">
                          <span className={cn("dy-h-2 dy-w-2 dy-rounded-full", c.bgClass)} />
                          <span>{c.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                  <SelectTrigger className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background">
                    <SelectValue placeholder="Format..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number" className="dy-text-xs">Number</SelectItem>
                    <SelectItem value="currency" className="dy-text-xs">Currency</SelectItem>
                    <SelectItem value="percent" className="dy-text-xs">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scope & GroupBy Row */}
              <div className="dy-grid dy-grid-cols-2 dy-gap-1">
                <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                  <SelectTrigger className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background">
                    <SelectValue placeholder="Scope..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view" className="dy-text-xs">View Scope (Default)</SelectItem>
                    <SelectItem value="filtered" className="dy-text-xs">Filtered Scope (Live Sync)</SelectItem>
                    <SelectItem value="collection" className="dy-text-xs">Collection Scope (All Records)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={groupBy || "__none__"} onValueChange={(v) => setGroupBy(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background">
                    <SelectValue placeholder="Group by (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="dy-text-xs">No Grouping (Single Card)</SelectItem>
                    {groupableFields.map((f: any) => (
                      <SelectItem key={f.name} value={f.name} className="dy-text-xs">
                        Group by: {f.label || f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {format === "currency" && (
                <div className="dy-flex dy-items-center dy-gap-1">
                  <span className="dy-text-[10px] dy-text-muted-foreground">Currency code:</span>
                  <Input
                    size="sm"
                    placeholder="USD"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className="dy-h-6 dy-w-16 dy-px-1.5 dy-text-[11px] dy-bg-background"
                  />
                </div>
              )}

              <div className="dy-flex dy-justify-end dy-gap-1 dy-pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="dy-h-5 dy-px-2 dy-text-[10px]"
                  onClick={handleCancelCustomForm}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="dy-h-5 dy-px-2 dy-text-[10px]"
                  onClick={handleAddCustomMetric}
                  disabled={!metricLabel.trim() || (operation !== "count" && !field)}
                >
                  {editingIndex !== null ? "Update KPI" : "Add KPI"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
