import * as React from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"

import { cn } from "../../../../lib/utils"
import type { KanbanGroup } from "./kanban-layout"

interface KanbanColumnProps {
  group: KanbanGroup
  /** Renders a draggable card for the given document. */
  renderCard: (doc: Record<string, any>) => React.ReactNode
}

/**
 * Droppable board column with a header (label + live count) and its
 * sortable card list. Columns stretch to share the board width; a plain
 * overflow container (not ScrollArea) keeps cards constrained to the
 * column's own width.
 */
export function KanbanColumn({ group, renderCard }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: group.value })

  return (
    <div className="dy-flex dy-min-w-[260px] dy-max-w-md dy-flex-1 dy-flex-col dy-gap-2">
      <div className="dy-flex dy-items-center dy-justify-between dy-gap-2 dy-px-1">
        <div className="dy-flex dy-items-center dy-gap-2">
          <span
            className={cn("dy-h-2 dy-w-2 dy-rounded-full", group.toneClass ?? "dy-bg-muted-foreground/40")}
          />
          <p className="dy-text-sm dy-font-semibold">{group.label}</p>
          <span className="dy-rounded-full dy-bg-muted dy-px-1.5 dy-py-0.5 dy-font-mono dy-text-[10px] dy-text-muted-foreground">
            {group.docs.length}
          </span>
        </div>
      </div>
      <div
        className={cn(
          "dy-h-[calc(100vh-23rem)] dy-min-h-64 dy-overflow-y-auto dy-rounded-md dy-border dy-bg-muted/40",
          "dy-transition-colors",
          isOver && "dy-border-primary dy-bg-accent/30",
        )}
      >
        <SortableContext items={group.docs.map((doc) => String(doc.id))} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className={cn(
              "dy-flex dy-h-full dy-min-h-24 dy-flex-col dy-gap-2 dy-p-2",
              isOver && "dy-bg-accent/40",
            )}
          >
            {group.docs.map((doc) => renderCard(doc))}
            {group.docs.length === 0 && (
              <p className="dy-px-1 dy-py-6 dy-text-center dy-text-xs dy-text-muted-foreground">
                Drop items here
              </p>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
