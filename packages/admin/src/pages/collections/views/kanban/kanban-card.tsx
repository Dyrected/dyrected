import * as React from "react"
import { Link } from "react-router-dom"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Card, CardContent } from "../../../../components/ui/card"
import { RenderCell } from "../../../../components/ui/render-cell"
import { RowActionsCell } from "../row-actions-cell"
import { SkeletonActionRow, SkeletonText } from "../view-skeletons"
import type { SerializedAction, SerializedView } from "../types"
import { cn } from "../../../../lib/utils"

interface KanbanCardProps {
  slug: string
  doc: Record<string, any>
  schema: any
  client: unknown
  schemas: unknown
  view: SerializedView
  rowActions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
  /** Returns true while an action × selection is executing (drives loading states). */
  isRunning?: (action: SerializedAction, ids: string[]) => boolean
  /**
   * Field names to render on the card body, in order (from the layout's
   * field preferences). Defaults to the view's configured columns.
   */
  fields?: string[]
  /** Renders content-shaped skeletons instead of values; drag is disabled. */
  loading?: boolean
}

/**
 * Draggable card on the kanban board. Field values render through the shared
 * `RenderCell`; row-type actions attach directly to the card.
 */
export function KanbanCard({ slug, doc, schema, client, schemas, view, rowActions, onRunAction, isRunning, fields, loading }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(doc.id),
    disabled: loading,
  })

  const fieldsByName = React.useMemo(
    () => new Map<string, any>((schema?.fields ?? []).map((field: any) => [field.name, field])),
    [schema],
  )

  const visibleColumns = fields ?? view.columns ?? []
  const titleField = visibleColumns[0]

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "dy-cursor-grab dy-rounded-md dy-border dy-border-border/60 dy-shadow-xs active:dy-cursor-grabbing",
        isDragging && "dy-opacity-40",
        loading && "dy-pointer-events-none dy-cursor-default active:dy-cursor-default",
      )}
      {...(loading ? {} : attributes)}
      {...(loading ? {} : listeners)}
    >
      <CardContent className="dy-space-y-1.5 dy-p-3">
        {loading ? (
          <div className="dy-space-y-2" aria-busy="true">
            <SkeletonText className="dy-w-2/3" />
            <SkeletonText className="dy-w-1/3" />
            <div className="dy-pt-1">
              <SkeletonActionRow />
            </div>
          </div>
        ) : (
          <>
            {visibleColumns.map((fieldName) => {
              const field = fieldsByName.get(fieldName)
              if (!field || doc[fieldName] === undefined || doc[fieldName] === null) return null
              const isTitle = fieldName === titleField
              return (
                <div key={fieldName} className={isTitle ? "dy-text-sm dy-font-medium" : "dy-text-xs"}>
                  {isTitle ? (
                    <Link
                      to={`/collections/${slug}/${String(doc.id)}`}
                      className="dy-block hover:dy-text-primary hover:dy-underline dy-underline-offset-2"
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <RenderCell value={doc[fieldName]} field={field} client={client} schemas={schemas} />
                    </Link>
                  ) : (
                    <RenderCell value={doc[fieldName]} field={field} client={client} schemas={schemas} />
                  )}
                </div>
              )
            })}
            {rowActions.length > 0 && (
              <div className="dy-pt-1" onClick={(event) => event.stopPropagation()}>
                <div
                  role="toolbar"
                  aria-label="Row actions"
                  onKeyDown={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <RowActionsCell
                    actions={rowActions}
                    docId={String(doc.id)}
                    onRun={onRunAction}
                    isRunning={isRunning}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
