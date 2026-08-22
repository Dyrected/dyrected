import * as React from "react"

import { CalendarToolbar } from "./calendar-toolbar"
import { CalendarGrid } from "./calendar-grid"
import { EventDetailSheet } from "./event-detail-sheet"
import { moveCursor, periodLabel, useCalendarGroups, visibleDays, type CalendarViewMode } from "./calendar-utils"
import type { SerializedAction, SerializedView } from "../types"

export interface CalendarLayoutProps {
  slug: string
  schema: any
  view: SerializedView
  data: Record<string, any>[]
  isLoading?: boolean
  client: unknown
  schemas: unknown
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
}

/**
 * Calendar layout — maps documents onto dates using the view's `dateField`
 * and renders month / week / day grids with a click-to-inspect drawer.
 * Ported from the ReUI event-calendar architecture.
 */
export function CalendarLayout({
  slug,
  schema,
  view,
  data,
  isLoading,
  client,
  schemas,
  actions,
  onRunAction,
}: CalendarLayoutProps) {
  const [mode, setMode] = React.useState<CalendarViewMode>("month")
  const [cursor, setCursor] = React.useState<Date>(() => new Date())
  const [selectedDoc, setSelectedDoc] = React.useState<Record<string, any> | null>(null)

  const dateField = view.dateField ?? (schema?.fields ?? []).find((field: any) => field.type === "date" || field.type === "datetime")?.name
  const groups = useCalendarGroups(data ?? [], dateField)
  const days = visibleDays(mode, cursor)

  if (!dateField) {
    return (
      <p className="dy-rounded-md dy-border dy-border-dashed dy-p-8 dy-text-center dy-text-sm dy-text-muted-foreground">
        This calendar view needs a <code className="dy-font-mono">dateField</code> configured.
      </p>
    )
  }

  return (
    <div className="dy-flex dy-flex-col dy-gap-4" data-collection={slug}>
      <CalendarToolbar
        mode={mode}
        label={periodLabel(mode, cursor)}
        onModeChange={setMode}
        onMove={(direction) => setCursor((prev) => moveCursor(mode, prev, direction))}
        onToday={() => setCursor(new Date())}
      />
      {isLoading ? (
        <div className="dy-h-96 dy-animate-pulse dy-rounded-md dy-bg-muted" />
      ) : (
        <CalendarGrid
          days={days}
          mode={mode}
          groups={groups}
          titleField={(view.columns ?? [])[0]}
          schema={schema}
          client={client}
          schemas={schemas}
          onSelectDoc={setSelectedDoc}
        />
      )}
      <EventDetailSheet
        doc={selectedDoc}
        schema={schema}
        client={client}
        schemas={schemas}
        columns={view.columns}
        actions={actions}
        onRunAction={onRunAction}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  )
}
