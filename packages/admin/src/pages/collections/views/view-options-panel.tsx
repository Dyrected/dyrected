import * as React from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, ListChecks, RotateCcw, SlidersHorizontal } from "lucide-react"

import { Button } from "../../../components/ui/button"
import { Checkbox } from "../../../components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover"
import { Separator } from "../../../components/ui/separator"
import { cn } from "../../../lib/utils"

export interface ViewOptionsPanelProps {
  /** Trigger label; defaults to "View". */
  label?: string
  /** Section heading inside the popover; defaults to "Columns". */
  sectionLabel?: string
  /** Managed ids in display order (already reconciled to known items). */
  managedIds: string[]
  labelById: Map<string, string>
  hiddenIds: string[]
  isDirty: boolean
  isSaving: boolean
  isAdmin: boolean
  onOrderChange: (order: string[]) => void
  onToggleVisibility: (id: string, visible: boolean) => void
  onShowAll: () => void
  onHideAllExcept: (keepId?: string) => void
  onReset: () => void
  onSaveForMe: () => Promise<void>
  onSaveForEveryone?: () => Promise<void>
}

/**
 * Layout-agnostic column visibility/order control: drag-to-reorder rows with
 * visibility toggles, quick show/hide shortcuts, and preference persistence
 * (personal or global). Shared by the table toolbar and the card/kanban field
 * pickers; consumers derive `managedIds`/`labelById` from their own source.
 */
export function ViewOptionsPanel({
  label = "View",
  sectionLabel = "Columns",
  managedIds,
  labelById,
  hiddenIds,
  isDirty,
  isSaving,
  isAdmin,
  onOrderChange,
  onToggleVisibility,
  onShowAll,
  onHideAllExcept,
  onReset,
  onSaveForMe,
  onSaveForEveryone,
}: ViewOptionsPanelProps) {
  const [open, setOpen] = React.useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!managedIds.length) {
    // No manageable columns — still render a disabled trigger so the user
    // knows view settings exists, rather than hiding it entirely.
    return (
      <Button variant="outline" size="sm" className="dy-flex" disabled>
        <SlidersHorizontal className="dy-h-4 dy-w-4" />
        {label}
      </Button>
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = managedIds.indexOf(String(active.id))
    const newIndex = managedIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    onOrderChange(arrayMove(managedIds, oldIndex, newIndex))
  }

  const visibleCount = managedIds.length - hiddenIds.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="dy-flex">
          <SlidersHorizontal className="dy-h-4 dy-w-4" />
          {label}
          {isDirty ? <span aria-hidden className="dy-h-1.5 dy-w-1.5 dy-rounded-full dy-bg-primary" /> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="dy-w-80 dy-space-y-3 dy-p-3">
        <div className="dy-flex dy-items-center dy-justify-between">
          <p className="dy-text-xs dy-font-semibold">{sectionLabel}</p>
          <div className="dy-flex dy-items-center dy-gap-1">
            <Button variant="ghost" size="sm" className="dy-h-6 dy-px-2 dy-text-[10px]" onClick={onShowAll}>
              Show all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="dy-h-6 dy-px-2 dy-text-[10px]"
              onClick={() => onHideAllExcept(managedIds.find((id) => !hiddenIds.includes(id)))}
            >
              Hide all
            </Button>
          </div>
        </div>

        <div className="dy-max-h-[240px] dy-overflow-y-auto dy-pr-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
            <SortableContext items={managedIds} strategy={verticalListSortingStrategy}>
              <div className="dy-space-y-1">
                {managedIds.map((id) => (
                  <SortableColumnRow
                    key={id}
                    id={id}
                    label={labelById.get(id) ?? id}
                    visible={!hiddenIds.includes(id)}
                    onToggle={(visible) => onToggleVisibility(id, visible)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <Separator />

        <div className="dy-flex dy-flex-col dy-gap-2">
          <div className="dy-grid dy-grid-cols-2 dy-gap-2">
            <Button
              size="sm"
              className="dy-h-7 dy-text-[10px]"
              disabled={isSaving || (!isDirty && !hiddenIds.length)}
              onClick={() => void onSaveForMe()}
            >
              Save for Me
            </Button>
            {isAdmin && onSaveForEveryone ? (
              <Button
                size="sm"
                variant="secondary"
                className="dy-h-7 dy-text-[10px]"
                disabled={isSaving || (!isDirty && !hiddenIds.length)}
                onClick={() => void onSaveForEveryone()}
              >
                Save for Everyone
              </Button>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="dy-h-7 dy-w-full dy-text-[10px]"
            disabled={isSaving}
            onClick={onReset}
          >
            <RotateCcw className="dy-mr-1 dy-h-3 dy-w-3" />
            Reset to Default
          </Button>
          <p className="dy-text-[10px] dy-text-muted-foreground">
            Drag to reorder · {visibleCount} of {managedIds.length} shown
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SortableColumnRow({
  id,
  label,
  visible,
  onToggle,
}: {
  id: string
  label: string
  visible: boolean
  onToggle: (visible: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "dy-flex dy-items-center dy-gap-2.5 dy-rounded-lg dy-border dy-border-border/60 dy-bg-background dy-p-1.5 dy-shadow-sm dy-transition-all",
        isDragging && "dy-opacity-50 dy-border-primary",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${label}`}
        className="dy-cursor-grab active:dy-cursor-grabbing dy-p-0.5 dy-text-muted-foreground/60 hover:dy-text-foreground"
      >
        <GripVertical className="dy-h-3.5 dy-w-3.5" />
      </button>
      <Checkbox checked={visible} onCheckedChange={(value) => onToggle(!!value)} />
      <span className="dy-min-w-0 dy-flex-1 dy-truncate dy-text-xs dy-font-medium">{label}</span>
    </div>
  )
}

// Re-exported so layouts can render the same affordance in headers.
export { ListChecks as ViewOptionsIcon }
