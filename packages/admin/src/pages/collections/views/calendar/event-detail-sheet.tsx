import { RenderCell } from "../../../../components/ui/render-cell"
import { RowActionsCell } from "../row-actions-cell"
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
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
  /** Returns true while an action × selection is executing (drives loading states). */
  isRunningAction?: (action: SerializedAction, ids: string[]) => boolean
  onClose: () => void
}

/**
 * Click-to-inspect drawer for calendar events.
 * Shows every configured view column plus row-type actions.
 */
export function EventDetailSheet({
  doc,
  schema,
  client,
  schemas,
  columns,
  actions,
  onRunAction,
  isRunningAction,
  onClose,
}: EventDetailSheetProps) {
  if (!doc) return null

  const fieldsByName = new Map<string, any>((schema?.fields ?? []).map((field: any) => [field.name, field]))
  const shown = columns?.length ? columns : [...fieldsByName.keys()].slice(0, 6)
  const rowActions = actions.filter((action) => (action.type ?? "row") === "row")

  return (
    <Sheet open onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent className="dy-overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{String(doc.title ?? doc.name ?? "Details")}</SheetTitle>
          {doc.createdAt && <SheetDescription>Created {new Date(doc.createdAt).toLocaleDateString()}</SheetDescription>}
        </SheetHeader>
        <div className="dy-space-y-4 dy-py-4">
          {shown.map((fieldName) => {
            const field = fieldsByName.get(fieldName)
            if (!field || doc[fieldName] === undefined) return null
            return (
              <div key={fieldName} className="dy-space-y-1">
                <p className="dy-text-xs dy-font-medium dy-text-muted-foreground">{field.label || fieldName}</p>
                <RenderCell value={doc[fieldName]} field={field} client={client} schemas={schemas} />
              </div>
            )
          })}
          {rowActions.length > 0 && (
            <div className="dy-space-y-2 dy-border-t dy-pt-4">
              <p className="dy-text-xs dy-font-medium dy-text-muted-foreground">Actions</p>
              <RowActionsCell
                actions={rowActions}
                docId={String(doc.id)}
                onRun={onRunAction}
                isRunning={isRunningAction}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
