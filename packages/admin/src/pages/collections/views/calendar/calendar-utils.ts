import * as React from "react"
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns"

export type CalendarViewMode = "month" | "week" | "day"

export interface CalendarDocGroup {
  date: Date
  docs: Record<string, any>[]
}

/** Groups documents onto calendar days using the view's `dateField`. */
export function groupByDate(docs: Record<string, any>[], dateField: string): Map<string, Record<string, any>[]> {
  const byDate = new Map<string, Record<string, any>[]>()
  for (const doc of docs) {
    const raw = doc[dateField]
    if (!raw) continue
    const date = typeof raw === "string" ? parseISO(raw) : new Date(raw)
    if (Number.isNaN(date.getTime())) continue
    const key = startOfDay(date).toISOString()
    const bucket = byDate.get(key)
    if (bucket) bucket.push(doc)
    else byDate.set(key, [doc])
  }
  return byDate
}

/** The visible day range for the current mode + cursor. */
export function visibleDays(mode: CalendarViewMode, cursor: Date): Date[] {
  if (mode === "day") return [startOfDay(cursor)]
  const weekStart = startOfWeek(cursor, { weekStartsOn: 0 })
  if (mode === "week") return eachDayOfInterval({ start: weekStart, end: endOfWeek(cursor, { weekStartsOn: 0 }) })
  // Month view shows whole weeks that overlap the month.
  const monthStart = startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1), { weekStartsOn: 0 })
  const monthEnd = endOfWeek(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), { weekStartsOn: 0 })
  return eachDayOfInterval({ start: monthStart, end: monthEnd })
}

export function moveCursor(mode: CalendarViewMode, cursor: Date, direction: -1 | 1): Date {
  if (mode === "month") return addMonths(cursor, direction)
  if (mode === "week") return addWeeks(cursor, direction)
  return addDays(cursor, direction)
}

export function periodLabel(mode: CalendarViewMode, cursor: Date): string {
  if (mode === "month") return format(cursor, "MMMM yyyy")
  const days = visibleDays(mode, cursor)
  if (mode === "week" && days.length >= 7) {
    return `${format(days[0], "MMM d")} – ${format(days[6], "MMM d, yyyy")}`
  }
  return format(days[0], "EEEE, MMMM d, yyyy")
}

/** Hook keeping the docs-by-date map in sync with fetched data. */
export function useCalendarGroups(data: Record<string, any>[], dateField: string) {
  return React.useMemo(() => groupByDate(data ?? [], dateField), [data, dateField])
}

/** Docs scheduled on a specific day. */
export function docsForDate(groups: Map<string, Record<string, any>[]>, date: Date): Record<string, any>[] {
  return groups.get(startOfDay(date).toISOString()) ?? []
}
