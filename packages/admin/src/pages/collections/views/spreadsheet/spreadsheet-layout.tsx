import * as React from "react"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type { ColumnDef, SortingState } from "@tanstack/react-table"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { Save, Undo2 } from "lucide-react"

import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { useDyrected } from "../../../../providers/dyrected-context"
import { normalizeOptions } from "../build-view-columns"
import { evaluateAccess } from "../system-actions"
import { useColumnPreferences } from "../use-column-preferences"
import { DataTableViewOptions } from "../table/data-table-view-options"
import type { SerializedAction, SerializedView } from "../types"
import { DataGrid } from "./data-grid"
import type { CellVariantMeta, DataGridTableMeta } from "./data-grid-types"

export interface SpreadsheetLayoutProps {
  slug: string
  schema: any
  view: SerializedView
  data: Record<string, any>[]
  isLoading?: boolean
  client: unknown
  schemas: unknown
  resolvePreview?: (doc: Record<string, any>) => string | null
  hasDetail?: boolean
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
}

/** Maps a Dyrected field to the grid editor variant it can support inline. */
function cellVariantFor(field: any): Pick<CellVariantMeta, "variant" | "options"> {
  switch (field?.type) {
    case "text":
    case "email":
    case "url":
    case "icon":
      return { variant: "text" }
    case "number":
      return { variant: "number" }
    case "boolean":
      return { variant: "checkbox" }
    case "select":
    case "radio":
      return { variant: "select", options: normalizeOptions(field) }
    case "multiSelect":
      return { variant: "multiSelect", options: normalizeOptions(field) }
    case "date":
    case "datetime":
      return { variant: "date" }
    case "textarea":
    case "richText":
      return { variant: "longText" }
    default:
      // Relationships, media, json/blocks/objects open in the document editor.
      return { variant: "readonly" }
  }
}

const NEW_ROW_PREFIX = "__new__"

interface PendingNewRow {
  __tempId: string
  values: Record<string, unknown>
}

type PendingUpdates = Record<string, Record<string, unknown>>

/**
 * Spreadsheet layout — an editable data-grid (adapted from the tablecn
 * data-grid) wired to the Dyrected schema. Edits accumulate locally and are
 * committed as an explicit batch, so nothing writes until you hit Save.
 */
export function SpreadsheetLayout({
  slug,
  schema,
  view,
  data,
  isLoading,
}: SpreadsheetLayoutProps) {
  const { client, user } = useDyrected()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [updates, setUpdates] = React.useState<PendingUpdates>({})
  const [newRows, setNewRows] = React.useState<PendingNewRow[]>([])
  const [sorting, setSorting] = React.useState<SortingState>(
    view.sort ? [{ id: view.sort.field, desc: view.sort.direction === "desc" }] : [],
  )
  const [globalFilter, setGlobalFilter] = React.useState("")

  const canUpdate = React.useMemo(() => evaluateAccess(schema?.access?.update, user), [schema, user])

  const managedColumnIds = React.useMemo(() => {
    const fieldsByName = new Map<string, any>((schema?.fields ?? []).map((f: any) => [f.name, f]))
    const requested = view.columns?.length ? view.columns : defaultSpreadsheetOrder(schema)
    const validIds = requested.filter((name: string) => fieldsByName.has(name))
    return validIds.length ? validIds : requested
  }, [schema, view.columns])

  const preferences = useColumnPreferences({
    slug,
    viewSlug: view.slug,
    columnIds: managedColumnIds,
  })

  const columns = React.useMemo<ColumnDef<any, any>[]>(() => {
    const fieldsByName = new Map<string, any>((schema?.fields ?? []).map((f: any) => [f.name, f]))
    return preferences.preferences.order
      .filter((id) => !preferences.preferences.hidden.includes(id))
      .map((fieldName) => {
        const field = fieldsByName.get(fieldName)
        if (!field) return null
        return {
          id: fieldName,
          accessorKey: fieldName,
          header: field.label || fieldName,
          enableSorting: true,
          meta: {
            label: field.label || fieldName,
            cell: cellVariantFor(field),
            __readOnly: !canUpdate || !!field.admin?.readOnly,
          },
        } satisfies ColumnDef<any, any>
      })
      .filter(Boolean) as ColumnDef<any, any>[]
  }, [schema, canUpdate, preferences.preferences.order, preferences.preferences.hidden])

  /** Server rows merged with pending edits, followed by unsaved new rows. */
  const gridData = React.useMemo(() => {
    const editedDocs = (data ?? []).map((doc) => {
      const docUpdates = updates[String(doc.id)]
      return docUpdates ? { ...doc, ...docUpdates } : doc
    })
    return [
      ...editedDocs,
      ...newRows.map(({ __tempId, values }) => ({ ...values, id: __tempId })),
    ]
  }, [data, updates, newRows])

  const table = useReactTable({
    data: gridData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getRowId: (row) => String(row.id),
    globalFilterFn: (row, _columnId, filterValue) => {
      const needle = String(filterValue ?? "").toLowerCase()
      if (!needle) return true
      return Object.values(row.original ?? {}).some(
        (value) => typeof value === "string" && value.toLowerCase().includes(needle),
      )
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const orderedColumnIds = React.useMemo(
    () =>
      preferences.preferences.order.filter(
        (id) => !preferences.preferences.hidden.includes(id) && !!table.getColumn(id),
      ),
    [preferences.preferences.order, preferences.preferences.hidden, table],
  )

  const invalidate = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
    await queryClient.invalidateQueries({ queryKey: ["operational-view-metrics", slug] })
  }, [queryClient, slug])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error("Dyrected client unavailable")
      const collection = client.collection(slug)
      for (const [id, changes] of Object.entries(updates)) {
        await collection.update(id, changes)
      }
      for (const { __tempId: _omit, values } of newRows) {
        await collection.create(values)
      }
      return { updated: Object.keys(updates).length, created: newRows.length }
    },
    onSuccess: async ({ updated, created }) => {
      setUpdates({})
      setNewRows([])
      await invalidate()
      toast.success(
        [
          updated ? `Updated ${updated} ${updated === 1 ? "entry" : "entries"}` : null,
          created ? `Created ${created} ${created === 1 ? "entry" : "entries"}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      )
    },
    onError: (error: Error) => {
      toast.error("Failed to save changes", { description: error.message })
    },
  })

  /**
   * Routes a cell commit either onto a new row's draft or into the pending
   * per-document update set. Reverting to the server value drops the edit.
   */
  const handleDataUpdate = React.useCallback(
    (event: { rowIndex: number; columnId: string; value: unknown }) => {
      const row = gridData[event.rowIndex]
      if (!row) return
      const rowId = String(row.id)

      if (rowId.startsWith(NEW_ROW_PREFIX)) {
        setNewRows((prev) =>
          prev.map((candidate) =>
            candidate.__tempId === rowId
              ? { ...candidate, values: { ...candidate.values, [event.columnId]: event.value } }
              : candidate,
          ),
        )
        return
      }

      setUpdates((prev) => {
        const previousRow = (data ?? []).find((doc) => String(doc.id) === rowId)
        const merged = { ...prev[rowId], [event.columnId]: event.value }
        if (previousRow && previousRow[event.columnId] === event.value) {
          delete merged[event.columnId]
        }
        if (Object.keys(merged).length === 0) {
          if (!(rowId in prev)) return prev
          const { [rowId]: _removed, ...rest } = prev
          return rest
        }
        if (prev[rowId] && sameEntries(prev[rowId], merged)) return prev
        return { ...prev, [rowId]: merged }
      })
    },
    [gridData, data],
  )

  const tableMeta: DataGridTableMeta<any> = React.useMemo(
    () => ({
      readOnly: !canUpdate,
      onDataUpdate: handleDataUpdate,
      onOpenDoc: (docId) => navigate(`/collections/${slug}/${docId}/edit`),
    }),
    [canUpdate, handleDataUpdate, navigate, slug],
  )

  const hasPendingChanges =
    Object.keys(updates).length > 0 ||
    newRows.some((row) => Object.keys(row.values).length > 0)

  const handleAddRow = React.useCallback(() => {
    setNewRows((prev) => [...prev, { __tempId: `${NEW_ROW_PREFIX}${Date.now()}-${prev.length}`, values: {} }])
  }, [])

  const handleDiscard = React.useCallback(() => {
    setUpdates({})
    setNewRows([])
  }, [])

  if (isLoading) {
    return (
      <div className="dy-space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="dy-h-9 dy-animate-pulse dy-rounded-md dy-bg-muted" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="dy-flex dy-flex-col dy-gap-3">
      <div className="dy-flex dy-w-full dy-items-start dy-justify-between dy-gap-2">
        <div className="dy-w-40 lg:dy-w-56">
          <Input
            size="sm"
            placeholder="Search..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="dy-border-dashed dy-bg-muted/40 hover:dy-bg-muted/60 focus-visible:dy-bg-background"
          />
        </div>
        <DataTableViewOptions
          table={table}
          preferences={preferences.preferences}
          isDirty={preferences.isDirty}
          isSaving={preferences.isSaving}
          isAdmin={preferences.isAdmin}
          onOrderChange={preferences.setOrder}
          onToggleVisibility={preferences.toggleVisibility}
          onShowAll={preferences.showAll}
          onHideAllExcept={preferences.hideAllExcept}
          onReset={preferences.reset}
          onSaveForMe={preferences.saveForMe}
          onSaveForEveryone={preferences.isAdmin ? preferences.saveForEveryone : undefined}
        />
      </div>

      <DataGrid
        table={table}
        columnIds={orderedColumnIds}
        tableMeta={tableMeta}
        readOnly={!canUpdate}
        onRowAdd={canUpdate ? handleAddRow : undefined}
      />

      {!canUpdate ? (
        <p className="dy-text-xs dy-text-muted-foreground">
          You have read-only access to this collection.
        </p>
      ) : null}

      {hasPendingChanges ? (
        <div className="dy-fixed dy-inset-x-0 dy-bottom-4 dy-z-50 dy-mx-auto dy-flex dy-w-fit dy-items-center dy-gap-3 dy-rounded-xl dy-border dy-bg-card dy-px-4 dy-py-2.5 dy-shadow-lg">
          <span className="dy-text-xs dy-font-medium dy-text-muted-foreground">
            Unsaved changes in this grid
          </span>
          <div className="dy-flex dy-items-center dy-gap-2">
            <Button variant="outline" size="sm" className="dy-h-8 dy-text-xs" onClick={handleDiscard} disabled={saveMutation.isPending}>
              <Undo2 className="dy-mr-1.5 dy-h-3.5 dy-w-3.5" />
              Discard
            </Button>
            <Button size="sm" className="dy-h-8 dy-text-xs" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <span className="dy-mr-1.5 dy-inline-block dy-h-3 dy-w-3 dy-animate-spin dy-rounded-full dy-border-2 dy-border-current dy-border-t-transparent" />
              ) : (
                <Save className="dy-mr-1.5 dy-h-3.5 dy-w-3.5" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function defaultSpreadsheetOrder(schema: any): string[] {
  return (schema?.fields ?? [])
    .filter((field: any) => !!field.name && !field.admin?.hidden && field.type !== "join" && field.type !== "row")
    .slice(0, 12)
    .map((field: any) => field.name)
}

function sameEntries(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  return aKeys.length === bKeys.length && aKeys.every((key) => a[key] === b[key])
}
