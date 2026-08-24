import * as React from "react"
import { format, parseISO } from "date-fns"

import { Badge } from "../../../../components/ui/badge"
import { Button } from "../../../../components/ui/button"
import { Calendar } from "../../../../components/ui/calendar"
import { Checkbox } from "../../../../components/ui/checkbox"
import { ExternalLink } from "lucide-react"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "../../../../components/ui/popover"
import { Textarea } from "../../../../components/ui/textarea"
import { cn } from "../../../../lib/utils"
import type { CellVariantMeta, DataGridTableMeta } from "./data-grid-types"

type AnyTableMeta = DataGridTableMeta<any>
import { DataGridCellWrapper } from "./data-grid-cell-wrapper"

export interface CellEditorProps {
  value: unknown
  columnId: string
  rowIndex: number
  rowHeight: number
  isFocused: boolean
  isEditing: boolean
  isSelected: boolean
  readOnly: boolean
  /** Editor variant resolved from the column meta. */
  variant: CellVariantMeta["variant"]
  options?: { label: string; value: string }[]
  tableMeta: AnyTableMeta
  onSelect: () => void
  onEdit: () => void
  /** Commit + move (Tab/Enter semantics handled by the grid). */
  onStopEditing: (move?: { direction?: "up" | "down" | "left" | "right"; moveToNextRow?: boolean }) => void
}

function commit(
  tableMeta: DataGridTableMeta<unknown>,
  payload: { rowIndex: number; columnId: string; value: unknown },
) {
  tableMeta.onDataUpdate?.(payload)
}

/** Inline single-line text editing for text/email/url/icon fields. */
export function ShortTextCell({
  value: initialValue,
  columnId,
  rowIndex,
  isFocused,
  isEditing,
  isSelected,
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
      commit(tableMeta, { rowIndex, columnId, value: normalized })
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
  isFocused,
  isEditing,
  isSelected,
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
      commit(tableMeta, { rowIndex, columnId, value: next })
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
      onSelect={onSelect}
      onEdit={onEdit}
      className="dy-justify-end dy-tabular-nums"
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
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
  isFocused,
  isSelected,
  readOnly,
  tableMeta,
  onSelect,
}: CellEditorProps) {
  const checked = Boolean(initialValue)

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      onSelect={onSelect}
      onEdit={() => undefined}
      className="dy-justify-center"
      onKeyDownCapture={(event) => {
        if (!isFocused || readOnly) return
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault()
          event.stopPropagation()
          commit(tableMeta, { rowIndex, columnId, value: !checked })
        }
      }}
    >
      <Checkbox
        checked={checked}
        disabled={readOnly}
        onCheckedChange={(next) => commit(tableMeta, { rowIndex, columnId, value: !!next })}
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
  isFocused,
  isEditing,
  isSelected,
  readOnly,
  options = [],
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const labelByValue = React.useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  )
  const displayLabel = initialValue !== null && initialValue !== undefined
    ? labelByValue.get(String(initialValue)) ?? String(initialValue)
    : null

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      onSelect={onSelect}
      onEdit={onEdit}
    >
      <Popover open={isEditing}>
        <PopoverAnchor asChild>
          {displayLabel ? (
            <Badge variant="secondary" className="dy-max-w-full dy-truncate dy-px-1.5 dy-py-px">
              {displayLabel}
            </Badge>
          ) : (
            <span className="dy-text-muted-foreground/50">—</span>
          )}
        </PopoverAnchor>
        {isEditing ? (
          <PopoverContent
            align="start"
            sideOffset={-28}
            className="dy-w-52 dy-p-1"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={() => onStopEditing()}
          >
            <div className="dy-flex dy-flex-col">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "dy-rounded-sm dy-px-2 dy-py-1.5 dy-text-left dy-text-xs hover:dy-bg-accent hover:dy-text-accent-foreground",
                    String(initialValue ?? "") === option.value && "dy-font-semibold dy-text-primary",
                  )}
                  onClick={() => {
                    if (!readOnly) {
                      commit(tableMeta, { rowIndex, columnId, value: option.value })
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
  isFocused,
  isEditing,
  isSelected,
  readOnly,
  options = [],
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const selected: string[] = Array.isArray(initialValue) ? initialValue.map(String) : []
  const labelByValue = React.useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  )

  const toggle = (optionValue: string) => {
    if (readOnly) return
    const next = selected.includes(optionValue)
      ? selected.filter((value) => value !== optionValue)
      : [...selected, optionValue]
    commit(tableMeta, { rowIndex, columnId, value: next })
  }

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      onSelect={onSelect}
      onEdit={onEdit}
    >
      <Popover open={isEditing}>
        <PopoverAnchor asChild>
          <div className="dy-flex dy-min-w-0 dy-flex-1 dy-items-center dy-gap-1 dy-overflow-hidden">
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
            sideOffset={-28}
            className="dy-w-56 dy-p-1"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={() => onStopEditing()}
          >
            <div className="dy-flex dy-max-h-64 dy-flex-col dy-overflow-y-auto">
              {options.map((option) => {
                const isChecked = selected.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    className="dy-flex dy-items-center dy-gap-2 dy-rounded-sm dy-px-2 dy-py-1.5 dy-text-left dy-text-xs hover:dy-bg-accent hover:dy-text-accent-foreground"
                    onClick={() => toggle(option.value)}
                  >
                    <span
                      className={cn(
                        "dy-flex dy-h-3.5 dy-w-3.5 dy-shrink-0 dy-items-center dy-justify-center dy-rounded-sm dy-border dy-border-border",
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
                onClick={() => {
                  commit(tableMeta, { rowIndex, columnId, value: [] })
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
  isFocused,
  isEditing,
  isSelected,
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
      onSelect={onSelect}
      onEdit={onEdit}
    >
      <Popover open={isEditing}>
        <PopoverAnchor asChild>
          <span>{display}</span>
        </PopoverAnchor>
        {isEditing ? (
          <PopoverContent
            align="start"
            className="dy-w-auto dy-p-0"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={() => onStopEditing()}
          >
            <Calendar
              mode="single"
              defaultMonth={parsedDate ?? new Date()}
              selected={parsedDate}
              onSelect={(date) => {
                if (date && !readOnly) {
                  commit(tableMeta, { rowIndex, columnId, value: date.toISOString() })
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
 * Long-form values (textarea/richText/json/…) get a popover textarea when the
 * underlying value is textual, so quick edits stay in the grid.
 */
export function LongTextCell({
  value: initialValue,
  columnId,
  rowIndex,
  isFocused,
  isEditing,
  isSelected,
  readOnly,
  tableMeta,
  onSelect,
  onEdit,
  onStopEditing,
}: CellEditorProps) {
  const cancelledRef = React.useRef(false)
  const text = String(initialValue ?? "")
  const plainPreview = text.replace(/<[^>]*>/g, "")

  const commitValue = (next: string, move?: Parameters<CellEditorProps["onStopEditing"]>[0]) => {
    if (!readOnly && next !== text) {
      commit(tableMeta, { rowIndex, columnId, value: next })
    }
    onStopEditing(move)
  }

  return (
    <DataGridCellWrapper
      isFocused={isFocused}
      isSelected={isSelected}
      isEditing={isEditing}
      onSelect={onSelect}
      onEdit={onEdit}
      className="dy-items-start dy-py-1.5"
    >
      <Popover open={isEditing}>
        <PopoverAnchor asChild>
          <span className="dy-line-clamp-2 dy-whitespace-pre-wrap">{plainPreview}</span>
        </PopoverAnchor>
        {isEditing ? (
          <PopoverContent
            align="start"
            sideOffset={-28}
            className="dy-w-96 dy-p-2"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={() => onStopEditing()}
          >
            {/* Uncontrolled: the key remounts the editor per open so the
                draft always starts from the committed value. */}
            <Textarea
              key={`${rowIndex}:${columnId}:${text}`}
              autoFocus
              readOnly={readOnly}
              defaultValue={text}
              onBlur={(event) => {
                if (cancelledRef.current) {
                  cancelledRef.current = false
                  return
                }
                commitValue(event.target.value)
              }}
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.key === "Escape") {
                  event.preventDefault()
                  cancelledRef.current = true
                  onStopEditing()
                } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault()
                  commitValue(event.currentTarget.value, { moveToNextRow: true })
                } else if (event.key === "Tab") {
                  event.preventDefault()
                  cancelledRef.current = true
                  commitValue(event.currentTarget.value, {
                    direction: event.shiftKey ? "left" : "right",
                  })
                }
              }}
              className="dy-min-h-[160px] dy-resize-none dy-text-xs"
            />
            <p className="dy-pt-1 dy-text-[10px] dy-text-muted-foreground">
              ⌘/Ctrl+Enter saves and moves down · Esc cancels
            </p>
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
  onSelect,
  tableMeta,
}: {
  docId?: string
  display: string
  isFocused: boolean
  isSelected: boolean
  onSelect: () => void
  tableMeta: AnyTableMeta
}) {
  return (
    <DataGridCellWrapper isFocused={isFocused} isSelected={isSelected} onSelect={onSelect} onEdit={() => undefined}>
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
