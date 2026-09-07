import * as React from "react"
import { format, parseISO } from "date-fns"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import { Badge } from "../../../../components/ui/badge"
import { Button } from "../../../../components/ui/button"
import { Calendar } from "../../../../components/ui/calendar"
import { Checkbox } from "../../../../components/ui/checkbox"
import { Check, ExternalLink, Image as ImageIcon, Loader2, Plus, Search, X } from "lucide-react"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "../../../../components/ui/popover"
import { Textarea } from "../../../../components/ui/textarea"
import { cn, getMediaUrl } from "../../../../lib/utils"
import { resolveActiveMediaCollection } from "../../../../lib/media-utils"
import { resolveDocumentTitle, resolveValueTitle } from "../../../../lib/document-title"
import { useDyrected } from "../../../../providers/dyrected-context"
import { MediaLibraryDialog } from "../../../../components/media/media-library-dialog"
import type { CellVariantMeta, DataGridTableMeta } from "./data-grid-types"

type AnyTableMeta = DataGridTableMeta<any>
import { DataGridCellWrapper } from "./data-grid-cell-wrapper"

export interface CellEditorProps {
  value: unknown
  columnId: string
  rowIndex: number
  docId?: string
  rowHeight?: number
  isFocused: boolean
  isEditing: boolean
  isSelected: boolean
  isDirty?: boolean
  readOnly: boolean
  /** Editor variant resolved from the column meta. */
  variant: CellVariantMeta["variant"]
  options?: { label: string; value: string }[]
  relationTo?: string
  tableMeta: AnyTableMeta
  onSelect: () => void
  onEdit: () => void
  /** Commit + move (Tab/Enter semantics handled by the grid). */
  onStopEditing: (move?: { direction?: "up" | "down" | "left" | "right"; moveToNextRow?: boolean }) => void
}

function commit(
  tableMeta: DataGridTableMeta<unknown>,
  payload: { rowIndex: number; columnId: string; value: unknown; docId?: string },
) {
  tableMeta.onDataUpdate?.(payload)
}

/** Inline single-line text editing for text/email/url/icon fields. */
export function ShortTextCell({
  value: initialValue,
  columnId,
  rowIndex,
  docId,
  isFocused,
  isEditing,
  isSelected,
  isDirty,
  readOnly,
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const commitValue = (next: string, move?: Parameters<CellEditorProps["onStopEditing"]>[0]) => {
    const normalized = next.trim() === "" ? null : next
    if (!readOnly && normalized !== (initialValue ?? null)) {
      commit(tableMeta, { rowIndex, columnId, value: normalized, docId })
    }
    onStopEditing(move)
  }

  React.useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      isDirty={isDirty}
      onSelect={onSelect}
      onEdit={onEdit}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          className="dy-w-full dy-bg-transparent dy-outline-none dy-text-xs dy-text-foreground"
          defaultValue={String(initialValue ?? "")}
          onBlur={(event) => commitValue(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === "Enter") {
              event.preventDefault()
              commitValue(event.currentTarget.value, { moveToNextRow: true })
            } else if (event.key === "Tab") {
              event.preventDefault()
              commitValue(event.currentTarget.value, {
                direction: event.shiftKey ? "left" : "right",
              })
            } else if (event.key === "Escape") {
              event.preventDefault()
              onStopEditing()
            }
          }}
        />
      ) : (
        <span className="dy-truncate">{String(initialValue ?? "")}</span>
      )}
    </DataGridCellWrapper>
  )
}

export function NumberCell({
  value: initialValue,
  columnId,
  rowIndex,
  docId,
  isFocused,
  isEditing,
  isSelected,
  isDirty,
  readOnly,
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const toNumber = (raw: string): number | null =>
    raw.trim() === "" ? null : Number.isNaN(Number(raw)) ? null : Number(raw)

  const commitValue = (raw: string, move?: Parameters<CellEditorProps["onStopEditing"]>[0]) => {
    const next = toNumber(raw)
    if (!readOnly && next !== (initialValue ?? null)) {
      commit(tableMeta, { rowIndex, columnId, value: next, docId })
    }
    onStopEditing(move)
  }

  React.useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      isDirty={isDirty}
      onSelect={onSelect}
      onEdit={onEdit}
      className="dy-justify-end dy-tabular-nums"
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          className="dy-w-full dy-bg-transparent dy-text-right dy-outline-none dy-text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:dy-appearance-none [&::-webkit-outer-spin-button]:dy-appearance-none"
          defaultValue={String(initialValue ?? "")}
          onBlur={(event) => commitValue(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === "Enter") {
              event.preventDefault()
              commitValue(event.currentTarget.value, { moveToNextRow: true })
            } else if (event.key === "Tab") {
              event.preventDefault()
              commitValue(event.currentTarget.value, {
                direction: event.shiftKey ? "left" : "right",
              })
            } else if (event.key === "Escape") {
              event.preventDefault()
              onStopEditing()
            }
          }}
        />
      ) : (
        <span className="dy-truncate">{initialValue === null || initialValue === undefined ? "" : String(initialValue)}</span>
      )}
    </DataGridCellWrapper>
  )
}

export function CheckboxCell({
  value: initialValue,
  columnId,
  rowIndex,
  docId,
  isFocused,
  isSelected,
  isDirty,
  readOnly,
  tableMeta,
  onSelect,
}: CellEditorProps) {
  const checked = Boolean(initialValue)

  const toggle = () => {
    if (!readOnly) {
      commit(tableMeta, { rowIndex, columnId, value: !checked, docId })
    }
  }

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isDirty={isDirty}
      onSelect={onSelect}
      onEdit={toggle}
      className="dy-justify-center"
      onKeyDownCapture={(event) => {
        if (!isFocused || readOnly) return
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault()
          event.stopPropagation()
          toggle()
        }
      }}
    >
      <Checkbox
        checked={checked}
        disabled={readOnly}
        onCheckedChange={toggle}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      />
    </DataGridCellWrapper>
  )
}

export function SelectCell({
  value: initialValue,
  columnId,
  rowIndex,
  docId,
  isFocused,
  isEditing,
  isSelected,
  isDirty,
  readOnly,
  options = [],
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const labelByValue = React.useMemo(
    () => new Map(options.map((option) => [String(option.value), option.label])),
    [options],
  )
  const displayLabel = initialValue !== null && initialValue !== undefined && initialValue !== ""
    ? labelByValue.get(String(initialValue)) ?? String(initialValue)
    : null

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      isDirty={isDirty}
      onSelect={onSelect}
      onEdit={onEdit}
    >
      <Popover open={isEditing} onOpenChange={(open) => { if (!open) onStopEditing() }}>
        <PopoverAnchor asChild>
          <div className="dy-flex dy-w-full dy-h-full dy-items-center dy-min-w-0">
            {displayLabel ? (
              <Badge variant="secondary" className="dy-max-w-full dy-truncate dy-px-1.5 dy-py-px">
                {displayLabel}
              </Badge>
            ) : (
              <span className="dy-text-muted-foreground/50">—</span>
            )}
          </div>
        </PopoverAnchor>
        {isEditing ? (
          <PopoverContent
            align="start"
            sideOffset={4}
            className="dy-w-56 dy-p-1 dy-shadow-lg dy-z-50"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={() => onStopEditing()}
          >
            <div className="dy-flex dy-max-h-60 dy-flex-col dy-overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "dy-rounded-sm dy-px-2.5 dy-py-2 dy-text-left dy-text-xs hover:dy-bg-accent hover:dy-text-accent-foreground dy-transition-colors",
                    String(initialValue ?? "") === String(option.value) && "dy-font-semibold dy-text-primary dy-bg-accent/40",
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!readOnly) {
                      commit(tableMeta, { rowIndex, columnId, value: option.value, docId })
                    }
                    onStopEditing()
                  }}
                >
                  {option.label}
                </button>
              ))}
              {!options.length && (
                <p className="dy-px-2 dy-py-1.5 dy-text-xs dy-text-muted-foreground">No options</p>
              )}
            </div>
          </PopoverContent>
        ) : null}
      </Popover>
    </DataGridCellWrapper>
  )
}

export function MultiSelectCell({
  value: initialValue,
  columnId,
  rowIndex,
  docId,
  isFocused,
  isEditing,
  isSelected,
  isDirty,
  readOnly,
  options = [],
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const selected: string[] = Array.isArray(initialValue)
    ? initialValue.map(String)
    : typeof initialValue === "string" && initialValue
      ? [initialValue]
      : []
  const labelByValue = React.useMemo(
    () => new Map(options.map((option) => [String(option.value), option.label])),
    [options],
  )

  const toggle = (optionValue: string) => {
    if (readOnly) return
    const next = selected.includes(optionValue)
      ? selected.filter((value) => value !== optionValue)
      : [...selected, optionValue]
    commit(tableMeta, { rowIndex, columnId, value: next, docId })
  }

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      isDirty={isDirty}
      onSelect={onSelect}
      onEdit={onEdit}
    >
      <Popover open={isEditing} onOpenChange={(open) => { if (!open) onStopEditing() }}>
        <PopoverAnchor asChild>
          <div className="dy-flex dy-w-full dy-h-full dy-min-w-0 dy-flex-1 dy-items-center dy-gap-1 dy-overflow-hidden">
            {selected.length ? (
              <>
                <Badge variant="secondary" className="dy-max-w-[70%] dy-truncate dy-px-1.5 dy-py-px">
                  {labelByValue.get(selected[0]) ?? selected[0]}
                </Badge>
                {selected.length > 1 && (
                  <span className="dy-shrink-0 dy-text-[10px] dy-text-muted-foreground">
                    +{selected.length - 1}
                  </span>
                )}
              </>
            ) : (
              <span className="dy-text-muted-foreground/50">—</span>
            )}
          </div>
        </PopoverAnchor>
        {isEditing ? (
          <PopoverContent
            align="start"
            sideOffset={4}
            className="dy-w-60 dy-p-1 dy-shadow-lg dy-z-50"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={() => onStopEditing()}
          >
            <div className="dy-flex dy-max-h-64 dy-flex-col dy-overflow-y-auto">
              {options.map((option) => {
                const isChecked = selected.includes(String(option.value))
                return (
                  <button
                    key={option.value}
                    type="button"
                    className="dy-flex dy-items-center dy-gap-2 dy-rounded-sm dy-px-2.5 dy-py-2 dy-text-left dy-text-xs hover:dy-bg-accent hover:dy-text-accent-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(String(option.value))
                    }}
                  >
                    <span
                      className={cn(
                        "dy-flex dy-h-4 dy-w-4 dy-shrink-0 dy-items-center dy-justify-center dy-rounded-sm dy-border dy-border-border",
                        isChecked && "dy-bg-primary dy-border-primary dy-text-primary-foreground",
                      )}
                    >
                      {isChecked ? "✓" : ""}
                    </span>
                    <span className="dy-truncate">{option.label}</span>
                  </button>
                )
              })}
              {!options.length && (
                <p className="dy-px-2 dy-py-1.5 dy-text-xs dy-text-muted-foreground">No options</p>
              )}
            </div>
            {selected.length > 0 && !readOnly ? (
              <Button
                variant="ghost"
                size="sm"
                className="dy-mt-1 dy-h-7 dy-w-full dy-text-xs dy-text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  commit(tableMeta, { rowIndex, columnId, value: [], docId })
                }}
              >
                Clear all
              </Button>
            ) : null}
          </PopoverContent>
        ) : null}
      </Popover>
    </DataGridCellWrapper>
  )
}

export function DateCell({
  value: initialValue,
  columnId,
  rowIndex,
  docId,
  isFocused,
  isEditing,
  isSelected,
  isDirty,
  readOnly,
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const parsedDate = React.useMemo(() => {
    if (!initialValue) return undefined
    try {
      return typeof initialValue === "string" ? parseISO(initialValue) : new Date(String(initialValue))
    } catch {
      return undefined
    }
  }, [initialValue])

  const display = parsedDate && !Number.isNaN(parsedDate.getTime()) ? format(parsedDate, "MMM d, yyyy") : ""

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      isDirty={isDirty}
      onSelect={onSelect}
      onEdit={onEdit}
    >
      <Popover open={isEditing} onOpenChange={(open) => { if (!open) onStopEditing() }}>
        <PopoverAnchor asChild>
          <div className="dy-flex dy-w-full dy-h-full dy-items-center dy-min-w-0">
            {display ? (
              <span className="dy-text-xs dy-text-foreground">{display}</span>
            ) : (
              <span className="dy-text-muted-foreground/50">—</span>
            )}
          </div>
        </PopoverAnchor>
        {isEditing ? (
          <PopoverContent
            align="start"
            sideOffset={4}
            className="dy-w-auto dy-p-0 dy-shadow-lg dy-z-50"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={() => onStopEditing()}
          >
            <Calendar
              mode="single"
              defaultMonth={parsedDate ?? new Date()}
              selected={parsedDate}
              onSelect={(date) => {
                if (date && !readOnly) {
                  commit(tableMeta, { rowIndex, columnId, value: date.toISOString(), docId })
                }
                onStopEditing()
              }}
            />
          </PopoverContent>
        ) : null}
      </Popover>
    </DataGridCellWrapper>
  )
}

/**
 * Long-form values (textarea/richText/…) get an inline popover editor with
 * full multiline support, autofocus, and a Done button so edits are seamless.
 */
export function LongTextCell({
  value: initialValue,
  columnId,
  rowIndex,
  docId,
  isFocused,
  isEditing,
  isSelected,
  isDirty,
  readOnly,
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const [draft, setDraft] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const text = String(initialValue ?? "")
  const currentDraft = draft ?? text
  const plainPreview = text.replace(/<[^>]*>/g, "").trim()

  React.useEffect(() => {
    if (isEditing) {
      const raf = requestAnimationFrame(() => {
        textareaRef.current?.focus()
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [isEditing])

  const commitValue = (next: string, move?: Parameters<CellEditorProps["onStopEditing"]>[0]) => {
    if (!readOnly && next !== text) {
      commit(tableMeta, { rowIndex, columnId, value: next, docId })
    }
    setDraft(null)
    onStopEditing(move)
  }

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      isDirty={isDirty}
      onSelect={onSelect}
      onEdit={onEdit}
      className="dy-items-center dy-py-1"
    >
      <Popover open={isEditing} onOpenChange={(open) => {
        if (!open) {
          commitValue(currentDraft)
        }
      }}>
        <PopoverAnchor asChild>
          <div className="dy-w-full dy-overflow-hidden dy-text-left">
            {plainPreview ? (
              <span className="dy-line-clamp-1 dy-truncate dy-text-xs dy-text-foreground">
                {plainPreview}
              </span>
            ) : (
              <span className="dy-text-muted-foreground/40">—</span>
            )}
          </div>
        </PopoverAnchor>
        {isEditing ? (
          <PopoverContent
            align="start"
            sideOffset={4}
            className="dy-w-80 sm:dy-w-96 dy-p-3 dy-shadow-xl"
            onInteractOutside={() => commitValue(currentDraft)}
          >
            <div className="dy-flex dy-flex-col dy-gap-2">
              <Textarea
                ref={textareaRef}
                readOnly={readOnly}
                value={currentDraft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation()
                  if (event.key === "Escape") {
                    event.preventDefault()
                    setDraft(null)
                    onStopEditing()
                  } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault()
                    commitValue(currentDraft, { moveToNextRow: true })
                  } else if (event.key === "Tab") {
                    event.preventDefault()
                    commitValue(currentDraft, {
                      direction: event.shiftKey ? "left" : "right",
                    })
                  }
                }}
                placeholder="Enter text..."
                className="dy-min-h-[120px] dy-resize-y dy-text-xs"
              />
              <div className="dy-flex dy-items-center dy-justify-between dy-pt-1">
                <span className="dy-text-[10px] dy-text-muted-foreground">
                  ⌘/Ctrl+Enter saves · Esc cancels
                </span>
                <Button
                  size="sm"
                  className="dy-h-7 dy-px-3 dy-text-xs"
                  onClick={() => commitValue(currentDraft)}
                >
                  Done
                </Button>
              </div>
            </div>
          </PopoverContent>
        ) : null}
      </Popover>
    </DataGridCellWrapper>
  )
}

/** Single image thumbnail with inline media library dialog picker */
export function ImageCell({
  value: initialValue,
  columnId,
  rowIndex,
  docId,
  isFocused,
  isEditing,
  isSelected,
  isDirty,
  readOnly,
  relationTo = "media",
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const { client, schemas } = useDyrected()
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const activeMediaCollection = React.useMemo(
    () => resolveActiveMediaCollection(schemas, relationTo),
    [schemas, relationTo],
  )

  const rawId = React.useMemo(() => {
    if (!initialValue) return ""
    if (typeof initialValue === "object" && initialValue !== null) {
      return (initialValue as any).id || (initialValue as any)._id || ""
    }
    return String(initialValue)
  }, [initialValue])

  const selectedValues = React.useMemo(() => (rawId ? [rawId] : []), [rawId])

  // Resolve media record if we only have an ID string
  const { data: mediaRecord } = useQuery({
    queryKey: ["media-item", activeMediaCollection, rawId],
    queryFn: async () => {
      if (!rawId || !client?.collection || !activeMediaCollection) return null
      try {
        return await client.collection(activeMediaCollection).findOne(rawId)
      } catch {
        return null
      }
    },
    enabled: Boolean(rawId && typeof initialValue !== "object" && activeMediaCollection),
    staleTime: 60_000,
  })

  const targetMedia = typeof initialValue === "object" && initialValue !== null ? initialValue : mediaRecord

  const imageUrl = React.useMemo(() => {
    if (!initialValue) return ""
    return getMediaUrl(targetMedia || initialValue, client?.getBaseUrl() || "")
  }, [initialValue, targetMedia, client])

  const filename = (targetMedia as any)?.filename || (typeof initialValue === "string" ? initialValue : "")

  const isDialogOpen = dialogOpen || isEditing

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      onStopEditing()
    }
  }

  const handleSelect = (selectedId: string) => {
    if (!readOnly) {
      commit(tableMeta, { rowIndex, columnId, value: selectedId, docId })
    }
    setDialogOpen(false)
    onStopEditing()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!readOnly) {
      commit(tableMeta, { rowIndex, columnId, value: null, docId })
    }
  }

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      isDirty={isDirty}
      onSelect={onSelect}
      onEdit={onEdit}
    >
      <div className="dy-flex dy-w-full dy-h-full dy-items-center dy-justify-between dy-gap-2 dy-overflow-hidden">
        {imageUrl ? (
          <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
            <div className="dy-relative dy-h-7 dy-w-7 dy-shrink-0 dy-overflow-hidden dy-rounded-md dy-border dy-border-border/60 dy-bg-muted/40">
              <img
                src={imageUrl}
                alt={filename}
                className="dy-h-full dy-w-full dy-object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none"
                }}
              />
            </div>
            <span className="dy-truncate dy-text-xs dy-text-foreground/80" title={filename}>
              {filename}
            </span>
          </div>
        ) : (
          <span className="dy-flex dy-items-center dy-gap-1.5 dy-text-xs dy-text-muted-foreground/40">
            <ImageIcon className="dy-h-3.5 dy-w-3.5" />
            <span>—</span>
          </span>
        )}

        {!readOnly && imageUrl && (
          <button
            type="button"
            title="Remove image"
            className="dy-rounded-sm dy-p-0.5 dy-text-muted-foreground/60 hover:dy-text-destructive"
            onClick={handleClear}
          >
            <X className="dy-h-3.5 dy-w-3.5" />
          </button>
        )}
      </div>

      <MediaLibraryDialog
        collection={activeMediaCollection}
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
        selectedValues={selectedValues}
        onSelect={handleSelect}
        multiple={false}
      />
    </DataGridCellWrapper>
  )
}

/** Multiple images/gallery with avatar stack preview and gallery popover */
export function ImagesCell({
  value: initialValue,
  columnId,
  rowIndex,
  docId,
  isFocused,
  isEditing,
  isSelected,
  isDirty,
  readOnly,
  relationTo = "media",
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const { client, schemas } = useDyrected()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const dialogOpenRef = React.useRef(false)
  // eslint-disable-next-line react-hooks/refs
  dialogOpenRef.current = dialogOpen

  const activeMediaCollection = React.useMemo(
    () => resolveActiveMediaCollection(schemas, relationTo),
    [schemas, relationTo],
  )

  const items: any[] = React.useMemo(() => {
    if (!initialValue) return []
    return Array.isArray(initialValue) ? initialValue : [initialValue]
  }, [initialValue])

  const idsKey = React.useMemo(() => {
    return items
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return item.id || item._id || item.filename || ""
        }
        return String(item)
      })
      .filter(Boolean)
      .join(",")
  }, [items])

  const ids = React.useMemo(() => (idsKey ? idsKey.split(",") : []), [idsKey])

  const handleConfirm = (selectedIds: string[]) => {
    if (!readOnly) {
      commit(tableMeta, { rowIndex, columnId, value: selectedIds, docId })
    }
    dialogOpenRef.current = false
    setDialogOpen(false)
    onStopEditing()
  }

  const handleRemove = (idToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!readOnly) {
      const next = ids.filter((id) => id !== idToRemove)
      commit(tableMeta, { rowIndex, columnId, value: next, docId })
    }
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!readOnly) {
      commit(tableMeta, { rowIndex, columnId, value: [], docId })
    }
    onStopEditing()
  }

  const handleToggle = (selectedId: string) => {
    if (!readOnly) {
      const next = ids.includes(selectedId)
        ? ids.filter((i) => i !== selectedId)
        : [...ids, selectedId]
      commit(tableMeta, { rowIndex, columnId, value: next, docId })
    }
  }

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.stopPropagation()
    dialogOpenRef.current = true
    setDialogOpen(true)
  }

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      isDirty={isDirty}
      onSelect={onSelect}
      onEdit={onEdit}
    >
      <Popover
        open={isEditing && !dialogOpen}
        onOpenChange={(open) => {
          if (!open && !dialogOpenRef.current) {
            onStopEditing()
          }
        }}
      >
        <PopoverAnchor asChild>
          <div className="dy-flex dy-w-full dy-h-full dy-items-center dy-gap-1.5 dy-overflow-hidden">
            {items.length > 0 ? (
              <div className="dy-flex dy-items-center dy-gap-1">
                <div className="dy-flex dy--space-x-2">
                  {items.slice(0, 3).map((item, index) => {
                    const url = getMediaUrl(item, client?.getBaseUrl() || "")
                    return (
                      <div
                        key={index}
                        className="dy-relative dy-h-6 dy-w-6 dy-rounded-full dy-border-2 dy-border-card dy-bg-muted/80 dy-overflow-hidden dy-shadow-xs"
                      >
                        {url ? (
                          <img src={url} alt="" className="dy-h-full dy-w-full dy-object-cover" />
                        ) : (
                          <div className="dy-flex dy-h-full dy-w-full dy-items-center dy-justify-center">
                            <ImageIcon className="dy-h-3 dy-w-3 dy-text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <Badge variant="secondary" className="dy-h-5 dy-px-1.5 dy-text-[10px] dy-font-semibold">
                  {items.length}
                </Badge>
              </div>
            ) : (
              <span className="dy-flex dy-items-center dy-gap-1.5 dy-text-xs dy-text-muted-foreground/40">
                <ImageIcon className="dy-h-3.5 dy-w-3.5" />
                <span>—</span>
              </span>
            )}
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="dy-w-72 dy-p-3 dy-shadow-xl dy-z-50"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={() => {
            if (!dialogOpenRef.current) {
              onStopEditing()
            }
          }}
        >
          <div className="dy-flex dy-flex-col dy-gap-3">
            <div className="dy-flex dy-items-center dy-justify-between dy-border-b dy-border-border/40 dy-pb-2">
              <span className="dy-text-xs dy-font-semibold dy-text-foreground">
                Gallery ({items.length})
              </span>
              {items.length > 0 && !readOnly && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="dy-text-[11px] dy-text-muted-foreground hover:dy-text-destructive"
                >
                  Clear all
                </button>
              )}
            </div>

            {items.length > 0 ? (
              <div className="dy-grid dy-grid-cols-4 dy-gap-2 dy-max-h-48 dy-overflow-y-auto dy-p-0.5">
                {items.map((item, index) => {
                  const url = getMediaUrl(item, client?.getBaseUrl() || "")
                  const id = typeof item === "object" && item !== null ? item.id || item._id : String(item)
                  return (
                    <div
                      key={index}
                      className="dy-group/gitem dy-relative dy-aspect-square dy-rounded-md dy-border dy-border-border/60 dy-bg-muted/30 dy-overflow-hidden"
                    >
                      {url ? (
                        <img src={url} alt="" className="dy-h-full dy-w-full dy-object-cover" />
                      ) : (
                        <div className="dy-flex dy-h-full dy-w-full dy-items-center dy-justify-center">
                          <ImageIcon className="dy-h-4 dy-w-4 dy-text-muted-foreground" />
                        </div>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          title="Remove image"
                          onClick={(e) => handleRemove(id, e)}
                          className="dy-absolute dy-top-1 dy-right-1 dy-flex dy-h-4 dy-w-4 dy-items-center dy-justify-center dy-rounded-full dy-bg-background/90 dy-text-destructive dy-opacity-0 group-hover/gitem:dy-opacity-100 dy-shadow-xs dy-transition-opacity"
                        >
                          <X className="dy-h-3 dy-w-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="dy-py-2 dy-text-center dy-text-xs dy-text-muted-foreground">
                No images attached
              </p>
            )}

            {!readOnly && (
              <Button
                size="sm"
                variant="outline"
                className="dy-h-8 dy-w-full dy-text-xs"
                onClick={handleOpenDialog}
              >
                <Plus className="dy-mr-1.5 dy-h-3.5 dy-w-3.5" />
                Manage Media
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <MediaLibraryDialog
        collection={activeMediaCollection}
        isOpen={dialogOpen}
        onOpenChange={(open) => {
          dialogOpenRef.current = open
          setDialogOpen(open)
          if (!open) {
            onStopEditing()
          }
        }}
        selectedValues={ids}
        onConfirm={handleConfirm}
        onSelect={handleToggle}
        multiple={true}
      />
    </DataGridCellWrapper>
  )
}

/** Single relationship picker with async search, document title resolution, and instant commit */
export function RelationshipCell({
  value: initialValue,
  columnId,
  rowIndex,
  docId,
  isFocused,
  isEditing,
  isSelected,
  isDirty,
  readOnly,
  relationTo,
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const { client, schemas } = useDyrected()
  const [search, setSearch] = React.useState("")
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const collections = (schemas as any)?.collections as any[] | undefined
  const relatedCollection = React.useMemo(
    () => collections?.find((c) => c.slug === relationTo),
    [collections, relationTo],
  )
  const isUpload = !!relatedCollection?.upload
  const displayField = relatedCollection?.admin?.useAsTitle || "title"

  const rawId = React.useMemo(() => {
    if (!initialValue) return ""
    if (typeof initialValue === "object" && initialValue !== null) {
      return String((initialValue as any).id || (initialValue as any)._id || "")
    }
    return String(initialValue)
  }, [initialValue])

  // If initial value is an ID string, fetch the single doc to resolve its title
  const { data: fetchedDoc } = useQuery({
    queryKey: ["grid-relation-doc", relationTo, rawId],
    queryFn: async () => {
      if (!rawId || !client?.collection || !relationTo) return null
      try {
        return await client.collection(relationTo).findOne(rawId)
      } catch {
        return null
      }
    },
    enabled: Boolean(rawId && typeof initialValue !== "object" && relationTo),
    staleTime: 60_000,
  })

  const targetDoc = typeof initialValue === "object" && initialValue !== null ? initialValue : fetchedDoc

  const displayTitle = React.useMemo(() => {
    if (!initialValue) return ""
    if (targetDoc) {
      return (
        resolveDocumentTitle({
          entry: targetDoc as any,
          collection: relatedCollection,
          collections,
        }) || rawId
      )
    }
    return rawId
  }, [initialValue, targetDoc, relatedCollection, collections, rawId])

  React.useEffect(() => {
    if (isEditing) {
      const raf = requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [isEditing])

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["grid-relation-search", relationTo, search],
    queryFn: async ({ pageParam = 1 }) => {
      if (!client?.collection || !relationTo) return { docs: [] }
      let qb = client.collection(relationTo).find({ limit: 30, page: pageParam })
      if (search.trim()) {
        qb = qb.where({ [displayField]: { like: `%${search.trim()}%` } })
      }
      return qb.exec()
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      if (lastPage?.hasNextPage) return (lastPage?.page ?? 1) + 1
      if (lastPage?.docs?.length === 30) return (lastPage?.page ?? 1) + 1
      return undefined
    },
    enabled: Boolean(isEditing && client && relationTo),
    staleTime: 30_000,
  })

  const docs = React.useMemo(() => {
    return (data?.pages.flatMap((page: any) => page?.docs || []) ?? []) as Array<Record<string, unknown>>
  }, [data])

  const handleSelect = (doc: Record<string, unknown>) => {
    if (!readOnly) {
      commit(tableMeta, { rowIndex, columnId, value: doc.id, docId })
    }
    onStopEditing()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!readOnly) {
      commit(tableMeta, { rowIndex, columnId, value: null, docId })
    }
    onStopEditing()
  }

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      isDirty={isDirty}
      onSelect={onSelect}
      onEdit={onEdit}
    >
      <Popover open={isEditing} onOpenChange={(open) => { if (!open) onStopEditing() }}>
        <PopoverAnchor asChild>
          <div className="dy-flex dy-w-full dy-h-full dy-items-center dy-min-w-0">
            {displayTitle ? (
              <Badge
                variant="outline"
                className="dy-max-w-full dy-truncate dy-font-normal dy-border-primary/20 dy-bg-primary/5 dy-text-primary dy-px-1.5 dy-py-px"
                title={displayTitle}
              >
                {displayTitle}
              </Badge>
            ) : (
              <span className="dy-text-muted-foreground/50">—</span>
            )}
          </div>
        </PopoverAnchor>

        {isEditing ? (
          <PopoverContent
            align="start"
            sideOffset={4}
            className="dy-w-72 dy-p-0 dy-shadow-xl dy-z-50"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={() => onStopEditing()}
          >
            <div className="dy-flex dy-flex-col">
              <div className="dy-flex dy-items-center dy-gap-2 dy-border-b dy-border-border/50 dy-px-2.5 dy-py-2">
                <Search className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground dy-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${relatedCollection?.labels?.plural || relatedCollection?.label || relationTo || "items"}...`}
                  className="dy-w-full dy-bg-transparent dy-text-xs dy-outline-none dy-placeholder:text-muted-foreground/60"
                  onKeyDown={(event) => {
                    event.stopPropagation()
                    if (event.key === "Escape") {
                      event.preventDefault()
                      onStopEditing()
                    }
                  }}
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="dy-text-muted-foreground hover:dy-text-foreground"
                  >
                    <X className="dy-h-3 dy-w-3" />
                  </button>
                ) : null}
              </div>

              <div className="dy-flex dy-max-h-60 dy-flex-col dy-overflow-y-auto dy-p-1">
                {isLoading ? (
                  <div className="dy-flex dy-items-center dy-justify-center dy-gap-2 dy-py-4 dy-text-xs dy-text-muted-foreground">
                    <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" />
                    <span>Searching...</span>
                  </div>
                ) : docs.length > 0 ? (
                  docs.map((item) => {
                    const itemTitle = resolveDocumentTitle({
                      entry: item,
                      collection: relatedCollection,
                      collections,
                    }) || String(item.id)
                    const isSelectedDoc = String(item.id) === rawId
                    const mediaUrl = isUpload ? getMediaUrl(item, client?.getBaseUrl() || "") : null

                    return (
                      <button
                        key={String(item.id)}
                        type="button"
                        className={cn(
                          "dy-flex dy-items-center dy-gap-2 dy-rounded-sm dy-px-2 dy-py-1.5 dy-text-left dy-text-xs hover:dy-bg-accent hover:dy-text-accent-foreground dy-transition-colors",
                          isSelectedDoc && "dy-bg-accent/50 dy-font-medium dy-text-primary",
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelect(item)
                        }}
                      >
                        {mediaUrl ? (
                          <div className="dy-h-5 dy-w-5 dy-shrink-0 dy-overflow-hidden dy-rounded dy-border dy-border-border/50">
                            <img src={mediaUrl} alt="" className="dy-h-full dy-w-full dy-object-cover" />
                          </div>
                        ) : null}
                        <span className="dy-flex-1 dy-truncate">{itemTitle}</span>
                        {isSelectedDoc ? (
                          <Check className="dy-h-3.5 dy-w-3.5 dy-shrink-0 dy-text-primary" />
                        ) : null}
                      </button>
                    )
                  })
                ) : (
                  <p className="dy-py-3 dy-text-center dy-text-xs dy-text-muted-foreground">
                    {relationTo ? "No items found." : "No relation configured."}
                  </p>
                )}
              </div>

              {hasNextPage ? (
                <div className="dy-border-t dy-border-border/40 dy-p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="dy-h-7 dy-w-full dy-text-xs dy-text-muted-foreground"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="dy-mr-1 dy-h-3 dy-w-3 dy-animate-spin" /> Loading...
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              ) : null}

              {rawId && !readOnly ? (
                <div className="dy-border-t dy-border-border/40 dy-p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="dy-h-7 dy-w-full dy-text-xs dy-text-muted-foreground hover:dy-text-destructive"
                    onClick={handleClear}
                  >
                    Clear selection
                  </Button>
                </div>
              ) : null}
            </div>
          </PopoverContent>
        ) : null}
      </Popover>
    </DataGridCellWrapper>
  )
}

/** Multi-relationship picker with async search, multi-selection, and document title badges */
export function RelationshipsCell({
  value: initialValue,
  columnId,
  rowIndex,
  docId,
  isFocused,
  isEditing,
  isSelected,
  isDirty,
  readOnly,
  relationTo,
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const { client, schemas } = useDyrected()
  const [search, setSearch] = React.useState("")
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const collections = (schemas as any)?.collections as any[] | undefined
  const relatedCollection = React.useMemo(
    () => collections?.find((c) => c.slug === relationTo),
    [collections, relationTo],
  )
  const isUpload = !!relatedCollection?.upload
  const displayField = relatedCollection?.admin?.useAsTitle || "title"

  const items: any[] = React.useMemo(() => {
    if (!initialValue) return []
    return Array.isArray(initialValue) ? initialValue : [initialValue]
  }, [initialValue])

  const selectedIds: string[] = React.useMemo(() => {
    return items
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return String(item.id || item._id || "")
        }
        return String(item)
      })
      .filter(Boolean)
  }, [items])

  const summarizedTitle = React.useMemo(() => {
    if (!items.length) return null
    return resolveValueTitle(
      initialValue,
      { type: "relationship", relationTo, hasMany: true } as any,
      collections,
    )
  }, [initialValue, items.length, relationTo, collections])

  React.useEffect(() => {
    if (isEditing) {
      const raf = requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [isEditing])

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["grid-relations-search", relationTo, search],
    queryFn: async ({ pageParam = 1 }) => {
      if (!client?.collection || !relationTo) return { docs: [] }
      let qb = client.collection(relationTo).find({ limit: 30, page: pageParam })
      if (search.trim()) {
        qb = qb.where({ [displayField]: { like: `%${search.trim()}%` } })
      }
      return qb.exec()
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      if (lastPage?.hasNextPage) return (lastPage?.page ?? 1) + 1
      if (lastPage?.docs?.length === 30) return (lastPage?.page ?? 1) + 1
      return undefined
    },
    enabled: Boolean(isEditing && client && relationTo),
    staleTime: 30_000,
  })

  const docs = React.useMemo(() => {
    return (data?.pages.flatMap((page: any) => page?.docs || []) ?? []) as Array<Record<string, unknown>>
  }, [data])

  const toggleSelect = (docIdToToggle: string) => {
    if (readOnly) return
    const next = selectedIds.includes(docIdToToggle)
      ? selectedIds.filter((id) => id !== docIdToToggle)
      : [...selectedIds, docIdToToggle]
    commit(tableMeta, { rowIndex, columnId, value: next, docId })
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!readOnly) {
      commit(tableMeta, { rowIndex, columnId, value: [], docId })
    }
  }

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      isDirty={isDirty}
      onSelect={onSelect}
      onEdit={onEdit}
    >
      <Popover open={isEditing} onOpenChange={(open) => { if (!open) onStopEditing() }}>
        <PopoverAnchor asChild>
          <div className="dy-flex dy-w-full dy-h-full dy-min-w-0 dy-flex-1 dy-items-center dy-gap-1 dy-overflow-hidden">
            {summarizedTitle ? (
              <Badge
                variant="outline"
                className="dy-max-w-full dy-truncate dy-font-normal dy-border-primary/20 dy-bg-primary/5 dy-text-primary dy-px-1.5 dy-py-px"
                title={summarizedTitle}
              >
                {summarizedTitle}
              </Badge>
            ) : selectedIds.length ? (
              <Badge variant="secondary" className="dy-h-5 dy-px-1.5 dy-text-[10px] dy-font-semibold">
                {selectedIds.length} selected
              </Badge>
            ) : (
              <span className="dy-text-muted-foreground/50">—</span>
            )}
          </div>
        </PopoverAnchor>

        {isEditing ? (
          <PopoverContent
            align="start"
            sideOffset={4}
            className="dy-w-72 dy-p-0 dy-shadow-xl dy-z-50"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={() => onStopEditing()}
          >
            <div className="dy-flex dy-flex-col">
              <div className="dy-flex dy-items-center dy-gap-2 dy-border-b dy-border-border/50 dy-px-2.5 dy-py-2">
                <Search className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground dy-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${relatedCollection?.labels?.plural || relatedCollection?.label || relationTo || "items"}...`}
                  className="dy-w-full dy-bg-transparent dy-text-xs dy-outline-none dy-placeholder:text-muted-foreground/60"
                  onKeyDown={(event) => {
                    event.stopPropagation()
                    if (event.key === "Escape") {
                      event.preventDefault()
                      onStopEditing()
                    }
                  }}
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="dy-text-muted-foreground hover:dy-text-foreground"
                  >
                    <X className="dy-h-3 dy-w-3" />
                  </button>
                ) : null}
              </div>

              <div className="dy-flex dy-max-h-60 dy-flex-col dy-overflow-y-auto dy-p-1">
                {isLoading ? (
                  <div className="dy-flex dy-items-center dy-justify-center dy-gap-2 dy-py-4 dy-text-xs dy-text-muted-foreground">
                    <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" />
                    <span>Searching...</span>
                  </div>
                ) : docs.length > 0 ? (
                  docs.map((item) => {
                    const itemTitle = resolveDocumentTitle({
                      entry: item,
                      collection: relatedCollection,
                      collections,
                    }) || String(item.id)
                    const isChecked = selectedIds.includes(String(item.id))
                    const mediaUrl = isUpload ? getMediaUrl(item, client?.getBaseUrl() || "") : null

                    return (
                      <button
                        key={String(item.id)}
                        type="button"
                        className="dy-flex dy-items-center dy-gap-2 dy-rounded-sm dy-px-2 dy-py-1.5 dy-text-left dy-text-xs hover:dy-bg-accent hover:dy-text-accent-foreground dy-transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelect(String(item.id))
                        }}
                      >
                        <span
                          className={cn(
                            "dy-flex dy-h-4 dy-w-4 dy-shrink-0 dy-items-center dy-justify-center dy-rounded-sm dy-border dy-border-border",
                            isChecked && "dy-bg-primary dy-border-primary dy-text-primary-foreground",
                          )}
                        >
                          {isChecked ? "✓" : ""}
                        </span>
                        {mediaUrl ? (
                          <div className="dy-h-5 dy-w-5 dy-shrink-0 dy-overflow-hidden dy-rounded dy-border dy-border-border/50">
                            <img src={mediaUrl} alt="" className="dy-h-full dy-w-full dy-object-cover" />
                          </div>
                        ) : null}
                        <span className="dy-flex-1 dy-truncate">{itemTitle}</span>
                      </button>
                    )
                  })
                ) : (
                  <p className="dy-py-3 dy-text-center dy-text-xs dy-text-muted-foreground">
                    {relationTo ? "No items found." : "No relation configured."}
                  </p>
                )}
              </div>

              {hasNextPage ? (
                <div className="dy-border-t dy-border-border/40 dy-p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="dy-h-7 dy-w-full dy-text-xs dy-text-muted-foreground"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="dy-mr-1 dy-h-3 dy-w-3 dy-animate-spin" /> Loading...
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              ) : null}

              <div className="dy-flex dy-items-center dy-justify-between dy-border-t dy-border-border/40 dy-p-1.5">
                {selectedIds.length > 0 && !readOnly ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="dy-h-7 dy-px-2 dy-text-xs dy-text-muted-foreground hover:dy-text-destructive"
                    onClick={handleClearAll}
                  >
                    Clear all
                  </Button>
                ) : <span />}
                <Button
                  size="sm"
                  className="dy-h-7 dy-px-3 dy-text-xs"
                  onClick={() => onStopEditing()}
                >
                  Done
                </Button>
              </div>
            </div>
          </PopoverContent>
        ) : null}
      </Popover>
    </DataGridCellWrapper>
  )
}

/** Relationship/image/object cells render a summary and deep-link to the editor. */
export function ReadonlyLinkCell({
  docId,
  display,
  isFocused,
  isSelected,
  isDirty,
  onSelect,
  tableMeta,
}: {
  docId?: string
  display: string
  isFocused: boolean
  isSelected: boolean
  isDirty?: boolean
  onSelect: () => void
  tableMeta: AnyTableMeta
}) {
  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isDirty={isDirty}
      onSelect={onSelect}
      onEdit={() => undefined}
    >
      <span className="dy-min-w-0 dy-flex-1 dy-truncate dy-text-muted-foreground">{display}</span>
      {docId && tableMeta.onOpenDoc ? (
        <button
          type="button"
          title="Open document"
          aria-label="Open document"
          className="dy-shrink-0 dy-text-muted-foreground/60 hover:dy-text-primary"
          onClick={(event) => {
            event.stopPropagation()
            tableMeta.onOpenDoc?.(docId)
          }}
        >
          <ExternalLink className="dy-h-3.5 dy-w-3.5" />
        </button>
      ) : null}
    </DataGridCellWrapper>
  )
}

