import * as React from "react"
import type { ColumnDef, ColumnFiltersState, SortingState } from "@tanstack/react-table"
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Checkbox } from "../../../../components/ui/checkbox"
import { DataTable } from "./data-table"
import { DataTableToolbar } from "./data-table-toolbar"
import { DataTableViewOptions } from "./data-table-view-options"
import { buildViewColumns } from "../build-view-columns"
import { BulkActionBar } from "../bulk-action-bar"
import { useColumnPreferences } from "../use-column-preferences"
import { ExportMenu } from "../view-io-actions"
import { SkeletonTable } from "../view-skeletons"
import { loadToolbarState, persistToolbarState } from "../toolbar-persistence"
import { resolveViewFilter, resolveViewSort } from "../resolve-view-filter"
import type { SerializedAction, SerializedView } from "../types"

export interface TableLayoutProps {
  slug: string
  schema: any
  view: SerializedView
  data: Record<string, any>[]
  isLoading?: boolean
  client: unknown
  schemas: unknown
  /** Resolves the external preview URL for the primary column link, if configured. */
  resolvePreview?: (doc: Record<string, any>) => string | null
  /** Whether the collection exposes a read-only detail page. */
  hasDetail?: boolean
  /** Resolved + ordered actions (customs and built-ins) for this view. */
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
  /** Returns true while an action × selection is executing (drives loading states). */
  isRunningAction?: (action: SerializedAction, ids: string[]) => boolean
}

/**
 * Table layout for operational views — the tablecn architecture wired to the
 * Dyrected schema: faceted filter bar, sortable columns, selection with a
 * floating bulk-action bar, and inline row actions.
 */
export function TableLayout({
  slug,
  schema,
  view,
  data,
  isLoading,
  client,
  schemas,
  resolvePreview,
  hasDetail = true,
  actions,
  onRunAction,
  isRunningAction,
}: TableLayoutProps) {
  const toolbarStateKey = `view-toolbar:${slug}:${view.slug}`
  const storedState = React.useMemo(() => loadToolbarState(toolbarStateKey), [toolbarStateKey])

  const [sorting, setSorting] = React.useState<SortingState>(
    view.sort ? [{ id: view.sort.field, desc: view.sort.direction === "desc" }] : [],
  )
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    (storedState?.columnFilters as ColumnFiltersState | undefined) ?? [],
  )
  const [rowSelection, setRowSelection] = React.useState({})

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

  const rowActions = actions.filter((action) => (action.type ?? "row") === "row")
  const searchColumnId = findTextColumn(view.columns, schema)

  /**
   * Managed columns are the schema-driven field columns; the select column
   * stays pinned ahead of the persisted order.
   */
  const managedColumnIds = React.useMemo(() => {
    const fieldsByName = new Map<string, any>((schema?.fields ?? []).map((f: any) => [f.name, f]))
    return (view.columns?.length ? view.columns : defaultManagedOrder(schema)).filter((name) =>
      fieldsByName.has(name),
    )
  }, [schema, view.columns])

  const columnPreferences = useColumnPreferences({
    slug,
    viewSlug: view.slug,
    columnIds: managedColumnIds,
    fixedIds: ["select"],
  })

  const columns = React.useMemo<ColumnDef<any, any>[]>(() => {
    return buildViewColumns({
      schema,
      client,
      schemas,
      columns: view.columns,
      primaryLink: {
        slug,
        hasDetail,
        resolvePreview,
        actions: rowActions,
        onRunAction,
        isRunning: isRunningAction,
      },
      leadingColumns: [
        {
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected()
                  ? true
                  : table.getIsSomePageRowsSelected()
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          ),
          enableSorting: false,
          enableHiding: false,
        },
      ],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, client, schemas, JSON.stringify(view.columns), JSON.stringify(rowActions.map((a) => a.name)), slug, hasDetail, resolvePreview, onRunAction])

  const columnOrder = React.useMemo(
    () => ["select", ...columnPreferences.preferences.order.filter((id) => id !== "select")],
    [columnPreferences.preferences.order],
  )

  const columnVisibility = React.useMemo(() => {
    return Object.fromEntries(columnPreferences.preferences.hidden.map((id) => [id, false]))
  }, [columnPreferences.preferences.hidden])

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, columnFilters, rowSelection, columnOrder, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: handleColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: { pagination: { pageSize: storedState?.pageSize ?? 20 } },
  })

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id as keyof typeof rowSelection])

  /** Documents surviving search + all filter pills — the export "current" scope. */
  const filteredDocs = React.useMemo(
    () => table.getPrePaginationRowModel().rows.map((row) => row.original),
    [table],
  )

  if (isLoading) {
    return <SkeletonTable columns={managedColumnIds.length} rows={8} aria-busy="true" />
  }

  return (
    <div className="dy-flex dy-flex-col dy-gap-4" data-collection={slug}>
      <DataTableToolbar table={table} searchColumnId={searchColumnId} searchPlaceholder="Search...">
        <ExportMenu
          slug={slug}
          schema={schema}
          findArgs={{ where: resolveViewFilter(view.filter), sort: resolveViewSort(view.sort) }}
          currentDocs={filteredDocs}
        />
        <DataTableViewOptions
          table={table}
          preferences={columnPreferences.preferences}
          isDirty={columnPreferences.isDirty}
          isSaving={columnPreferences.isSaving}
          isAdmin={columnPreferences.isAdmin}
          onOrderChange={columnPreferences.setOrder}
          onToggleVisibility={columnPreferences.toggleVisibility}
          onShowAll={columnPreferences.showAll}
          onHideAllExcept={columnPreferences.hideAllExcept}
          onReset={columnPreferences.reset}
          onSaveForMe={columnPreferences.saveForMe}
          onSaveForEveryone={columnPreferences.isAdmin ? columnPreferences.saveForEveryone : undefined}
        />
      </DataTableToolbar>
      <DataTable
        table={table}
        actionBar={
          <BulkActionBar
            actions={actions}
            selectedIds={selectedIds}
            onRun={onRunAction}
            isRunning={isRunningAction}
            onClearSelection={() => setRowSelection({})}
          />
        }
      />
    </div>
  )
}

/** First text/email column usable as a global-search binding across layouts. */
export function findTextColumn(columns: string[] | undefined, schema: any): string | undefined {
  const fieldsByName = new Map<string, any>((schema?.fields ?? []).map((f: any) => [f.name, f]))
  const candidates = columns ?? [...fieldsByName.keys()]
  return candidates.find((name) => ["text", "email"].includes(fieldsByName.get(name)?.type))
}

/** Fallback managed columns when the view declares none — mirrors buildViewColumns. */
function defaultManagedOrder(schema: any): string[] {
  return (schema?.fields ?? [])
    .filter((field: any) => !["textarea", "richText", "json", "blocks"].includes(field.type))
    .slice(0, 5)
    .map((field: any) => field.name)
}
