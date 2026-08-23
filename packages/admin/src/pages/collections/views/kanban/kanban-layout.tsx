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
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { Search } from "lucide-react"

import { useDyrected } from "../../../../providers/dyrected-context"
import { useQueryClient } from "@tanstack/react-query"
import { Input } from "../../../../components/ui/input"
import { KanbanCard } from "./kanban-card"
import { KanbanColumn } from "./kanban-column"
import {
  UNASSIGNED,
  coerceGroupValue,
  deriveGroups,
  useKanbanGroups,
} from "./use-grouped-view-data"
import { buildViewColumns } from "../build-view-columns"
import { DataTableToolbar, FILTER_INPUT_CLASSES } from "../table/data-table-toolbar"
import { ViewOptionsPanel } from "../view-options-panel"
import { useColumnPreferences } from "../use-column-preferences"
import { loadToolbarState, persistToolbarState } from "../toolbar-persistence"
import { resolveViewFilter } from "../resolve-view-filter"
import { getToolbarStateKey, getLegacyToolbarStateKey } from "../view-preference-keys"
import { buildServerWhere } from "../build-server-where"
import type { SerializedAction, SerializedView } from "../types"
import { SkeletonKanbanBoard } from "../view-skeletons"

export interface KanbanGroup {
  /** Raw group value written back to the `groupBy` field. */
  value: string
  label: string
  toneClass?: string
  docs: Record<string, any>[]
  /** Server-side total (grouped mode); falls back to docs.length. */
  total?: number
  /** True when more pages exist server-side (grouped mode). */
  hasNextPage?: boolean
  isPending?: boolean
  isError?: boolean
  isFetchingMore?: boolean
  retry?: () => void
  loadMore?: () => void
}

export interface KanbanLayoutProps {
  slug: string
  schema: any
  view: SerializedView
  data?: Record<string, any>[]
  isLoading?: boolean
  client: unknown
  schemas: unknown
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
  /** Returns true while an action × selection is executing (drives loading states). */
  isRunningAction?: (action: SerializedAction, ids: string[]) => boolean
}

const COLUMN_TONES = [
  "dy-bg-sky-500",
  "dy-bg-amber-500",
  "dy-bg-emerald-500",
  "dy-bg-violet-500",
  "dy-bg-rose-500",
]

/**
 * Kanban board layout — columns generated from the view's `groupBy` field and
 * drag-and-drop status transitions built on the ReUI kanban architecture
 * (@dnd-kit DndContext + SortableContext).
 *
 * Cross-column drops persist through the view's `moveMode`: a direct PATCH of
 * the group field (default), or the configured `moveAction` so guarded
 * transitions reuse the server-side action pipeline.
 *
 * Filtering reuses the tablecn toolbar architecture headlessly (global search
 * plus faceted/operator filters), and per-user field visibility/order
 * preferences drive what each card renders.
 */
export function KanbanLayout({
  slug,
  schema,
  view,
  isLoading,
  client,
  schemas,
  actions,
  onRunAction,
  isRunningAction,
}: KanbanLayoutProps) {
  const { client: dyrected } = useDyrected()
  const queryClient = useQueryClient()
  const groupField = view.groupBy ?? ""
  const rowActions = React.useMemo(
    () => actions.filter((action) => (action.type ?? "row") === "row"),
    [actions],
  )

  /* ------------------------------------------------------ data + filtering */

  const toolbarStateKey = getToolbarStateKey(slug, view.slug, "kanban")
  const legacyToolbarStateKey = getLegacyToolbarStateKey(slug, view.slug, "kanban")
  const storedState = React.useMemo(
    () => loadToolbarState(toolbarStateKey) ?? loadToolbarState(legacyToolbarStateKey),
    [toolbarStateKey, legacyToolbarStateKey],
  )
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    (storedState?.columnFilters as ColumnFiltersState | undefined) ?? [],
  )

  const handleColumnFiltersChange = React.useCallback(
    (updater: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => {
      setColumnFilters((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        persistToolbarState(toolbarStateKey, { columnFilters: next })
        return next
      })
    },
    [toolbarStateKey],
  )

  const fieldsByName = React.useMemo(
    () => new Map<string, any>((schema?.fields ?? []).map((field: any) => [field.name, field])),
    [schema],
  )
  const managedIds = React.useMemo(
    () => (view.columns ?? []).filter((name) => fieldsByName.has(name)),
    [view.columns, fieldsByName],
  )

  const fieldPreferences = useColumnPreferences({
    slug,
    viewSlug: view.slug,
    columnIds: managedIds,
    variant: "kanban",
  })

  const visibleFieldIds = React.useMemo(
    () =>
      fieldPreferences.preferences.order.filter(
        (id) => !fieldPreferences.preferences.hidden.includes(id),
      ),
    [fieldPreferences.preferences],
  )

  const serverWhere = React.useMemo(() => {
    return buildServerWhere({
      baseFilter: resolveViewFilter(view.filter),
      columnFilters,
      search: globalFilter,
      searchableFields: managedIds.length ? managedIds : undefined,
      schema,
    })
  }, [view.filter, columnFilters, globalFilter, managedIds, schema])

  /**
   * Grouped mode fetches each column independently (paginated, parallel) with
   * the serverWhere filters applied to every column request.
   */
  const grouped = useKanbanGroups({
    slug,
    view,
    schema,
    groupField,
    filter: serverWhere,
  })
  const isGrouped = grouped.mode === "grouped"

  const docs = React.useMemo(() => {
    if (isGrouped) {
      return grouped.columns.flatMap((column) =>
        column.docs.map((doc) => ({ ...doc, __kanbanGroup: column.value })),
      )
    }
    return grouped.fallbackDocs
  }, [isGrouped, grouped.columns, grouped.fallbackDocs])

  const columns = React.useMemo(
    () => buildViewColumns({ schema, client, schemas }),
    [schema, client, schemas],
  )

  const table = useReactTable({
    data: docs,
    columns,
    state: { globalFilter, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: handleColumnFiltersChange,
    manualFiltering: true,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  /* --------------------------------------------------------- board state */

  const declaredGroups = React.useMemo(() => deriveGroups(groupField, schema), [groupField, schema])

  /**
   * Local draft for in-flight drags only — server data stays the source of
   * truth. `moves` holds optimistic cross-column transitions; `order` holds
   * cosmetic within-column ordering.
   */
  const [moves, setMoves] = React.useState<Record<string, string>>({})
  const [order, setOrder] = React.useState<Record<string, string[]>>({})

  const board = React.useMemo(() => {
    if (isGrouped) {
      let columns: KanbanGroup[] = grouped.columns.map((column, index) => ({
        value: column.value,
        label: column.label,
        toneClass: COLUMN_TONES[index % COLUMN_TONES.length],
        docs: column.docs,
        total: column.total,
        hasNextPage: column.hasNextPage,
        isPending: column.isPending,
        isError: column.isError,
        isFetchingMore: column.isFetchingMore,
        retry: column.retry,
        loadMore: column.loadMore,
      }))
      columns = applyGroupedMoves(columns, moves)
      return applyOrder(columns, order)
    }
    const groups = buildBoard(declaredGroups, docs, groupField!, moves)
    return applyOrder(groups, order)
  }, [isGrouped, grouped.columns, docs, moves, order, declaredGroups, groupField])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findGroupOf = React.useCallback(
    (docId: string) => board.find((group) => group.docs.some((doc) => String(doc.id) === docId))?.value,
    [board],
  )

  const revertMove = React.useCallback((docId: string, previous?: string) => {
    setMoves((prev) => {
      if (previous === undefined) {
        if (!(docId in prev)) return prev
        const { [docId]: _dropped, ...rest } = prev
        return rest
      }
      if (prev[docId] !== previous) return prev
      return { ...prev, [docId]: previous }
    })
  }, [])

  /** Runs the view's configured move action for one document. */
  const runMoveAction = React.useCallback(
    async (docId: string, nextValue: string): Promise<boolean> => {
      if (!dyrected) throw new Error("Dyrected client unavailable")
      const actionName = view.moveAction!
      await (dyrected as any).collection(slug).runAction(view.slug, actionName, {
        id: docId,
        input: { [groupField]: coerceGroupValue(nextValue, groupField, schema) },
      })
      await queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
      return true
    },
    [dyrected, slug, view.slug, view.moveAction, groupField, schema, queryClient],
  )

  const persistMove = React.useCallback(
    async (docId: string, nextValue: string): Promise<void> => {
      if (!dyrected) throw new Error("Dyrected client unavailable")
      await (dyrected as any).collection(slug).update(docId, {
        [groupField!]: coerceGroupValue(nextValue, groupField, schema),
      })
      await queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
    },
    [dyrected, slug, groupField, schema, queryClient],
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
        if (view.moveMode === "action") {
          if (!view.moveAction) throw new Error("This view's moveMode is \"action\" but no moveAction is configured.")
          await runMoveAction(activeId, targetGroup.value)
        } else {
          await persistMove(activeId, targetGroup.value)
        }
        // Drop the now-redundant override once the server has caught up.
        setMoves((prev) => {
          if (prev[activeId] !== targetGroup.value) return prev
          const { [activeId]: _resolved, ...rest } = prev
          return rest
        })
      } catch (error: any) {
        toast.error("Move failed", {
          description: error?.message ?? "Could not save the new status.",
        })
        revertMove(activeId, sourceValue)
      }
    },
    [board, findGroupOf, view.moveMode, view.moveAction, runMoveAction, persistMove, revertMove],
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
        isRunning={isRunningAction}
        fields={visibleFieldIds.length ? visibleFieldIds : undefined}
      />
    ),
    [slug, schema, client, schemas, view, rowActions, onRunAction, isRunningAction, visibleFieldIds],
  )

  if (!groupField) {
    return (
      <p className="dy-rounded-md dy-border dy-border-dashed dy-p-8 dy-text-center dy-text-sm dy-text-muted-foreground">
        This kanban view needs a <code className="dy-font-mono">groupBy</code> field configured.
      </p>
    )
  }

  if (isLoading) {
    // Schema-declared groups render as real headers so the board's shape is
    // visible before data lands; anonymous columns fill the fallback.
    return (
      <SkeletonKanbanBoard
        columns={declaredGroups.map((group, index) => ({
          label: group.label,
          toneClass: COLUMN_TONES[index % COLUMN_TONES.length],
        }))}
      />
    )
  }

  const collectionLabel = schema?.labels?.plural || schema?.labels?.singular || slug

  return (
    <div className="dy-space-y-4" data-collection={slug}>
      <div className="dy-flex dy-flex-wrap dy-items-center dy-gap-2">
        <div className="dy-relative dy-w-full sm:dy-max-w-xs">
          <Search className="dy-absolute dy-left-3 dy-top-1/2 dy--translate-y-1/2 dy-h-4 dy-w-4 dy-text-muted-foreground/60" />
          <Input
            size="sm"
            type="search"
            aria-label={`Search ${collectionLabel}`}
            placeholder={`Search ${collectionLabel}...`}
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className={`dy-pl-10 ${FILTER_INPUT_CLASSES}`}
          />
        </div>
        <DataTableToolbar table={table}>
          <ViewOptionsPanel
            label="Fields"
            managedIds={managedIds}
            labelById={labelByIdFrom(managedIds, fieldsByName)}
            hiddenIds={fieldPreferences.preferences.hidden}
            isDirty={fieldPreferences.isDirty}
            isSaving={fieldPreferences.isSaving}
            isAdmin={fieldPreferences.isAdmin}
            onOrderChange={fieldPreferences.setOrder}
            onToggleVisibility={fieldPreferences.toggleVisibility}
            onShowAll={fieldPreferences.showAll}
            onHideAllExcept={fieldPreferences.hideAllExcept}
            onReset={fieldPreferences.reset}
            onSaveForMe={fieldPreferences.saveForMe}
            onSaveForEveryone={
              fieldPreferences.isAdmin ? fieldPreferences.saveForEveryone : undefined
            }
          />
        </DataTableToolbar>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="dy-flex dy-gap-4 dy-overflow-x-auto dy-pb-2">
          {board.map((group) => (
            <KanbanColumn key={group.value} group={group} renderCard={renderCard} />
          ))}
        </div>
      </DndContext>
    </div>
  )
}

/** Field labels for the picker panel: declared label or raw field name. */
function labelByIdFrom(ids: string[], fieldsByName: Map<string, any>): Map<string, string> {
  const labels = new Map<string, string>()
  for (const id of ids) {
    const field = fieldsByName.get(id)
    labels.set(id, field?.label || id)
  }
  return labels
}

/**
 * Global matcher for card search: case-insensitive substring over the document
 * title plus primitive values of the view's configured columns.
 */
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

/** Applies optimistic drag moves on top of grouped mode columns. */
function applyGroupedMoves(columns: KanbanGroup[], moves: Record<string, string>): KanbanGroup[] {
  if (!Object.keys(moves).length) return columns
  const allDocs = new Map<string, Record<string, any>>()
  for (const col of columns) {
    for (const doc of col.docs) {
      allDocs.set(String(doc.id), doc)
    }
  }

  const byValue = new Map(columns.map((col) => [col.value, { ...col, docs: [...col.docs] }]))
  for (const [docId, targetValue] of Object.entries(moves)) {
    const doc = allDocs.get(docId)
    if (!doc) continue
    for (const col of byValue.values()) {
      col.docs = col.docs.filter((d) => String(d.id) !== docId)
    }
    const targetCol = byValue.get(targetValue)
    if (targetCol) {
      targetCol.docs.push(doc)
    }
  }
  return Array.from(byValue.values())
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
