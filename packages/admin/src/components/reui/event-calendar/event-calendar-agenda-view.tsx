// Title: Event Calendar Agenda View
// Description: Chronological agenda grouped by day - a day header row plus a clean time / dot / title table.

"use client"

import { useMemo, type HTMLAttributes } from "react"
import {
  EventCalendarViewContext,
  useEventCalendar,
  useEventCalendarSelector,
  useEventCalendarSettings,
  useEventCalendarViewConfig,
} from "./event-calendar"
import { EventCalendarEvent } from "./event-calendar-event"
import {
  getDayKey,
  getRangeKey,
  toZoned,
  zonedStartOfDay,
} from "./event-calendar-lib"
import type {
  EventCalendarDateRange,
  EventCalendarSegment,
} from "./event-calendar-types"
import { addDays, format } from "date-fns"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "../../../lib/utils"
import { ScrollArea } from "../../../components/ui/scroll-area"
import { Calendar } from "lucide-react"

// The agenda window length is the agendaDayCount SETTING (the store derives
// visibleRange from it); a per-view prop here would silently disagree.
interface EventCalendarAgendaViewProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

function EventCalendarAgendaView({
  className,
  asChild = false,
  ...props
}: EventCalendarAgendaViewProps) {
  const instance = useEventCalendar()
  const settings = useEventCalendarSettings()
  const viewConfig = useEventCalendarViewConfig()
  const visibleRange = useEventCalendarSelector<
    unknown,
    EventCalendarDateRange
  >((state) => state.visibleRange, {
    isEqual: (a, b) => getRangeKey(a) === getRangeKey(b),
  })
  // Subscribe to event changes via the day-bucket content of the whole range
  useEventCalendarSelector((state) => state.events)

  const days = useMemo(() => {
    const result: Date[] = []
    let cursor = zonedStartOfDay(visibleRange.start, settings.timeZone)
    while (cursor < visibleRange.end) {
      result.push(cursor)
      cursor = zonedStartOfDay(
        addDays(toZoned(cursor, settings.timeZone), 1),
        settings.timeZone
      )
    }
    return result
  }, [visibleRange, settings.timeZone])

  const index = instance.internals.getIndex()
  const groups = days
    .map((day) => ({
      day,
      bucket: index.byDay.get(getDayKey(day, settings.timeZone)),
    }))
    .filter((group) => {
      const total =
        (group.bucket?.allDay.length ?? 0) + (group.bucket?.timed.length ?? 0)
      return total > 0
    })

  const isToday = (day: Date) =>
    getDayKey(day, settings.timeZone) ===
    getDayKey(new Date(), settings.timeZone)

  const native = viewConfig.scrollbars === "native"

  const body = (
    <>
      {groups.length === 0 ? (
        <div
          data-slot="event-calendar-no-events"
          className={cn(
            "dy-flex dy-min-h-72 dy-flex-col dy-items-center dy-justify-center dy-gap-4 dy-py-16",
            viewConfig.classNames?.noEvents
          )}
        >
          {viewConfig.renderNoEvents?.() ?? (
            <>
              <Calendar aria-hidden="true" />
              <span className="dy-text-muted-foreground dy-text-sm">
                {settings.i18n.labels.noEvents}
              </span>
            </>
          )}
        </div>
      ) : (
        // Drop the very last row's bottom border so it does not double up with
        // the calendar container's own bottom border. Targets the last day
        // group's last child (its last agenda item); per-item `dy-border-b` is
        // kept everywhere else, including each day's internal rows.
        <div className="dy-flex dy-flex-col [&>*:last-child>*:last-child]:dy-border-b-0">
          {groups.map(({ day, bucket }) => {
            const items = [...(bucket?.allDay ?? []), ...(bucket?.timed ?? [])]
            const zoned = toZoned(day, settings.timeZone)
            const weekday = format(zoned, "EEEE", { locale: settings.locale })
            const dayDate = format(zoned, "MMMM d, yyyy", {
              locale: settings.locale,
            })
            return (
              <div
                key={day.getTime()}
                data-slot="event-calendar-agenda-day"
                data-today={isToday(day) || undefined}
                // A named group per day so a screen reader can step day by day
                // (and hear how full one is) instead of arrowing every row.
                role="group"
                aria-label={`${weekday}, ${dayDate}, ${settings.i18n.labels.events(items.length)}`}
              >
                {/* Group header: weekday (leading) + full date (trailing) */}
                <div
                  data-slot="event-calendar-agenda-day-header"
                  // The day bar is the agenda's only structure, so give it a
                  // heading level: the H key and the rotor can jump between
                  // days, which is the whole point of a long agenda.
                  role="heading"
                  aria-level={3}
                  className={cn(
                    "dy-bg-muted/60 dy-sticky dy-top-0 dy-z-10 dy-flex dy-items-baseline dy-justify-between dy-gap-4 dy-border-b dy-px-4 dy-py-2",
                    // The custom ScrollArea's overlay scrollbar (w-2.5 = 10px)
                    // is painted UNDER this sticky, z-10, opaque header, so the
                    // thumb vanishes behind the day bar at the top of the view.
                    // Inset the header by the scrollbar lane so its background
                    // stops before the scrollbar instead of covering it. Native
                    // scrollbars already sit outside the content box, so this
                    // only applies to the custom-scrollbar path.
                    !native && "dy-me-2.5",
                    viewConfig.classNames?.agendaDayHeader
                  )}
                >
                  <span
                    className={cn(
                      "dy-text-foreground dy-font-semibold",
                      isToday(day) && "dy-text-primary"
                    )}
                  >
                    {weekday}
                  </span>
                  <span className="dy-text-muted-foreground dy-font-medium dy-tabular-nums">
                    {dayDate}
                  </span>
                </div>
                {items.map((segment) => (
                  <EventCalendarAgendaItem
                    key={segment.occurrence.key}
                    segment={segment}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </>
  )

  const Comp = asChild ? Slot : "div"

  return (
    <EventCalendarViewContext.Provider value={{ view: "agenda" }}>
      <Comp
        data-slot="event-calendar-agenda-view"
        data-view="agenda"
        // Unlike the grid views the agenda has no row/column semantics to carry
        // a name, so label the region with the day range it covers - through
        // formatDayRange, so a consumer override reaches it.
        role="group"
        aria-label={settings.i18n.functions.formatDayRange(visibleRange, {
          locale: settings.locale,
        })}
        className={cn(
          "dy-flex dy-min-h-0 dy-flex-1 dy-flex-col dy-overflow-hidden dy-border-t",
          viewConfig.classNames?.agendaView,
          className
        )}
        {...props}
      >
        {native ? (
          <div
            data-slot="scroll-area-viewport"
            data-ec-native-scroll=""
            className="dy-h-full dy-overflow-y-auto"
          >
            {body}
          </div>
        ) : (
          <ScrollArea className="dy-h-full">{body}</ScrollArea>
        )}
      </Comp>
    </EventCalendarViewContext.Provider>
  )
}

/**
 * One agenda row: a full-width, selectable table row - time column, color dot,
 * and title (all replaceable via renderAgendaEvent). Clicking selects the
 * event (drag/resize stay off in the agenda).
 */
function EventCalendarAgendaItem({
  segment,
}: {
  segment: EventCalendarSegment
}) {
  const viewConfig = useEventCalendarViewConfig()
  return (
    <EventCalendarEvent
      segment={segment}
      className={cn(
        // read-only list: hover only, no selected/focused styling on click
        "hover:dy-bg-accent/40 dy-gap-3 dy-rounded-none dy-border-b dy-px-4 dy-py-2.5 dy-transition-colors",
        viewConfig.classNames?.agendaItem
      )}
    />
  )
}

export { EventCalendarAgendaView }
export type { EventCalendarAgendaViewProps }