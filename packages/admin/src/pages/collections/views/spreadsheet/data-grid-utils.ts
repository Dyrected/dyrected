import type { CellPosition } from "./data-grid-types"

export function getCellKey(rowIndex: number, columnId: string): string {
  return `${rowIndex}:${columnId}`
}

/** Normalizes a date value to an ISO-ish string the calendar can parse. */
export function toISODateValue(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}

/**
 * Parses a clipboard TSV payload into a matrix. Multi-line values inside a
 * cell arrive quoted per RFC 4180-style spreadsheets; we handle the common
 * quoted-newline case.
 */
export function parseClipboardTSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"' && cell === "") {
      inQuotes = true
      continue
    }
    if (char === "\t") {
      row.push(cell)
      cell = ""
      continue
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
      continue
    }
    cell += char
  }
  if (cell !== "" || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((candidate) => candidate.some((value) => value !== ""))
}

/** Serializes a rectangular region of raw values back to TSV for copy-out. */
export function serializeToTSV(matrix: unknown[][]): string {
  return matrix
    .map((row) =>
      row
        .map((value) => {
          const text = value === null || value === undefined ? "" : String(value)
          return /[\t\n\r"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
        })
        .join("\t"),
    )
    .join("\n")
}

export interface RectangularSelection {
  top: number
  bottom: number
  left: number
  right: number
}

export function selectionRect(a: CellPosition, b: CellPosition): RectangularSelection {
  return {
    top: Math.min(a.row, b.row),
    bottom: Math.max(a.row, b.row),
    left: Math.min(a.col, b.col),
    right: Math.max(a.col, b.col),
  }
}

export function isInRect(row: number, col: number, rect: RectangularSelection): boolean {
  return row >= rect.top && row <= rect.bottom && col >= rect.left && col <= rect.right
}
