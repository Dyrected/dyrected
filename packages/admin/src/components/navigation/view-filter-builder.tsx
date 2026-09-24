import * as React from "react"
import { Code, Filter, Plus, SlidersHorizontal, Trash2, X } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { cn } from "../../lib/utils"
import {
  type FilterRow,
  OPERATORS_BY_KIND,
  deserializeFilter,
  getFieldKind,
  serializeFilter,
} from "../../utils/filter-dsl"

export interface ViewFilterBuilderProps {
  filter: Record<string, any> | undefined
  onChange: (filter: Record<string, any> | undefined) => void
  collectionSlug?: string
  schemas?: any
}


export function ViewFilterBuilder({
  filter,
  onChange,
  collectionSlug,
  schemas,
}: ViewFilterBuilderProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [mode, setMode] = React.useState<"visual" | "json">("visual")
  const [jsonError, setJsonError] = React.useState<string | null>(null)

  // Internal draft state of conditions (null when synced with filter prop)
  const [draftRows, setDraftRows] = React.useState<FilterRow[] | null>(null)
  const [draftJsonText, setDraftJsonText] = React.useState<string | null>(null)

  const rows = React.useMemo(() => {
    return draftRows ?? deserializeFilter(filter)
  }, [draftRows, filter])

  const rawJsonText = draftJsonText ?? (filter ? JSON.stringify(filter, null, 2) : "")

  // Introspect fields of the target collection
  const collection = React.useMemo(() => {
    if (!collectionSlug || !schemas) return null
    return (schemas?.collections ?? []).find((c: any) => c.slug === collectionSlug)
  }, [collectionSlug, schemas])

  const availableFields = React.useMemo(() => {
    const list = ((collection?.fields ?? []) as any[]).filter(
      (f) =>
        f?.name &&
        !["join", "row", "blocks", "json", "ui", "upload"].includes(f.type)
    )

    // Ensure standard system timestamp fields are available if not explicitly declared
    const hasCreatedAt = list.some((f) => f.name === "createdAt")
    const hasUpdatedAt = list.some((f) => f.name === "updatedAt")

    const result = [...list]
    if (!hasCreatedAt) result.push({ name: "createdAt", type: "date", label: "Created At" })
    if (!hasUpdatedAt) result.push({ name: "updatedAt", type: "date", label: "Updated At" })

    return result
  }, [collection])

  const updateRowsAndNotify = (nextRows: FilterRow[]) => {
    setDraftRows(nextRows)
    const compiled = serializeFilter(nextRows, availableFields)
    onChange(compiled)
    setDraftJsonText(compiled ? JSON.stringify(compiled, null, 2) : "")
    setJsonError(null)
  }

  const handleAddCondition = (initialField?: string, initialVal?: any) => {
    const defaultField = initialField || availableFields[0]?.name || "status"
    const fieldMeta = availableFields.find((f) => f.name === defaultField)
    const kind = getFieldKind(fieldMeta)
    const defaultOp = OPERATORS_BY_KIND[kind]?.[0]?.value || "equals"

    let defaultVal = initialVal ?? ""
    if (defaultVal === "" && kind === "boolean") defaultVal = "true"
    if (defaultVal === "" && kind === "select" && fieldMeta?.options?.[0]) {
      defaultVal = fieldMeta.options[0].value ?? fieldMeta.options[0]
    }

    const newRow: FilterRow = {
      id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      field: defaultField,
      operator: defaultOp,
      value: defaultVal,
    }

    updateRowsAndNotify([...rows, newRow])
    if (!expanded) setExpanded(true)
  }

  const handleRemoveRow = (id: string) => {
    const next = rows.filter((r) => r.id !== id)
    updateRowsAndNotify(next)
  }

  const handleFieldChange = (id: string, newField: string) => {
    const fieldMeta = availableFields.find((f) => f.name === newField)
    const kind = getFieldKind(fieldMeta)
    const newOp = OPERATORS_BY_KIND[kind]?.[0]?.value || "equals"

    let newVal: any = ""
    if (kind === "boolean") newVal = "true"
    if (kind === "select" && fieldMeta?.options?.[0]) {
      newVal = fieldMeta.options[0].value ?? fieldMeta.options[0]
    }

    const next = rows.map((r) =>
      r.id === id ? { ...r, field: newField, operator: newOp, value: newVal, value2: undefined } : r
    )
    updateRowsAndNotify(next)
  }

  const handleOperatorChange = (id: string, newOp: string) => {
    const next = rows.map((r) => (r.id === id ? { ...r, operator: newOp } : r))
    updateRowsAndNotify(next)
  }

  const handleValueChange = (id: string, newVal: any) => {
    const next = rows.map((r) => (r.id === id ? { ...r, value: newVal } : r))
    updateRowsAndNotify(next)
  }

  const handleValue2Change = (id: string, newVal2: any) => {
    const next = rows.map((r) => (r.id === id ? { ...r, value2: newVal2 } : r))
    updateRowsAndNotify(next)
  }

  const handleClearAll = () => {
    setDraftRows([])
    setDraftJsonText("")
    setJsonError(null)
    onChange(undefined)
  }

  const handleJsonBlur = () => {
    const trimmed = rawJsonText.trim()
    if (!trimmed) {
      setJsonError(null)
      setDraftRows([])
      setDraftJsonText("")
      onChange(undefined)
      return
    }
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonError("Filter must be a valid JSON object")
        return
      }
      setJsonError(null)
      const nextRows = deserializeFilter(parsed)
      setDraftRows(nextRows)
      setDraftJsonText(trimmed)
      onChange(parsed)
    } catch (e: any) {
      setJsonError(e.message || "Invalid JSON syntax")
    }
  }

  // Quick preset chips (e.g. for status field)
  const statusField = availableFields.find((f) => f.name === "status" || f.name === "stage")
  const statusOptions: string[] = React.useMemo(() => {
    if (!statusField?.options) return ["pending", "active", "completed"]
    return statusField.options.map((o: any) => (typeof o === "string" ? o : o.value)).slice(0, 4)
  }, [statusField])

  const conditionCount = rows.length

  return (
    <div className="dy-rounded-md dy-border dy-border-border/60 dy-bg-background/50 dy-text-xs">
      {/* Header Bar */}
      <div className="dy-flex dy-items-center dy-justify-between dy-px-2.5 dy-py-1.5 dy-bg-muted/30">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="dy-flex dy-items-center dy-gap-1.5 dy-font-medium dy-text-foreground hover:dy-text-primary dy-transition-colors"
        >
          <Filter className="dy-w-3.5 dy-h-3.5 dy-text-primary" />
          <span>View Filter</span>
          <span
            className={cn(
              "dy-text-[10px] dy-font-semibold dy-px-1.5 dy-py-0.2 dy-rounded-full dy-ml-1",
              conditionCount > 0
                ? "dy-bg-primary/15 dy-text-primary"
                : "dy-bg-muted dy-text-muted-foreground"
            )}
          >
            {conditionCount === 0
              ? "All records"
              : `${conditionCount} rule${conditionCount > 1 ? "s" : ""}`}
          </span>
        </button>

        <div className="dy-flex dy-items-center dy-gap-1">
          {expanded && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="dy-h-5 dy-px-1.5 dy-text-[10px] dy-text-muted-foreground hover:dy-text-foreground"
              onClick={() => setMode(mode === "visual" ? "json" : "visual")}
              title={mode === "visual" ? "Edit raw JSON where clause" : "Switch to visual builder"}
            >
              {mode === "visual" ? (
                <>
                  <Code className="dy-w-3 dy-h-3 dy-mr-1" />
                  JSON
                </>
              ) : (
                <>
                  <SlidersHorizontal className="dy-w-3 dy-h-3 dy-mr-1" />
                  Visual
                </>
              )}
            </Button>
          )}

          {conditionCount > 0 && expanded && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="dy-h-5 dy-px-1.5 dy-text-[10px] dy-text-muted-foreground hover:dy-text-destructive"
              onClick={handleClearAll}
              title="Clear all conditions"
            >
              <Trash2 className="dy-w-3 dy-h-3" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="dy-h-5 dy-px-1.5 dy-text-[11px] dy-text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide" : "Edit"}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="dy-p-2.5 dy-space-y-2.5 dy-border-t dy-border-border/40">
          {mode === "json" ? (
            /* Raw JSON Editor */
            <div className="dy-space-y-1.5">
              <div className="dy-flex dy-items-center dy-justify-between dy-text-[10px] dy-text-muted-foreground">
                <span>Direct Where Clause DSL</span>
                <span>Auto-saved on blur</span>
              </div>
              <textarea
                value={rawJsonText}
                onChange={(e) => setDraftJsonText(e.target.value)}
                onBlur={handleJsonBlur}
                placeholder={'{\n  "status": "pending",\n  "total": { "greater_than": 100 }\n}'}
                rows={4}
                className={cn(
                  "dy-w-full dy-rounded dy-border dy-bg-muted/20 dy-p-2 dy-font-mono dy-text-[11px] focus:dy-outline-none focus:dy-ring-1",
                  jsonError
                    ? "dy-border-destructive focus:dy-ring-destructive"
                    : "dy-border-border/60 focus:dy-ring-primary"
                )}
              />
              {jsonError && (
                <p className="dy-text-[10px] dy-text-destructive dy-font-medium">{jsonError}</p>
              )}
            </div>
          ) : (
            /* Visual Filter Builder */
            <div className="dy-space-y-2">
              {rows.length === 0 ? (
                <div className="dy-py-2 dy-px-3 dy-rounded dy-border dy-border-dashed dy-border-border/60 dy-bg-muted/10 dy-text-center">
                  <p className="dy-text-[11px] dy-text-muted-foreground dy-mb-2">
                    No filter applied. This view displays all documents in the collection.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="dy-h-6 dy-px-2.5 dy-text-xs dy-gap-1"
                    onClick={() => handleAddCondition()}
                  >
                    <Plus className="dy-w-3 dy-h-3" />
                    Add Filter Condition
                  </Button>
                </div>
              ) : (
                <div className="dy-space-y-1.5">
                  {rows.map((row, index) => {
                    const fieldMeta = availableFields.find((f) => f.name === row.field)
                    const kind = getFieldKind(fieldMeta)
                    const operators = OPERATORS_BY_KIND[kind] || OPERATORS_BY_KIND.text
                    const isBetween = row.operator === "between"
                    const isExists = row.operator === "exists" || row.operator === "not_exists"

                    return (
                      <div
                        key={row.id}
                        className="dy-flex dy-items-center dy-gap-1.5 dy-bg-card dy-p-1.5 dy-rounded dy-border dy-border-border/50"
                      >
                        {/* Match Indicator */}
                        <span className="dy-text-[9px] dy-font-bold dy-uppercase dy-text-muted-foreground/60 dy-w-7 dy-shrink-0 dy-text-right">
                          {index === 0 ? "Where" : "And"}
                        </span>

                        {/* Field Selector */}
                        <Select
                          value={row.field}
                          onValueChange={(val) => handleFieldChange(row.id, val)}
                        >
                          <SelectTrigger className="dy-h-6 dy-text-[11px] dy-px-1.5 dy-w-28 dy-bg-background dy-shrink-0">
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFields.map((f) => (
                              <SelectItem key={f.name} value={f.name} className="dy-text-xs">
                                <span className="dy-font-medium">{f.label || f.name}</span>
                                <span className="dy-ml-1.5 dy-text-[10px] dy-text-muted-foreground/70">
                                  ({f.type || "text"})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Operator Selector */}
                        <Select
                          value={row.operator}
                          onValueChange={(val) => handleOperatorChange(row.id, val)}
                        >
                          <SelectTrigger className="dy-h-6 dy-text-[11px] dy-px-1.5 dy-w-24 dy-bg-background dy-shrink-0">
                            <SelectValue placeholder="Operator" />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map((op) => (
                              <SelectItem key={op.value} value={op.value} className="dy-text-xs">
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Value Control */}
                        {!isExists ? (
                          isBetween ? (
                            <div className="dy-flex dy-items-center dy-gap-1 dy-flex-1">
                              <Input
                                type={kind === "number" ? "number" : kind === "date" ? "date" : "text"}
                                value={row.value ?? ""}
                                onChange={(e) => handleValueChange(row.id, e.target.value)}
                                placeholder="Min..."
                                className="dy-h-6 dy-text-[11px] dy-px-1.5 dy-bg-background dy-flex-1"
                              />
                              <span className="dy-text-[10px] dy-text-muted-foreground">and</span>
                              <Input
                                type={kind === "number" ? "number" : kind === "date" ? "date" : "text"}
                                value={row.value2 ?? ""}
                                onChange={(e) => handleValue2Change(row.id, e.target.value)}
                                placeholder="Max..."
                                className="dy-h-6 dy-text-[11px] dy-px-1.5 dy-bg-background dy-flex-1"
                              />
                            </div>
                          ) : kind === "boolean" ? (
                            <Select
                              value={String(row.value ?? "true")}
                              onValueChange={(val) => handleValueChange(row.id, val)}
                            >
                              <SelectTrigger className="dy-h-6 dy-text-[11px] dy-px-1.5 dy-flex-1 dy-bg-background">
                                <SelectValue placeholder="Value" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true" className="dy-text-xs">Yes / True</SelectItem>
                                <SelectItem value="false" className="dy-text-xs">No / False</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : kind === "select" && fieldMeta?.options && fieldMeta.options.length > 0 && row.operator !== "in" ? (
                            <Select
                              value={String(row.value ?? "")}
                              onValueChange={(val) => handleValueChange(row.id, val)}
                            >
                              <SelectTrigger className="dy-h-6 dy-text-[11px] dy-px-1.5 dy-flex-1 dy-bg-background">
                                <SelectValue placeholder="Option..." />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldMeta.options.map((opt: any) => {
                                  const optVal = typeof opt === "string" ? opt : opt.value
                                  const optLabel = typeof opt === "string" ? opt : opt.label || opt.value
                                  return (
                                    <SelectItem key={optVal} value={optVal} className="dy-text-xs">
                                      {optLabel}
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type={kind === "number" ? "number" : kind === "date" ? "date" : "text"}
                              value={row.value ?? ""}
                              onChange={(e) => handleValueChange(row.id, e.target.value)}
                              placeholder={row.operator === "in" ? "value1, value2..." : "Value..."}
                              className="dy-h-6 dy-text-[11px] dy-px-1.5 dy-bg-background dy-flex-1"
                            />
                          )
                        ) : (
                          <div className="dy-flex-1 dy-px-2 dy-py-0.5 dy-rounded dy-bg-muted/40 dy-text-[10px] dy-text-muted-foreground dy-italic">
                            {row.operator === "exists" ? "Field has a non-null value" : "Field is null or unset"}
                          </div>
                        )}

                        {/* Remove Row Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="dy-h-6 dy-w-6 dy-p-0 dy-text-muted-foreground hover:dy-text-destructive dy-shrink-0"
                          onClick={() => handleRemoveRow(row.id)}
                          title="Remove condition"
                        >
                          <X className="dy-w-3.5 dy-h-3.5" />
                        </Button>
                      </div>
                    )
                  })}

                  <div className="dy-flex dy-items-center dy-justify-between dy-pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="dy-h-6 dy-px-2 dy-text-xs dy-text-primary hover:dy-text-primary dy-gap-1"
                      onClick={() => handleAddCondition()}
                    >
                      <Plus className="dy-w-3 dy-h-3" />
                      Add Condition
                    </Button>

                    {/* Quick Presets for Status Field */}
                    {statusField && (
                      <div className="dy-flex dy-items-center dy-gap-1 dy-text-[10px] dy-text-muted-foreground">
                        <span className="dy-hidden sm:dy-inline">Presets:</span>
                        {statusOptions.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAddCondition(statusField.name, opt)}
                            className="dy-px-1.5 dy-py-0.5 dy-rounded dy-bg-muted/60 hover:dy-bg-muted dy-text-foreground/80 hover:dy-text-foreground dy-transition-colors"
                          >
                            +{opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
