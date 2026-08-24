import * as React from "react"
import { format, isSameMonth, isToday } from "date-fns"

import { RenderCell } from "../../../../components/ui/render-cell"
import { cn } from "../../../../lib/utils"
import { docsForDate, type CalendarViewMode } from "./calendar-utils"

interface CalendarGridProps {
  days: Date[]
  mode: CalendarViewMode
  groups: Map<string, Record<string, any>[]>
  /** Field used to render the chip label; defaults to the first view column. */
  titleField?: string
  schema: any
  client: unknown
  schemas: unknown
  onSelectDoc: (doc: Record<string, any>) => void
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
/** Chips shown per day cell before collapsing into "+n more". */
const MAX_CHIPS_MONTH = 3

/**
 * Month / week / day grids with date-mapped event chips.
 * Ported from the ReUI event-calendar architecture.
 */
export function CalendarGrid({ days, mode, groups, titleField, schema, client, schemas, onSelectDoc }: CalendarGridProps) {
  const fieldsByName = React.useMemo(
    () => new Map<string, any>((schema?.fields ?? []).map((field: any) => [field.name, field])),
    [schema],
  )
  const cursorMonth = days.length > 20 ? days[10] : undefined

  if (mode === "day") {
    return <DayList day={days[0]} {...{ groups, titleField, schema, client, schemas, onSelectDoc }} />
  }

  return (
    <div className="dy-overflow-hidden dy-rounded-md dy-border">
      <div className="dy-grid dy-grid-cols-7 dy-border-b dy-bg-muted/50">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="dy-py-1.5 dy-text-center dy-text-[11px] dy-font-semibold dy-text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      <div className={cn("dy-grid dy-grid-cols-7", mode === "month" && "dy-auto-rows-min")}>
        {days.map((day) => {
          const docs = docsForDate(groups, day)
          const visible = mode === "week" ? docs : docs.slice(0, MAX_CHIPS_MONTH)
          const hidden = docs.length - visible.length
          const outside = cursorMonth ? !isSameMonth(day, cursorMonth) : false

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "dy-min-h-[5.5rem] dy-space-y-1 dy-border-b dy-border-r dy-p-1.5 [&:nth-child(7n)]:dy-border-r-0",
                outside && "dy-bg-muted/30",
              )}
            >
              <div className="dy-flex dy-items-center dy-justify-end">
                <span
                  className={cn(
                    "dy-flex dy-h-6 dy-w-6 dy-items-center dy-justify-center dy-rounded-full dy-text-xs",
                    isToday(day) && "dy-bg-primary dy-font-bold dy-text-primary-foreground",
                    outside && !isToday(day) && "dy-text-muted-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              {visible.map((doc) => {
                const field = titleField ? fieldsByName.get(titleField) : undefined
                return (
                  <button
                    key={String(doc.id)}
                    type="button"
                    onClick={() => onSelectDoc(doc)}
                    className="dy-block dy-w-full dy-truncate dy-rounded dy-bg-primary/10 dy-px-1.5 dy-py-0.5 dy-text-left dy-text-[11px] dy-font-medium hover:dy-bg-primary/20"
                  >
                    {field ? (
                      <RenderCell value={doc[titleField!]} field={field} client={client} schemas={schemas} />
                    ) : (
                      String(doc.title ?? doc.name ?? doc.id)
                    )}
                  </button>
                )
              })}
              {hidden > 0 && (
                <p className="dy-px-1 dy-text-[10px] dy-font-medium dy-text-muted-foreground">+{hidden} more</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayList({
  day,
  groups,
  titleField,
  schema,
  client,
  schemas,
  onSelectDoc,
}: Pick<CalendarGridProps, "groups" | "titleField" | "schema" | "client" | "schemas" | "onSelectDoc"> & { day: Date }) {
  const docs = docsForDate(groups, day)
  const fieldsByName = React.useMemo(
    () => new Map<string, any>((schema?.fields ?? []).map((field: any) => [field.name, field])),
    [schema],
  )

  if (!docs.length) {
    return (
      <p className="dy-rounded-md dy-border dy-border-dashed dy-p-8 dy-text-center dy-text-sm dy-text-muted-foreground">
        Nothing scheduled for {format(day, "MMMM d, yyyy")}.
      </p>
    )
  }

  return (
    <div className="dy-space-y-2">
      {docs.map((doc) => {
        const field = titleField ? fieldsByName.get(titleField) : undefined
        return (
          <button
            key={String(doc.id)}
            type="button"
            onClick={() => onSelectDoc(doc)}
            className="dy-flex dy-w-full dy-items-center dy-gap-3 dy-rounded-md dy-border dy-p-3 dy-text-left hover:dy-bg-accent/50"
          >
            <div className="dy-min-w-0 dy-flex-1">
              {field ? (
                <RenderCell value={doc[titleField!]} field={field} client={client} schemas={schemas} />
              ) : (
                String(doc.title ?? doc.name ?? doc.id)
              )}
            </div>
            <ChevronRightHint />
          </button>
        )
      })}
    </div>
  )
}

function ChevronRightHint() {
  return <span aria-hidden className="dy-text-muted-foreground">›</span>
}
