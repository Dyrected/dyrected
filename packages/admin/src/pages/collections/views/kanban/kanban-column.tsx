import * as React from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { AlertCircle, Loader2 } from "lucide-react"

import { cn } from "../../../../lib/utils"
import type { KanbanGroup } from "./kanban-layout"

interface KanbanColumnProps {
  group: KanbanGroup
  /** Renders a draggable card for the given document. */
  renderCard: (doc: Record<string, any>) => React.ReactNode
}

/**
 * Droppable board column with a header (label + live count) and its
 * sortable card list. Supports per-column loading skeletons, error states
 * with retry, and paginated infinite scroll / load-more buttons.
 */
export function KanbanColumn({ group, renderCard }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: group.value })
  const totalCount = group.total ?? group.docs.length

  return (
    <div className="dy-flex dy-min-w-[260px] dy-max-w-md dy-flex-1 dy-flex-col dy-gap-2">
      <div className="dy-flex dy-items-center dy-justify-between dy-gap-2 dy-px-1">
        <div className="dy-flex dy-items-center dy-gap-2">
          <span
            className={cn("dy-h-2 dy-w-2 dy-rounded-full", group.toneClass ?? "dy-bg-muted-foreground/40")}
          />
          <p className="dy-text-sm dy-font-semibold dy-capitalize">{group.label}</p>
          <span className="dy-rounded-full dy-bg-muted dy-px-1.5 dy-py-0.5 dy-font-mono dy-text-[10px] dy-text-muted-foreground">
            {totalCount}
          </span>
        </div>
      </div>
      <div
        className={cn(
          "dy-h-[calc(100vh-23rem)] dy-min-h-64 dy-overflow-y-auto dy-rounded-md dy-border dy-border-border/60 dy-bg-muted/40",
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
            {group.isPending && !group.docs.length ? (
              <div className="dy-space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className="dy-h-20 dy-animate-pulse dy-rounded-md dy-bg-muted/70"
                    style={{ opacity: 1 - i * 0.2 }}
                  />
                ))}
              </div>
            ) : null}

            {group.isError ? (
              <div className="dy-flex dy-flex-col dy-items-center dy-justify-center dy-gap-1.5 dy-rounded-md dy-border dy-border-destructive/30 dy-bg-destructive/10 dy-p-4 dy-text-center dy-text-xs dy-text-destructive">
                <AlertCircle className="dy-h-4 dy-w-4" />
                <span>Failed to load items</span>
                {group.retry && (
                  <button
                    type="button"
                    onClick={group.retry}
                    className="dy-mt-1 dy-rounded dy-border dy-border-border/50 dy-bg-background dy-px-2.5 dy-py-1 dy-text-[11px] dy-font-medium dy-text-foreground dy-shadow-xs hover:dy-bg-accent"
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : null}

            {group.docs.map((doc) => renderCard(doc))}

            {!group.isPending && !group.isError && group.docs.length === 0 ? (
              <p className="dy-px-1 dy-py-6 dy-text-center dy-text-xs dy-text-muted-foreground">
                Drop items here
              </p>
            ) : null}

            {group.hasNextPage && group.loadMore ? (
              <button
                type="button"
                onClick={group.loadMore}
                disabled={group.isFetchingMore}
                className="dy-mt-1 dy-flex dy-h-8 dy-w-full dy-items-center dy-justify-center dy-gap-1.5 dy-rounded-md dy-border dy-border-dashed dy-border-border/60 dy-bg-background/50 dy-text-xs dy-font-medium dy-text-muted-foreground hover:dy-bg-muted/50 hover:dy-text-foreground disabled:dy-pointer-events-none disabled:dy-opacity-50"
              >
                {group.isFetchingMore ? (
                  <>
                    <Loader2 className="dy-h-3 dy-w-3 dy-animate-spin" />
                    <span>Loading…</span>
                  </>
                ) : (
                  <span>Load more ({group.docs.length} of {totalCount})</span>
                )}
              </button>
            ) : null}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
