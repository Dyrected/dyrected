import { useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { addMinutes, parseISO } from "date-fns"
import { toast } from "sonner"

import {
  EventCalendar,
  type EventCalendarApi,
} from "../../../../components/reui/event-calendar/event-calendar"
import type {
  EventCalendarOccurrence,
  EventCalendarProposedUpdate,
  EventCalendarResource,
} from "../../../../components/reui/event-calendar/event-calendar-types"
import { EventCalendarContent } from "../../../../components/reui/event-calendar/event-calendar-content"
import { EventCalendarNav } from "../../../../components/reui/event-calendar/event-calendar-nav"
import { Card, CardContent } from "../../../../components/ui/card"
import { useDyrected } from "../../../../providers/dyrected-context"
import { EventDetailSheet } from "./event-detail-sheet"
import type { SerializedAction, SerializedView } from "../types"

interface CalendarLayoutProps {
  slug: string
  schema: any
  view: SerializedView
  data: Record<string, any>[]
  isLoading?: boolean
  client: unknown
  schemas: unknown
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
  /** Returns true while an action × selection is executing (drives loading states). */
  isRunningAction?: (action: SerializedAction, ids: string[]) => boolean
}

export type { CalendarLayoutProps }

function toDate(value: unknown): Date | null {
  if (!value) return null
  const date = typeof value === "string" ? parseISO(value) : new Date(value as string)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Event color tokens (mirror the calendar's own presets; defined in index.css). */
const RESOURCE_COLOR_TOKENS = [
  "var(--color-blue-500)",
  "var(--color-emerald-500)",
  "var(--color-violet-500)",
  "var(--color-rose-500)",
  "var(--color-amber-500)",
  "var(--color-cyan-500)",
  "var(--color-orange-500)",
  "var(--color-pink-500)",
  "var(--color-teal-500)",
  "var(--color-indigo-500)",
]

/** Normalized resource id for a doc's `resourceField` value; undefined when unset. */
function resourceValueOf(doc: Record<string, any> | null | undefined, resourceField?: string): string | undefined {
  if (!resourceField || !doc) return undefined
  const raw = doc[resourceField]
  if (raw === null || raw === undefined || raw === "") return undefined
  return String(raw)
}

/**
 * Resources come from the field's declared options (mirrors the kanban board);
 * observed values missing from the declaration get their own column so no
 * event disappears from the resource view.
 */
function deriveResources(
  resourceField: string,
  schema: any,
  docs: Record<string, any>[],
): EventCalendarResource[] {
  const field = (schema?.fields ?? []).find((candidate: any) => candidate.name === resourceField)

  const resources: EventCalendarResource[] =
    field?.type === "boolean"
      ? [
        { id: "true", title: field.label || "Yes" },
        { id: "false", title: "No" },
      ]
      : (Array.isArray(field?.options) ? field.options : []).map((option: any) =>
        typeof option === "string"
          ? { id: option, title: option }
          : { id: String(option.value), title: String(option.label ?? option.value) },
      )

  const known = new Set(resources.map((resource) => resource.id))
  for (const doc of docs) {
    const id = resourceValueOf(doc, resourceField)
    if (!id || known.has(id)) continue
    known.add(id)
    resources.push({ id, title: id })
  }
  // Stable per-resource tint so events read as belonging to their column.
  for (let i = 0; i < resources.length; i++) {
    if (!resources[i].color) {
      resources[i].color = RESOURCE_COLOR_TOKENS[i % RESOURCE_COLOR_TOKENS.length]
    }
  }
  return resources
}

/** Coerces a normalized resource id back to the field's storage type. */
function coerceResourceValue(id: string, resourceField: string, schema: any): unknown {
  const field = (schema?.fields ?? []).find((candidate: any) => candidate.name === resourceField)
  if (field?.type === "boolean") return id === "true"
  if (field?.type === "number") {
    const parsed = Number(id)
    return Number.isNaN(parsed) ? id : parsed
  }
  return id
}

/**
 * Calendar layout — the ReUI EventCalendar wired to operational view config:
 * documents map onto events via `dateField`, drag/resize persists new dates
 * through the collection update pipeline, and clicking opens the detail sheet.
 * When the view declares a `resourceField`, its values become booking columns
 * in the "Resource" view and dragging an event across columns persists that
 * field.
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
  isRunningAction,
}: CalendarLayoutProps) {
  const { client: dyrected } = useDyrected()
  const queryClient = useQueryClient()
  const apiRef = useRef<EventCalendarApi | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<Record<string, any> | null>(null)

  const dateField =
    view.dateField ??
    (schema?.fields ?? []).find((field: any) => field.type === "date" || field.type === "datetime")?.name

  const titleField = (view.columns ?? [])[0]
  const resourceField = view.resourceField

  const resources = useMemo(
    () => (resourceField ? deriveResources(resourceField, schema, data ?? []) : []),
    [resourceField, schema, data],
  )

  const events = useMemo(() => {
    const colorByResource = new Map(resources.map((resource) => [resource.id, resource.color]))
    return (data ?? [])
      .filter((doc) => doc[dateField])
      .map((doc) => {
        const start = toDate(doc[dateField]) ?? new Date()
        const rawEnd = view.endDateField && doc[view.endDateField] ? toDate(doc[view.endDateField]) : null
        const end = rawEnd ?? addMinutes(start, 60)
        const titleValue = titleField ? doc[titleField] : undefined
        const resourceId = resourceValueOf(doc, resourceField)
        return {
          id: String(doc.id),
          title: String(titleValue ?? doc.title ?? doc.name ?? "Untitled"),
          start,
          end,
          resourceId,
          color: resourceId ? colorByResource.get(resourceId) : undefined,
          data: doc,
        }
      })
  }, [data, dateField, view.endDateField, titleField, resourceField, resources])

  const persistMove = async (update: EventCalendarProposedUpdate) => {
    const id = String(update.event.id)
    try {
      if (!dyrected) throw new Error("Dyrected client unavailable")
      const patch: Record<string, unknown> = { [dateField!]: update.start.toISOString() }
      if (view.endDateField) patch[view.endDateField] = update.end.toISOString()
      if (resourceField && update.resourceId !== undefined) {
        const current = resourceValueOf(update.event.data as Record<string, any>, resourceField)
        if (current !== update.resourceId) {
          patch[resourceField] = coerceResourceValue(update.resourceId, resourceField, schema)
        }
      }
      await dyrected.collection(slug).update(id, patch)
      toast.success("Rescheduled")
      await queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
    } catch (error: any) {
      toast.error("Reschedule failed", {
        description: error?.message ?? "The change was reverted.",
      })
    }
  }

  const handleEventUpdate = (update: EventCalendarProposedUpdate) => {
    // Optimistic accept; failures revert via refetch after the toast.
    void persistMove(update)
    return true
  }

  const handleEventClick = (occurrence: EventCalendarOccurrence<any>) => {
    if (occurrence.event.data) setSelectedDoc(occurrence.event.data as Record<string, any>)
  }

  if (!dateField) {
    return (
      <p className="dy-rounded-md dy-border dy-border-dashed dy-p-8 dy-text-center dy-text-sm dy-text-muted-foreground">
        This calendar view needs a <code className="dy-font-mono">dateField</code> configured.
      </p>
    )
  }

  if (isLoading) {
    return <div className="dy-h-[640px] dy-animate-pulse dy-rounded-2xl dy-bg-muted" />
  }

  return (
    <div data-collection={slug}>
      <Card className="dy-border-border/50 dy-py-0">
        <CardContent className="dy-p-0">
          <EventCalendar
            events={events}
            resources={resources}
            defaultView="month"
            apiRef={apiRef}
            interactions={{ drag: true, resize: true, selectSlot: false }}
            eventTooltip
            onEventClick={handleEventClick}
            onEventUpdate={handleEventUpdate}
            className="dy-h-[640px] dy-w-full"
          >
            <div className="dy-flex dy-flex-wrap dy-items-center dy-gap-2 dy-pe-2">
              <EventCalendarNav className="dy-min-w-0 dy-flex-1" />
            </div>
            <EventCalendarContent />
          </EventCalendar>
        </CardContent>
      </Card>

      <EventDetailSheet
        doc={selectedDoc}
        schema={schema}
        client={client}
        schemas={schemas}
        columns={view.columns}
        actions={actions}
        onRunAction={onRunAction}
        isRunningAction={isRunningAction}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  )
}
