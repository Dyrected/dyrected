import * as React from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { toast } from "sonner"

import { useDyrected } from "../../../../providers/dyrected-context"
import { KanbanCard } from "./kanban-card"
import { KanbanColumn } from "./kanban-column"
import type { SerializedAction, SerializedView } from "../types"

export interface KanbanGroup {
  /** Raw group value written back to the `groupBy` field. */
  value: string
  label: string
  toneClass?: string
  docs: Record<string, any>[]
}

export interface KanbanLayoutProps {
  slug: string
  schema: any
  view: SerializedView
  data: Record<string, any>[]
  isLoading?: boolean
  client: unknown
  schemas: unknown
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
}

const COLUMN_TONES = [
  "dy-bg-sky-500",
  "dy-bg-amber-500",
  "dy-bg-emerald-500",
  "dy-bg-violet-500",
  "dy-bg-rose-500",
]

/** Sentinel group for docs whose `groupBy` value is empty. */
const UNASSIGNED = "__unassigned__"

/**
 * Kanban board layout — columns generated from the view's `groupBy` field and
 * drag-and-drop status transitions built on the ReUI kanban architecture
 * (@dnd-kit DndContext + SortableContext).
 *
 * A drop commits an optimistic group change, then PATCHes the document so the
 * write flows through the standard lifecycle-hook pipeline.
 */
export function KanbanLayout({
  slug,
  schema,
  view,
  data,
  isLoading,
  client,
  schemas,
  actions,
  onRunAction,
}: KanbanLayoutProps) {
  const { client: dyrected } = useDyrected()
  const groupField = view.groupBy ?? ""
  const rowActions = React.useMemo(
    () => actions.filter((action) => (action.type ?? "row") === "row"),
    [actions],
  )

  const columns = React.useMemo(() => deriveGroups(groupField, schema), [groupField, schema])

  /**
   * Local draft for in-flight drags only — server data stays the source of
   * truth. `moves` holds optimistic cross-column transitions; `order` holds
   * cosmetic within-column ordering.
   */
  const [moves, setMoves] = React.useState<Record<string, string>>({})
  const [order, setOrder] = React.useState<Record<string, string[]>>({})

  const board = React.useMemo(() => {
    const groups = buildBoard(columns, data ?? [], groupField!, moves)
    return applyOrder(groups, order)
  }, [columns, data, groupField, moves, order])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findGroupOf = React.useCallback(
    (docId: string) => board.find((group) => group.docs.some((doc) => String(doc.id) === docId))?.value,
    [board],
  )

  const handleDragEnd = React.useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const activeId = String(active.id)
      const overId = String(over.id)

      // Dropping onto a column body itself also counts as a group move.
      const targetGroup =
        board.find((group) => group.value === overId) ??
        board.find((group) => group.docs.some((doc) => String(doc.id) === overId))
      if (!targetGroup) return

      const sourceValue = findGroupOf(activeId)
      if (!sourceValue) return

      if (sourceValue === targetGroup.value && activeId !== overId) {
        // Cosmetic reorder within the same column.
        setOrder((prev) => ({
          ...prev,
          [sourceValue]: reorderIds(board, sourceValue, activeId, overId),
        }))
        return
      }

      if (sourceValue === targetGroup.value) return

      // Optimistic cross-column move.
      setMoves((prev) => ({ ...prev, [activeId]: targetGroup.value }))

      if (targetGroup.value === UNASSIGNED) return

      try {
        if (!dyrected) throw new Error("Dyrected client unavailable")
        await (dyrected as any).collection(slug).update(activeId, {
          [groupField!]: coerceGroupValue(targetGroup.value, groupField, schema),
        })
        // Drop the now-redundant override once the server has caught up.
        setMoves((prev) => {
          if (prev[activeId] !== targetGroup.value) return prev
          const { [activeId]: _resolved, ...rest } = prev
          return rest
        })
      } catch (error: any) {
        toast.error("Move failed", { description: error?.message ?? "Could not save the new status." })
        setMoves((prev) => {
          if (prev[activeId] !== targetGroup.value) return prev
          const { [activeId]: _reverted, ...rest } = prev
          return rest
        })
      }
    },
    [board, findGroupOf, dyrected, slug, groupField, schema],
  )

  const renderCard = React.useCallback(
    (doc: Record<string, any>) => (
      <KanbanCard
        key={String(doc.id)}
        slug={slug}
        doc={doc}
        schema={schema}
        client={client}
        schemas={schemas}
        view={view}
        rowActions={rowActions}
        onRunAction={onRunAction}
      />
    ),
    [slug, schema, client, schemas, view, rowActions, onRunAction],
  )

  if (!groupField) {
    return (
      <p className="dy-rounded-md dy-border dy-border-dashed dy-p-8 dy-text-center dy-text-sm dy-text-muted-foreground">
        This kanban view needs a <code className="dy-font-mono">groupBy</code> field configured.
      </p>
    )
  }

  if (isLoading) {
    return (
      <div className="dy-flex dy-gap-4 dy-overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="dy-h-72 dy-w-72 dy-animate-pulse dy-rounded-md dy-bg-muted" style={{ opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="dy-flex dy-gap-4 dy-overflow-x-auto dy-pb-2">
        {board.map((group) => (
          <KanbanColumn key={group.value} group={group} renderCard={renderCard} />
        ))}
      </div>
    </DndContext>
  )
}

/** Columns come from the field's declared options; falls back to observed values. */
function deriveGroups(groupField: string | undefined, schema: any): Array<{ value: string; label: string }> {
  if (!groupField) return []
  const field = (schema?.fields ?? []).find((candidate: any) => candidate.name === groupField)

  if (field?.type === "boolean") {
    return [
      { value: "true", label: field.label || "Yes" },
      { value: "false", label: "No" },
    ]
  }

  const options = Array.isArray(field?.options) ? field.options : []
  const mapped = options.map((option: any) =>
    typeof option === "string"
      ? { value: option, label: option }
      : { value: String(option.value), label: String(option.label ?? option.value) },
  )
  return mapped
}

/** Builds board columns from declared options, honoring optimistic move overrides. */
function buildBoard(
  columns: Array<{ value: string; label: string }>,
  data: Record<string, any>[],
  groupField: string,
  moves: Record<string, string>,
): KanbanGroup[] {
  const groups: KanbanGroup[] = columns.map((column, index) => ({
    ...column,
    toneClass: COLUMN_TONES[index % COLUMN_TONES.length],
    docs: [],
  }))

  const byValue = new Map(groups.map((group) => [group.value, group]))
  let unassigned: Record<string, any>[] | null = null

  const groupForValue = (value: string): KanbanGroup | null => {
    const known = byValue.get(value)
    if (known) return known
    // Undeclared value — give it its own column so nothing disappears.
    const extra: KanbanGroup = {
      value,
      label: value,
      toneClass: COLUMN_TONES[groups.length % COLUMN_TONES.length],
      docs: [],
    }
    groups.push(extra)
    byValue.set(value, extra)
    return extra
  }

  for (const doc of data) {
    const overridden = moves[String(doc.id)]
    const raw = overridden ?? doc[groupField]
    if (raw === null || raw === undefined || raw === "") {
      (unassigned ??= []).push(doc)
      continue
    }
    groupForValue(String(raw))?.docs.push(doc)
  }

  if (unassigned?.length) {
    groups.push({
      value: UNASSIGNED,
      label: "Unassigned",
      toneClass: "dy-bg-muted-foreground/40",
      docs: unassigned,
    })
  }

  return groups
}

/** Applies cosmetic within-column ordering on top of the derived board. */
function applyOrder(groups: KanbanGroup[], order: Record<string, string[]>): KanbanGroup[] {
  return groups.map((group) => {
    const ids = order[group.value]
    if (!ids?.length) return group
    const byId = new Map(group.docs.map((doc) => [String(doc.id), doc]))
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as Record<string, any>[]
    for (const doc of group.docs) {
      if (!ids.includes(String(doc.id))) ordered.push(doc)
    }
    return { ...group, docs: ordered }
  })
}

function reorderIds(board: KanbanGroup[], columnValue: string, activeId: string, overId: string): string[] {
  const docs = board.find((group) => group.value === columnValue)?.docs ?? []
  const ids = docs.map((doc) => String(doc.id))
  const fromIndex = ids.indexOf(activeId)
  const toIndex = ids.indexOf(overId)
  if (fromIndex === -1 || toIndex === -1) return ids
  const next = [...ids]
  next.splice(fromIndex, 1)
  next.splice(toIndex, 0, activeId)
  return next
}

function coerceGroupValue(value: string, groupField: string, schema: any): unknown {
  const field = (schema?.fields ?? []).find((candidate: any) => candidate.name === groupField)
  if (field?.type === "boolean") return value === "true"
  return value
}
