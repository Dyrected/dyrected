import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Card, CardContent } from "../../../../components/ui/card"
import { RenderCell } from "../../../../components/ui/render-cell"
import { RowActionsCell } from "../row-actions-cell"
import type { SerializedAction, SerializedView } from "../types"
import { cn } from "../../../../lib/utils"

interface KanbanCardProps {
  doc: Record<string, any>
  schema: any
  client: unknown
  schemas: unknown
  view: SerializedView
  rowActions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
}

/**
 * Draggable card on the kanban board. Field values render through the shared
 * `RenderCell`; row-type actions attach directly to the card.
 */
export function KanbanCard({ doc, schema, client, schemas, view, rowActions, onRunAction }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(doc.id),
  })

  const fieldsByName = React.useMemo(
    () => new Map<string, any>((schema?.fields ?? []).map((field: any) => [field.name, field])),
    [schema],
  )

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "dy-cursor-grab dy-rounded-md dy-border dy-shadow-sm active:dy-cursor-grabbing",
        isDragging && "dy-opacity-40",
      )}
      {...attributes}
      {...listeners}
    >
      <CardContent className="dy-space-y-1.5 dy-p-3">
        {(view.columns ?? []).map((fieldName) => {
          const field = fieldsByName.get(fieldName)
          if (!field || doc[fieldName] === undefined || doc[fieldName] === null) return null
          const isTitle = fieldName === (view.columns ?? [])[0]
          return (
            <div key={fieldName} className={isTitle ? "dy-text-sm dy-font-medium" : "dy-text-xs"}>
              <RenderCell value={doc[fieldName]} field={field} client={client} schemas={schemas} />
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
              <RowActionsCell actions={rowActions} docId={String(doc.id)} onRun={onRunAction} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
