/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react"
import {
  DataSheetGrid,
  checkboxColumn,
  textColumn,
  keyColumn,
  type Column,
} from "react-datasheet-grid"
import "react-datasheet-grid/dist/style.css"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-context"
import type { CollectionConfig, Field } from "@dyrected/core"
import type { Field as FieldSchema } from "@dyrected/sdk"
import { Button } from "./button"
import { Popover, PopoverContent, PopoverAnchor } from "./popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./sheet"
import { JsonEditor } from "../forms/fields/json-editor"
import { RelationshipPicker } from "../forms/fields/relationship-picker"
import { IconPicker } from "../forms/fields/icon-picker"
import { getMediaUrl, cn, getDisplayFilename } from "../../lib/utils"
import { Undo2, Save } from "lucide-react"
import { FieldRenderer } from "../forms/field-renderer"

const RichTextEditor = React.lazy(async () => {
  const module = await import("../forms/fields/rich-text-editor")
  return { default: module.RichTextEditor }
})

const MediaPicker = React.lazy(async () => {
  const module = await import("../forms/fields/media-picker")
  return { default: module.MediaPicker }
})

function useFieldOptions(field: Field, collection: string, siblingValues: Record<string, unknown>) {
  const { client } = useDyrected()
  const isDynamic = !!(field.options && typeof field.options === "object" && "_dynamic" in field.options)

  const { data: dynamicOptions } = useQuery({
    queryKey: ["options", collection, field.name, siblingValues],
    queryFn: async () => {
      const q = new URLSearchParams()
      Object.entries(siblingValues).forEach(([k, v]) => {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") q.append(k, String(v))
      })
      const baseUrl = client?.getBaseUrl() || ""
      const url = `${baseUrl}/api/dyrected/options/${collection}/${field.name}?${q.toString()}`
      const authHeaders: Record<string, string> = {}
      const token = typeof window !== "undefined" ? localStorage.getItem("dyrected_token") : null
      if (token) authHeaders["Authorization"] = `Bearer ${token}`
      const res = await fetch(url, { headers: { "Content-Type": "application/json", ...authHeaders } })
      if (!res.ok) throw new Error("Failed to fetch options")
      return res.json()
    },
    enabled: !!client && isDynamic && !!collection && !!field.name,
  })

  return React.useMemo(() => {
    const rawOptions = isDynamic ? (dynamicOptions || []) : field.options
    return (Array.isArray(rawOptions) ? rawOptions : []).map((opt: unknown) => {
      if (typeof opt === "object" && opt !== null) {
        return { label: (opt as Record<string, unknown>).label as string, value: String((opt as Record<string, unknown>).value ?? "") }
      }
      return { label: String(opt), value: String(opt) }
    })
  }, [isDynamic, dynamicOptions, field.options])
}

function SelectCellDisplay({ field, value, collection, siblingValues }: { field: Field; value: unknown; collection: string; siblingValues: Record<string, unknown> }) {
  const options = useFieldOptions(field, collection, siblingValues)
  const matched = options.find((opt) => opt.value === String(value ?? ""))
  return <span>{matched ? matched.label : (value !== null && value !== undefined ? String(value) : "")}</span>
}

function SelectPopoverEditor({ field, value, collection, siblingValues, onCommit }: { field: Field; value: unknown; collection: string; siblingValues: Record<string, unknown>; onCommit: (val: string) => void }) {
  const options = useFieldOptions(field, collection, siblingValues)
  return (
    <div className="dy-max-h-60 dy-overflow-y-auto dy-flex dy-flex-col dy-divide-y dy-divide-border dy-bg-popover dy-rounded-md">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={cn(
            "dy-w-full dy-text-left dy-px-3 dy-py-2 dy-text-xs hover:dy-bg-accent hover:dy-text-accent-foreground dy-transition-colors",
            String(value ?? "") === opt.value && "dy-bg-accent/50 dy-font-semibold"
          )}
          onClick={() => onCommit(opt.value)}
        >
          {opt.label}
        </button>
      ))}
      {options.length === 0 && (
        <div className="dy-text-xs dy-text-muted-foreground dy-p-3 dy-text-center">No options available</div>
      )}
    </div>
  )
}

function MultiSelectCellDisplay({ field, value, collection, siblingValues }: { field: Field; value: unknown; collection: string; siblingValues: Record<string, unknown> }) {
  const options = useFieldOptions(field, collection, siblingValues)
  const selected = Array.isArray(value) ? value.map(String) : []
  const labels = selected.map((v) => options.find((o) => o.value === v)?.label ?? v)
  return <span>{labels.length > 0 ? labels.join(", ") : ""}</span>
}

function MultiSelectPopoverEditor({ field, value, collection, siblingValues, onToggle }: { field: Field; value: string[]; collection: string; siblingValues: Record<string, unknown>; onToggle: (val: string[]) => void }) {
  const options = useFieldOptions(field, collection, siblingValues)
  const selected = Array.isArray(value) ? value.map(String) : []

  return (
    <div className="dy-max-h-60 dy-overflow-y-auto dy-flex dy-flex-col dy-divide-y dy-divide-border dy-bg-popover dy-rounded-md">
      {options.map((opt) => {
        const checked = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            className={cn(
              "dy-w-full dy-text-left dy-px-3 dy-py-2 dy-text-xs hover:dy-bg-accent hover:dy-text-accent-foreground dy-transition-colors dy-flex dy-items-center dy-gap-2",
              checked && "dy-bg-accent/50"
            )}
            onClick={() => onToggle(checked ? selected.filter((v) => v !== opt.value) : [...selected, opt.value])}
          >
            <span className={cn(
              "dy-w-3.5 dy-h-3.5 dy-rounded-sm dy-border dy-border-border dy-flex-shrink-0 dy-flex dy-items-center dy-justify-center",
              checked && "dy-bg-primary dy-border-primary"
            )}>
              {checked && <span className="dy-text-primary-foreground dy-text-[10px] dy-leading-none">✓</span>}
            </span>
            {opt.label}
          </button>
        )
      })}
      {options.length === 0 && <div className="dy-text-xs dy-text-muted-foreground dy-p-3 dy-text-center">No options available</div>}
    </div>
  )
}

function SubFieldRow({ subField, value, onChange, collection }: { subField: Field; value: unknown; onChange: (val: unknown) => void; collection: string }) {
  const { user, schemas } = useDyrected()

  const handleChange = React.useCallback((eventOrValue: unknown) => {
    if (eventOrValue != null && typeof eventOrValue === "object" && "target" in (eventOrValue as object)) {
      const e = eventOrValue as React.ChangeEvent<HTMLInputElement>
      if (e.target.type === "checkbox") {
        onChange(e.target.checked)
      } else if (e.target.value === "") {
        onChange(null)
      } else if (subField.type === "number") {
        onChange(Number(e.target.value))
      } else {
        onChange(e.target.value)
      }
    } else {
      onChange(eventOrValue)
    }
  }, [onChange, subField.type])

  const syntheticField = React.useMemo(() => ({
    value: value ?? (subField.type === "boolean" ? false : ""),
    onChange: handleChange,
    name: subField.name ?? "",
    ref: { current: null } as React.MutableRefObject<null>,
  }), [value, handleChange, subField.name, subField.type])

  return (
    <div className="dy-flex dy-flex-col dy-gap-0.5">
      <label className="dy-text-[10px] dy-text-muted-foreground">{subField.label || subField.name}</label>
      <FieldRenderer
        schema={subField as unknown as import("@dyrected/sdk").Field}
        field={syntheticField}
        collection={collection}
        context={{
          user: user ?? null,
          schemas,
          siblingData: {},
        }}
      />
    </div>
  )
}

function ObjectPopoverEditor({ field, value, onChange, collection }: { field: Field; value: unknown; onChange: (val: Record<string, unknown>) => void; collection: string }) {
  const subFields = ((field as any).fields as Field[]) || []
  const obj = (typeof value === "object" && value !== null && !Array.isArray(value)) ? value as Record<string, unknown> : {}
  return (
    <div className="dy-flex dy-flex-col dy-gap-3 dy-max-h-[400px] dy-overflow-y-auto">
      <div className="dy-text-xs dy-font-semibold dy-text-muted-foreground">{field.label || field.name}</div>
      {subFields.filter((sf) => !["object", "array", "blocks", "join", "row", "richText"].includes(sf.type)).map((sf) => (
        <SubFieldRow key={sf.name} subField={sf} value={obj[sf.name]} onChange={(val) => onChange({ ...obj, [sf.name]: val })} collection={collection} />
      ))}
      {subFields.length === 0 && <div className="dy-text-xs dy-text-muted-foreground">No fields defined</div>}
    </div>
  )
}

function ArrayPopoverEditor({ field, value, onChange, collection }: { field: Field; value: unknown; onChange: (val: Record<string, unknown>[]) => void; collection: string }) {
  const subFields = ((field as any).fields as Field[]) || []
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : []

  const updateItem = (idx: number, key: string, val: unknown) =>
    onChange(items.map((item, i) => (i === idx ? { ...item, [key]: val } : item)))

  return (
    <div className="dy-flex dy-flex-col dy-gap-3 dy-max-h-[400px] dy-overflow-y-auto">
      <div className="dy-text-xs dy-font-semibold dy-text-muted-foreground">{field.label || field.name} ({items.length} items)</div>
      {items.map((item, idx) => (
        <div key={idx} className="dy-border dy-rounded-md dy-p-2 dy-flex dy-flex-col dy-gap-2">
          <div className="dy-flex dy-items-center dy-justify-between">
            <span className="dy-text-[10px] dy-font-medium dy-text-muted-foreground">Item {idx + 1}</span>
            <button type="button" className="dy-text-[10px] dy-text-destructive hover:dy-underline" onClick={() => onChange(items.filter((_, i) => i !== idx))}>
              Remove
            </button>
          </div>
          {subFields.filter((sf) => !["object", "array", "blocks", "join", "row", "richText"].includes(sf.type)).map((sf) => (
            <SubFieldRow key={sf.name} subField={sf} value={item[sf.name]} onChange={(val) => updateItem(idx, sf.name, val)} collection={collection} />
          ))}
        </div>
      ))}
      <button
        type="button"
        className="dy-w-full dy-border dy-border-dashed dy-rounded dy-py-1.5 dy-text-xs dy-text-muted-foreground hover:dy-bg-muted/30 dy-transition-colors"
        onClick={() => onChange([...items, {}])}
      >
        + Add item
      </button>
    </div>
  )
}

interface SpreadsheetEditorProps {
  slug: string
  schema: CollectionConfig
  data: Record<string, unknown>[]
  onSave: (updates: Record<string, Record<string, unknown>>, creates?: Record<string, unknown>[]) => Promise<void>
  isSaving: boolean
  isRefreshing?: boolean
}

export function SpreadsheetEditor({
  slug,
  schema,
  data,
  onSave,
  isSaving,
  isRefreshing = false,
}: SpreadsheetEditorProps) {
  const { client } = useDyrected()
  const [drafts, setDrafts] = React.useState<Record<string, Record<string, unknown>>>({})
  const [newRows, setNewRows] = React.useState<Record<string, unknown>[]>([])
  const [activePopover, setActivePopover] = React.useState<{
    rowIdx: number
    field: Field
    value: unknown
    element: HTMLElement
  } | null>(null)
  const [localDraft, setLocalDraft] = React.useState<unknown>(null)

  // Fetch schemas for context
  const { data: schemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client,
  })

  // Existing rows merged with drafts, followed by unsaved new rows
  const gridData = React.useMemo(() => {
    return [
      ...data.map((row) => {
        const draftRow = drafts[String(row.id)] || {}
        return { ...row, ...draftRow }
      }),
      ...newRows,
    ]
  }, [data, drafts, newRows])

  const handleGridChange = (nextData: Record<string, unknown>[]) => {
    const updatedDrafts = { ...drafts }

    // Existing rows: track edits against the server data
    nextData.slice(0, data.length).forEach((row, idx) => {
      const originalRow = data[idx]
      if (!originalRow) return

      const changedFields: Record<string, unknown> = {}
      let isRowDirty = false

      Object.keys(row).forEach((key) => {
        if (row[key] !== originalRow[key]) {
          changedFields[key] = row[key]
          isRowDirty = true
        }
      })

      if (isRowDirty) {
        updatedDrafts[String(row.id)] = {
          ...(updatedDrafts[String(row.id)] || {}),
          ...changedFields,
        }
      } else {
        delete updatedDrafts[String(row.id)]
      }
    })

    setDrafts(updatedDrafts)
    // New rows are everything beyond the original data length
    setNewRows(nextData.slice(data.length))
  }

  const handleDiscard = () => {
    setDrafts({})
    setNewRows([])
  }

  const handleCommitSave = async () => {
    if (Object.keys(drafts).length === 0 && newRows.length === 0) return
    await onSave(drafts, newRows)
    setDrafts({})
    setNewRows([])
  }

  // Click cell popup helper
  const openPopoverEditor = (rowIdx: number, field: Field, value: unknown, element: HTMLElement) => {
    setLocalDraft(value)
    setActivePopover({ rowIdx, field, value, element })
  }

  const commitValue = (newValue: unknown) => {
    if (!activePopover) return
    const { rowIdx, field } = activePopover
    const row = gridData[rowIdx]
    if (!row) return

    setDrafts((prev) => ({
      ...prev,
      [String(row.id)]: {
        ...(prev[String(row.id)] || {}),
        [field.name]: newValue,
      },
    }))
    handlePopoverClose()
  }

  const handlePopoverClose = () => {
    if (activePopover?.element) {
      const el = activePopover.element
      setTimeout(() => {
        el.focus()
      }, 50)
    }
    setActivePopover(null)
  }

  // Map dyrected fields to react-datasheet-grid columns
  const columns = React.useMemo(() => {
    const cols: Column<any, any>[] = []

    const displayFields = schema.fields.filter(
      (f) => f.name !== "password" && !f.admin?.hidden && f.type !== "row" && f.type !== "join" && f.type !== "blocks"
    )

    displayFields.forEach((field) => {
      const isReadOnly = !!field.admin?.readOnly

      // 1. Text components
      if (field.type === "text" || field.type === "email" || field.type === "url") {
        cols.push({
          ...keyColumn(field.name, textColumn),
          title: field.label || field.name,
          disabled: isReadOnly,
        })
        return
      }

      // 2. Boolean switches/checkboxes
      if (field.type === "boolean") {
        cols.push({
          ...keyColumn(field.name, checkboxColumn),
          title: field.label || field.name,
          disabled: isReadOnly,
        })
        return
      }

      // 3. Number (inline input, no popover)
      if (field.type === "number") {
        const numberColumn = {
          component: ({ rowData: value, setRowData: onChange, focus }: any) => {
            const numValue = value != null ? String(value) : ""
            return (
              <input
                type="number"
                className="dy-w-full dy-h-full dy-bg-transparent dy-outline-none dy-px-2 dy-text-xs dy-text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:dy-appearance-none [&::-webkit-inner-spin-button]:dy-appearance-none"
                value={numValue}
                onChange={(e) => {
                  const raw = e.target.value
                  onChange(raw === "" ? null : Number(raw))
                }}
                disabled={isReadOnly}
                autoFocus={focus}
              />
            )
          },
          deleteValue: () => null,
          copyValue: ({ rowData: value }: any) => String(value ?? ""),
          pasteValue: ({ value }: any) => {
            const n = Number(value)
            return isNaN(n) ? null : n
          },
        }
        cols.push({
          ...keyColumn(field.name, numberColumn),
          title: field.label || field.name,
          disabled: isReadOnly,
        })
        return
      }

      // 4. Date & Temporal (Inline standard inputs without modals)
      if (field.type === "date" || field.type === "datetime" || field.type === "time") {
        const inputType = field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : "time";
        const dateColumn = {
          component: ({ rowData: value, setRowData: onChange, focus }: any) => {
            const dateValue = value ? String(value).split("T")[0] : ""
            return (
              <input
                type={inputType}
                className="dy-w-full dy-h-full dy-bg-transparent dy-outline-none dy-px-2 dy-text-xs dy-text-foreground"
                value={dateValue}
                onChange={(e) => onChange(e.target.value)}
                onFocus={(e) => {
                  const target = e.target as HTMLInputElement
                  if (typeof target.showPicker === "function") {
                    try {
                      target.showPicker()
                    } catch (err) {
                      console.warn("Failed to open date picker", err)
                    }
                  }
                }}
                onClick={(e) => {
                  const target = e.target as HTMLInputElement
                  if (typeof target.showPicker === "function") {
                    try {
                      target.showPicker()
                    } catch (err) {
                      console.warn("Failed to open date picker", err)
                    }
                  }
                }}
                disabled={isReadOnly}
                autoFocus={focus}
              />
            )
          },
          deleteValue: () => null,
          copyValue: ({ rowData: value }: any) => String(value || ""),
          pasteValue: ({ value }: any) => value,
        }
        cols.push({
          ...keyColumn(field.name, dateColumn),
          title: field.label || field.name,
        })
        return
      }

      // 5. Fallback rendering for popups (RichText, JSON, Media, Relational, Select, Textarea, multiSelect, object, array)
      const popupColumn = {
        component: ({ rowData, rowIndex }: any) => {
          if (!rowData) return null
          const value = rowData[field.name]
          const isSelectOrRadio = field.type === "select" || field.type === "radio"
          const isMultiSelect = field.type === "multiSelect"
          const isArray = field.type === "array"
          const isObject = field.type === "object"

          let display = ""
          if (!isSelectOrRadio && !isMultiSelect && !isArray && !isObject && value !== null && value !== undefined) {
            if (typeof value === "object") {
              display = (value as any).title || (value as any).name || getDisplayFilename((value as any).filename) || JSON.stringify(value)
            } else {
              display = String(value)
            }
          }

          if (field.type === "richText" && display) {
            display = display.replace(/<[^>]*>/g, "")
          }

          if (isArray) {
            display = Array.isArray(value) ? `${value.length} item${value.length !== 1 ? "s" : ""}` : "0 items"
          }

          if (isObject && typeof value === "object" && value !== null) {
            const keys = Object.keys(value as object).filter((k) => (value as any)[k] != null)
            display = keys.length > 0 ? keys.slice(0, 2).map((k) => `${k}: ${String((value as any)[k]).slice(0, 15)}`).join(", ") : "{ empty }"
          }

          const isMedia = field.type === "image" || field.relationTo === "media" ||
            (schemas?.collections?.find((c: any) => c?.slug === field.relationTo)?.upload);

          return (
            <div
              tabIndex={-1}
              className="dy-w-full dy-h-full dy-px-2 dy-py-1 dy-truncate dy-cursor-pointer hover:dy-bg-muted/30 dy-flex dy-items-center dy-gap-2 dy-outline-none"
              onClick={(e) => openPopoverEditor(rowIndex, field, value, e.currentTarget)}
            >
              {isMedia && value ? (
                <div className="dy-w-6 dy-h-6 dy-rounded dy-bg-muted dy-border dy-overflow-hidden dy-flex-shrink-0 dy-flex dy-items-center dy-justify-center">
                  {typeof value === "object" && (value as any).url ? (
                    <img src={getMediaUrl(value as any, client?.getBaseUrl() || "")} className="dy-w-full dy-h-full dy-object-cover" alt="" />
                  ) : typeof value === "string" && value.startsWith("http") ? (
                    <img src={value} className="dy-w-full dy-h-full dy-object-cover" alt="" />
                  ) : (
                    <span className="dy-text-[9px] dy-font-mono">ID</span>
                  )}
                </div>
              ) : null}
              {isSelectOrRadio ? (
                <span className="dy-text-xs dy-text-foreground">
                  <SelectCellDisplay field={field} value={value} collection={slug} siblingValues={rowData} />
                </span>
              ) : isMultiSelect ? (
                <span className="dy-text-xs dy-text-foreground">
                  <MultiSelectCellDisplay field={field} value={value} collection={slug} siblingValues={rowData} />
                </span>
              ) : (
                <span className="dy-text-xs dy-text-muted-foreground">{display || `Click to edit`}</span>
              )}
            </div>
          )
        },
        deleteValue: ({ rowData }: any) => {
          if (!rowData) return {}
          return { ...rowData, [field.name]: null }
        },
        copyValue: ({ rowData }: any) => {
          if (!rowData) return ""
          const val = rowData[field.name]
          return typeof val === "object" ? JSON.stringify(val) : String(val || "")
        },
        pasteValue: ({ rowData, value }: any) => {
          if (!rowData) return {}
          try {
            return { ...rowData, [field.name]: JSON.parse(value) }
          } catch {
            return { ...rowData, [field.name]: value }
          }
        },
      }

      cols.push({
        ...popupColumn,
        id: field.name,
        title: field.label || field.name,
      })
    })

    return cols
  }, [schema, schemas, client, slug])

  const hasDrafts = Object.keys(drafts).length > 0 || newRows.length > 0

  // Size the grid to its content so the page scrolls instead of the grid.
  // react-datasheet-grid requires an explicit height; 40px header + 40px/row + 42px add-row bar.
  const gridHeight = 40 + gridData.length * 40 + 42

  return (
    <div className="dy-relative dy-flex dy-flex-col dy-w-full dy-border dy-rounded-lg dy-bg-background">
      {isRefreshing ? (
        <div className="dy-pointer-events-none dy-absolute dy-right-3 dy-top-3 dy-z-10">
          <div
            aria-live="polite"
            className="dy-inline-flex dy-items-center dy-gap-2 dy-rounded-full dy-border dy-border-border/60 dy-bg-card/95 dy-px-3 dy-py-1.5 dy-text-xs dy-font-medium dy-text-muted-foreground dy-shadow-sm dy-backdrop-blur"
          >
            <div className="dy-h-3.5 dy-w-3.5 dy-animate-spin dy-rounded-full dy-border-2 dy-border-primary/20 dy-border-t-primary" />
            Updating results...
          </div>
        </div>
      ) : null}
      <div className="dy-w-full">
        <DataSheetGrid
          height={gridHeight}
          value={gridData}
          onChange={handleGridChange as any}
          columns={columns}
          rowClassName={({ rowIndex }) => {
            const row = gridData[rowIndex]
            const isDirty = row && drafts[String(row.id)]
            return isDirty ? "dy-bg-amber-500/5 hover:dy-bg-amber-500/10" : ""
          }}
        />
      </div>

      {hasDrafts && (
        <div className="dy-absolute dy-bottom-4 dy-left-1/2 dy-transform dy--translate-x-1/2 dy-flex dy-items-center dy-gap-3 dy-px-4 dy-py-3 dy-bg-card dy-border dy-rounded-xl dy-shadow-lg dy-animate-in dy-fade-in dy-slide-in-from-bottom-4">
          <span className="dy-text-xs dy-font-medium dy-text-amber-600">
            {[
              Object.keys(drafts).length > 0 && `${Object.keys(drafts).length} modified`,
              newRows.length > 0 && `${newRows.length} new`,
            ].filter(Boolean).join(", ")}
          </span>
          <div className="dy-flex dy-items-center dy-gap-2">
            <Button
              variant="outline"
              size="sm"
              className="dy-h-8 dy-text-xs"
              onClick={handleDiscard}
              disabled={isSaving}
            >
              <Undo2 className="dy-w-3.5 dy-h-3.5 dy-mr-1" />
              Discard
            </Button>
            <Button
              size="sm"
              className="dy-h-8 dy-text-xs"
              onClick={handleCommitSave}
              disabled={isSaving}
            >
              <Save className="dy-w-3.5 dy-h-3.5 dy-mr-1" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {/* Rich Text Slide-out Sheet Panel */}
      <Sheet
        open={!!activePopover && activePopover.field.type === "richText"}
        onOpenChange={(open) => {
          if (!open) {
            if (activePopover) {
              const { rowIdx, field } = activePopover
              const row = gridData[rowIdx]
              if (row) {
                setDrafts((prev) => ({
                  ...prev,
                  [String(row.id)]: {
                    ...(prev[String(row.id)] || {}),
                    [field.name]: localDraft,
                  },
                }))
              }
            }
            handlePopoverClose()
          }
        }}
      >
        <SheetContent className="sm:dy-max-w-[600px] dy-w-full dy-flex dy-flex-col dy-h-full dy-z-[150]">
          <SheetHeader>
            <SheetTitle>Edit {activePopover?.field.label || activePopover?.field.name}</SheetTitle>
          </SheetHeader>
          <div className="dy-flex-1 dy-py-4 dy-overflow-y-auto">
            {activePopover && activePopover.field.type === "richText" && (
              <React.Suspense fallback={<div className="dy-h-40 dy-rounded-md dy-border dy-border-dashed dy-border-border/70 dy-bg-muted/20" />}>
                <RichTextEditor
                  value={typeof localDraft === "string" ? localDraft : ""}
                  onChange={(val) => setLocalDraft(val)}
                  collection={slug}
                />
              </React.Suspense>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Popover editor for other complex fields */}
      <Popover
        open={!!activePopover && activePopover.field.type !== "richText"}
        onOpenChange={(open) => {
          if (!open) {
            handlePopoverClose()
          }
        }}
      >
        {activePopover && activePopover.field.type !== "richText" && (
          <>
            <PopoverAnchor virtualRef={{ current: activePopover.element }} />
            <PopoverContent
              className={cn(
                "dy-z-[100] dy-p-3 dy-bg-popover dy-border dy-rounded-md dy-shadow-md",
                activePopover.field.type === "object" || activePopover.field.type === "array"
                  ? "dy-w-96"
                  : "dy-w-80"
              )}
              onInteractOutside={() => {
                const { rowIdx, field } = activePopover
                const localDraftTypes = ["textarea", "json", "object", "array"]
                if (!localDraftTypes.includes(field.type)) return
                const row = gridData[rowIdx]
                if (row) {
                  setDrafts((prev) => ({
                    ...prev,
                    [String(row.id)]: {
                      ...(prev[String(row.id)] || {}),
                      [field.name]: localDraft,
                    },
                  }))
                }
              }}
              onEscapeKeyDown={() => {
                // discardLocalDraft on escape (just close without committing)
              }}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {activePopover.field.type === "json" && (
                <div className="dy-flex dy-flex-col dy-gap-2">
                  <div className="dy-text-xs dy-font-semibold dy-text-muted-foreground">
                    Edit {activePopover.field.label || activePopover.field.name}
                  </div>
                  <div className="dy-min-h-[200px] dy-max-h-[400px] dy-overflow-y-auto">
                    <JsonEditor
                      value={localDraft}
                      onChange={(val) => setLocalDraft(val)}
                    />
                  </div>
                </div>
              )}

              {activePopover.field.type === "textarea" && (
                <div className="dy-flex dy-flex-col dy-gap-2">
                  <div className="dy-text-xs dy-font-semibold dy-text-muted-foreground">
                    Edit {activePopover.field.label || activePopover.field.name}
                  </div>
                  <textarea
                    className="dy-w-full dy-h-32 dy-border dy-rounded-md dy-p-2 dy-text-xs dy-bg-background dy-text-foreground dy-resize-y dy-outline-none focus:dy-ring-1 focus:dy-ring-ring"
                    value={typeof localDraft === "string" ? localDraft : ""}
                    onChange={(e) => setLocalDraft(e.target.value)}
                    autoFocus
                  />
                </div>
              )}

              {activePopover.field.type === "relationship" && (() => {
                const isMediaRel = activePopover.field.relationTo === "media" ||
                  (schemas?.collections?.find((c: any) => c?.slug === activePopover.field.relationTo)?.upload);

                const handleRelationChange = (val: any) => {
                  setLocalDraft(val)
                  commitValue(val)
                }

                if (isMediaRel) {
                  return (
                    <React.Suspense fallback={<div className="dy-h-24 dy-rounded-md dy-border dy-border-dashed dy-border-border/70 dy-bg-muted/20" />}>
                      <MediaPicker
                        value={localDraft}
                        onChange={handleRelationChange}
                        collection={activePopover.field.relationTo || "media"}
                        multiple={activePopover.field.hasMany}
                      />
                    </React.Suspense>
                  )
                }

                return (
                  <RelationshipPicker
                    value={localDraft as string | string[] | undefined}
                    onChange={handleRelationChange}
                    relationTo={activePopover.field.relationTo}
                    multiple={activePopover.field.hasMany}
                  />
                )
              })()}

              {activePopover.field.type === "image" && (
                <React.Suspense fallback={<div className="dy-h-24 dy-rounded-md dy-border dy-border-dashed dy-border-border/70 dy-bg-muted/20" />}>
                  <MediaPicker
                    value={localDraft}
                    onChange={(val) => {
                      setLocalDraft(val)
                      commitValue(val)
                    }}
                    collection={activePopover.field.relationTo || "media"}
                    multiple={activePopover.field.hasMany}
                  />
                </React.Suspense>
              )}

              {activePopover.field.type === "icon" && (
                <IconPicker
                  schema={activePopover.field as unknown as FieldSchema}
                  field={{
                    value: typeof localDraft === "string" ? localDraft : "",
                    onChange: (val: string) => {
                      setLocalDraft(val)
                      commitValue(val)
                    },
                  }}
                />
              )}

              {(activePopover.field.type === "select" || activePopover.field.type === "radio") && (
                <SelectPopoverEditor
                  field={activePopover.field}
                  value={localDraft}
                  collection={slug}
                  siblingValues={gridData[activePopover.rowIdx] || {}}
                  onCommit={(val) => {
                    setLocalDraft(val)
                    commitValue(val)
                  }}
                />
              )}

              {activePopover.field.type === "multiSelect" && (
                <MultiSelectPopoverEditor
                  field={activePopover.field}
                  value={Array.isArray(localDraft) ? localDraft as string[] : []}
                  collection={slug}
                  siblingValues={gridData[activePopover.rowIdx] || {}}
                  onToggle={(val) => {
                    setLocalDraft(val)
                    commitValue(val)
                  }}
                />
              )}

              {activePopover.field.type === "object" && (
                <ObjectPopoverEditor
                  field={activePopover.field}
                  value={localDraft}
                  onChange={(val) => setLocalDraft(val)}
                  collection={slug}
                />
              )}

              {activePopover.field.type === "array" && (
                <ArrayPopoverEditor
                  field={activePopover.field}
                  value={localDraft}
                  onChange={(val) => setLocalDraft(val)}
                  collection={slug}
                />
              )}
            </PopoverContent>
          </>
        )}
      </Popover>
    </div>
  )
}
