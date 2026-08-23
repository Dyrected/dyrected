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
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { CSS } from "@dnd-kit/utilities"
import type { Table } from "@tanstack/react-table"
import { GripVertical, ListChecks, RotateCcw, SlidersHorizontal } from "lucide-react"

import { Button } from "../../../../components/ui/button"
import { Checkbox } from "../../../../components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover"
import { Separator } from "../../../../components/ui/separator"
import { cn } from "../../../../lib/utils"
import type { ColumnPreferences } from "../use-column-preferences"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
  preferences: ColumnPreferences
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
 * The toolbar's View control: drag-to-reorder columns with visibility toggles,
 * quick show/hide shortcuts, and preference persistence (personal or global).
 * Lives in the same right-hand toolbar slot as before.
 */
export function DataTableViewOptions<TData>({
  table,
  preferences,
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
}: DataTableViewOptionsProps<TData>) {
  const [open, setOpen] = React.useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const labelById = React.useMemo(() => {
    const labels = new Map<string, string>()
    for (const column of table.getAllColumns()) {
      const header = column.columnDef.header
      const metaLabel = (column.columnDef.meta as any)?.label
      const label =
        typeof header === "string" && header ? header : typeof metaLabel === "string" ? metaLabel : column.id
      labels.set(column.id, label)
    }
    return labels
  }, [table])

  // Only columns present in the managed preference list are draggable/toggleable;
  // pinned utility columns (select/actions) stay out of the panel.
  const managedIds = React.useMemo(
    () => preferences.order.filter((id) => !!labelById.get(id)),
    [preferences.order, labelById],
  )

  if (!managedIds.length) return null

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = managedIds.indexOf(String(active.id))
    const newIndex = managedIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    onOrderChange(arrayMove(managedIds, oldIndex, newIndex))
  }

  const visibleCount = managedIds.length - preferences.hidden.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="dy-hidden lg:dy-flex">
          <SlidersHorizontal className="dy-h-4 dy-w-4" />
          View
          {isDirty ? <span aria-hidden className="dy-h-1.5 dy-w-1.5 dy-rounded-full dy-bg-primary" /> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="dy-w-80 dy-space-y-3 dy-p-3">
        <div className="dy-flex dy-items-center dy-justify-between">
          <p className="dy-text-xs dy-font-semibold">Columns</p>
          <div className="dy-flex dy-items-center dy-gap-1">
            <Button variant="ghost" size="sm" className="dy-h-6 dy-px-2 dy-text-[10px]" onClick={onShowAll}>
              Show all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="dy-h-6 dy-px-2 dy-text-[10px]"
              onClick={() => onHideAllExcept(managedIds.find((id) => !preferences.hidden.includes(id)))}
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
                    visible={!preferences.hidden.includes(id)}
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
              disabled={isSaving || (!isDirty && !preferences.hidden.length)}
              onClick={() => void onSaveForMe()}
            >
              Save for Me
            </Button>
            {isAdmin && onSaveForEveryone ? (
              <Button
                size="sm"
                variant="secondary"
                className="dy-h-7 dy-text-[10px]"
                disabled={isSaving || (!isDirty && !preferences.hidden.length)}
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

export type { DataTableViewOptionsProps }