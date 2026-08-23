import * as React from "react"
import type { Table } from "@tanstack/react-table"

import type { CellPosition } from "./data-grid-types"
import { isInRect, parseClipboardTSV, selectionRect, serializeToTSV } from "./data-grid-utils"

interface UseDataGridOptions<TData> {
  table: Table<TData>
  readOnly?: boolean
  /** Column ids eligible for navigation (excludes pinned utility columns). */
  columnIds: string[]
  rowCount: number
  /** Ref to the focusable grid container, owned by the rendering component. */
  containerRef: React.RefObject<HTMLDivElement | null>
  onDataUpdate?: (event: { rowIndex: number; columnId: string; value: unknown }) => void
}

const isEditableKey = (event: React.KeyboardEvent) =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

/**
 * The data-grid state machine (adapted from the tablecn data-grid):
 *
 * - one focused cell, optionally extended into a rectangular selection
 *   with Shift+Arrow / Shift+Click,
 * - Enter/F2/double-click/type-to-edit starts cell editing; Escape cancels;
 *   Tab/Enter commit and move,
 * - Ctrl/Cmd+C copies the selection as TSV; Ctrl/Cmd+V pastes TSV starting
 *   at the focused cell.
 */
export function useDataGrid<TData>({
  table,
  readOnly = false,
  columnIds,
  rowCount,
  containerRef,
  onDataUpdate,
}: UseDataGridOptions<TData>) {
  const [focus, setFocus] = React.useState<CellPosition | null>(null)
  const [anchor, setAnchor] = React.useState<CellPosition | null>(null)
  const [editingCell, setEditingCell] = React.useState<CellPosition | null>(null)

  const clampColumn = React.useCallback(
    (col: number): number => Math.max(0, Math.min(col, Math.max(columnIds.length - 1, 0))),
    [columnIds.length],
  )

  const clampRow = React.useCallback(
    (row: number): number => Math.max(0, Math.min(row, Math.max(rowCount - 1, 0))),
    [rowCount],
  )

  const moveFocus = React.useCallback(
    (deltaRow: number, deltaCol: number, extend = false) => {
      const base = focus ?? { row: 0, col: 0 }
      const next = { row: clampRow(base.row + deltaRow), col: clampColumn(base.col + deltaCol) }
      if (extend) {
        setAnchor((prevAnchor) => prevAnchor ?? base)
      } else {
        setAnchor((prevAnchor) =>
          prevAnchor && prevAnchor.row === next.row && prevAnchor.col === next.col ? prevAnchor : next,
        )
        setEditingCell((prevEditing) => (prevEditing ? null : prevEditing))
      }
      setFocus((prevFocus) =>
        prevFocus && prevFocus.row === next.row && prevFocus.col === next.col ? prevFocus : next,
      )
    },
    [focus, clampRow, clampColumn],
  )

  const setFocusedCell = React.useCallback(
    (cell: CellPosition | null) => {
      if (!cell) {
        setFocus(null)
        setAnchor(null)
        return
      }
      const next = { row: clampRow(cell.row), col: clampColumn(cell.col) }
      setEditingCell(null)
      setAnchor(next)
      setFocus(next)
      // Keep the grid container focused so keyboard events keep flowing.
      queueMicrotask(() => containerRef.current?.focus({ preventScroll: true }))
    },
    [clampRow, clampColumn, containerRef],
  )

  const startEditing = React.useCallback(() => {
    if (readOnly || !focus) return
    setEditingCell(focus)
  }, [readOnly, focus])

  /** Focuses and immediately edits the given cell (double-click flow). */
  const startEditingAt = React.useCallback(
    (cell: CellPosition) => {
      if (readOnly) return
      const next = { row: clampRow(cell.row), col: clampColumn(cell.col) }
      setAnchor(next)
      setFocus(next)
      setEditingCell(next)
    },
    [readOnly, clampRow, clampColumn],
  )

  const stopEditing = React.useCallback(
    (move?: { direction?: "up" | "down" | "left" | "right"; moveToNextRow?: boolean }) => {
      setEditingCell(null)
      queueMicrotask(() => containerRef.current?.focus({ preventScroll: true }))
      if (move?.direction) {
        const deltas = {
          up: [-1, 0],
          down: [1, 0],
          left: [0, -1],
          right: [0, 1],
        } as const
        const [dRow, dCol] = deltas[move.direction]
        moveFocus(dRow, dCol)
      } else if (move?.moveToNextRow) {
        moveFocus(1, 0)
      }
    },
    [moveFocus, containerRef],
  )

  const selection = React.useMemo(
    () => (anchor && focus ? selectionRect(anchor, focus) : null),
    [anchor, focus],
  )

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (editingCell) return

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        if (!selection || !onDataUpdate) return
        const rows = table.getRowModel().rows
        const matrix: unknown[][] = []
        for (let rowIndex = selection.top; rowIndex <= selection.bottom; rowIndex += 1) {
          const row = rows[rowIndex]
          if (!row) continue
          const values: unknown[] = []
          for (let colIndex = selection.left; colIndex <= selection.right; colIndex += 1) {
            const columnId = columnIds[colIndex]
            if (!columnId) continue
            values.push(row.getValue(columnId))
          }
          matrix.push(values)
        }
        void navigator.clipboard.writeText(serializeToTSV(matrix)).catch(() => {
          /* Clipboard permission denied — nothing sensible to recover with. */
        })
        event.preventDefault()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        if (readOnly || !focus) return
        event.preventDefault()
        void navigator.clipboard
          .readText()
          .then((text) => {
            if (!text) return
            const matrix = parseClipboardTSV(text)
            matrix.forEach((rowValues, rowOffset) => {
              rowValues.forEach((rawValue, colOffset) => {
                const colIndex = clampColumn(focus.col + colOffset)
                const rowIndex = clampRow(focus.row + rowOffset)
                const columnId = columnIds[colIndex]
                if (!columnId) return
                for (const update of applyParsedValue(rawValue, columnId, table)) {
                  onDataUpdate?.({ rowIndex, columnId: update.columnId, value: update.value })
                }
              })
            })
          })
          .catch(() => {
            /* Clipboard read unavailable (permissions/insecure context). */
          })
        return
      }

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault()
          moveFocus(-1, 0, event.shiftKey)
          break
        case "ArrowDown":
          event.preventDefault()
          moveFocus(1, 0, event.shiftKey)
          break
        case "ArrowLeft":
          event.preventDefault()
          moveFocus(0, -1, event.shiftKey)
          break
        case "ArrowRight":
          event.preventDefault()
          moveFocus(0, 1, event.shiftKey)
          break
        case "Tab":
          event.preventDefault()
          moveFocus(0, event.shiftKey ? -1 : 1)
          break
        case "Enter":
        case "F2":
          event.preventDefault()
          startEditing()
          break
        case "Escape":
          event.preventDefault()
          setAnchor(focus)
          break
        default:
          if (isEditableKey(event)) {
            startEditing()
          }
      }
    },
    [editingCell, selection, onDataUpdate, table, columnIds, focus, readOnly, moveFocus, startEditing, clampColumn, clampRow],
  )

  const isFocused = React.useCallback(
    (row: number, col: number) => focus?.row === row && focus.col === col,
    [focus],
  )

  const isSelected = React.useCallback(
    (row: number, col: number) => (selection ? isInRect(row, col, selection) : false),
    [selection],
  )

  return {
    focus,
    editingCell,
    selection,
    handleKeyDown,
    setFocusedCell,
    startEditingAt,
    stopEditing,
    isFocused,
    isSelected,
  }
}

/**
 * Coerces a pasted string to the column's expected shape. Returns updates for
 * the target column only; select columns validate against declared options.
 */
function applyParsedValue<TData>(
  rawValue: string,
  columnId: string,
  table: Table<TData>,
): Array<{ columnId: string; value: unknown }> {
  const column = table.getColumn(columnId)
  const variant = (column?.columnDef.meta as any)?.cell?.variant as string | undefined

  switch (variant) {
    case "number": {
      const parsed = Number(rawValue.replace(/[^0-9.eE+-]/g, ""))
      return [{ columnId, value: rawValue.trim() === "" || Number.isNaN(parsed) ? null : parsed }]
    }
    case "checkbox":
      return [
        {
          columnId,
          value: ["true", "yes", "1"].includes(rawValue.trim().toLowerCase()),
        },
      ]
    case "select": {
      const options = (((column?.columnDef.meta as any)?.cell?.options ?? []) as { label: string; value: string }[])
      const match =
        options.find((option) => option.value === rawValue) ??
        options.find((option) => option.label.toLowerCase() === rawValue.trim().toLowerCase())
      return [{ columnId, value: match ? match.value : null }]
    }
    default:
      return [{ columnId, value: rawValue }]
  }
}
