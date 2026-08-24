import { useMemo } from "react"
import { ExternalLink, Clock } from "lucide-react"

import { RenderCell } from "../../../../components/ui/render-cell"
import { RowActionsCell } from "../row-actions-cell"
import { Button } from "../../../../components/ui/button"
import { useIsMobile } from "../../../../hooks/use-mobile"
import { cn } from "../../../../lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../../../components/ui/sheet"
import type { SerializedAction } from "../types"

interface EventDetailSheetProps {
  doc: Record<string, any> | null
  schema: any
  client: unknown
  schemas: unknown
  columns?: string[]
  dateField?: string
  endDateField?: string
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
  /** Returns true while an action × selection is executing (drives loading states). */
  isRunningAction?: (action: SerializedAction, ids: string[]) => boolean
  onClose: () => void
}

/**
 * Click-to-inspect drawer for calendar events.
 * Shows configured view columns with scheduled date/time in header and wrapping action buttons.
 * Automatically switches to a bottom sheet on mobile screens.
 */
export function EventDetailSheet({
  doc,
  schema,
  client,
  schemas,
  columns,
  dateField,
  endDateField,
  actions,
  onRunAction,
  isRunningAction,
  onClose,
}: EventDetailSheetProps) {
  const isMobile = useIsMobile()

  const fieldsByName = new Map<string, any>((schema?.fields ?? []).map((field: any) => [field.name, field]))
  const shown = columns?.length ? columns : [...fieldsByName.keys()].slice(0, 6)
  const rowActions = actions.filter((action) => (action.type ?? "row") === "row")
  const collectionSlug = schema?.slug

  const formattedDateTime = useMemo(() => {
    if (!doc || !dateField || !doc[dateField]) return null
    const start = new Date(doc[dateField])
    if (isNaN(start.getTime())) return null

    const dateStr = start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    const startTimeStr = start.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })

    if (endDateField && doc[endDateField]) {
      const end = new Date(doc[endDateField])
      if (!isNaN(end.getTime())) {
        const endTimeStr = end.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })
        return `${dateStr} • ${startTimeStr} – ${endTimeStr}`
      }
    }

    return `${dateStr} at ${startTimeStr}`
  }, [doc, dateField, endDateField])

  if (!doc) return null

  return (
    <Sheet open onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "dy-flex dy-flex-col dy-overflow-hidden dy-p-0",
          isMobile ? "dy-max-h-[85vh] dy-rounded-t-2xl" : "sm:dy-max-w-md"
        )}
      >
        {isMobile && (
          <div className="dy-flex dy-w-full dy-justify-center dy-pt-2.5">
            <div className="dy-h-1 dy-w-10 dy-rounded-full dy-bg-muted-foreground/25" />
          </div>
        )}

        <SheetHeader className="dy-border-b dy-border-border/40 dy-bg-muted/15 dy-p-6 dy-pb-5">
          <div className="dy-flex dy-items-start dy-gap-3">
            <div className="dy-min-w-0 dy-flex-1 dy-space-y-1.5">
              <SheetTitle className="dy-truncate dy-text-base dy-font-semibold dy-tracking-tight">
                {String(doc.title ?? doc.name ?? "Event Details")}
              </SheetTitle>
              {formattedDateTime ? (
                <div className="dy-flex dy-items-center dy-justify-center md:dy-justify-start dy-gap-1.5 dy-text-xs dy-font-medium dy-text-primary">
                  <Clock className="dy-h-3.5 dy-w-3.5 dy-shrink-0" />
                  <span>{formattedDateTime}</span>
                </div>
              ) : doc.createdAt ? (
                <SheetDescription className="dy-text-xs dy-text-muted-foreground">
                  Created {new Date(doc.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </SheetDescription>
              ) : null}
            </div>
          </div>
        </SheetHeader>

        <div className="dy-flex-1 dy-space-y-5 dy-overflow-y-auto dy-p-6">
          <div className="dy-space-y-3.5">
            {shown.map((fieldName) => {
              const field = fieldsByName.get(fieldName)
              if (!field || doc[fieldName] === undefined) return null
              return (
                <div key={fieldName} className="dy-space-y-1">
                  <span className="dy-text-[11px] dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground">
                    {field.label || fieldName}
                  </span>
                  <div className="dy-text-sm dy-font-medium dy-text-foreground">
                    <RenderCell value={doc[fieldName]} field={field} client={client} schemas={schemas} />
                  </div>
                </div>
              )
            })}
          </div>

          {rowActions.length > 0 && (
            <div className="dy-space-y-2.5 dy-border-t dy-border-border/40 dy-pt-4">
              <span className="dy-text-[11px] dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground">
                Actions
              </span>
              <div className="dy-flex dy-w-full dy-items-center">
                <RowActionsCell
                  actions={rowActions}
                  docId={String(doc.id)}
                  doc={doc}
                  onRun={onRunAction}
                  isRunning={isRunningAction}
                  wrap
                />
              </div>
            </div>
          )}
        </div>

        {collectionSlug && (
          <div className="dy-border-t dy-border-border/40 dy-bg-muted/10 dy-p-4">
            <Button
              variant="outline"
              size="sm"
              className="dy-w-full dy-gap-1.5 dy-rounded-lg dy-border-border/50 dy-text-xs"
              asChild
            >
              <a href={`#/collections/${collectionSlug}/${doc.id}`}>
                <ExternalLink className="dy-h-3.5 dy-w-3.5" />
                Open Full Record
              </a>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
