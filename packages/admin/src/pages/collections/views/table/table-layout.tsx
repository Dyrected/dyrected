import * as React from "react"
import type { ColumnDef, ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table"
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table"

import { useSearchParams } from "react-router-dom"
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
import { buildServerWhere } from "../build-server-where"
import { useViewData } from "../use-view-data"
import { getToolbarStateKey, getLegacyToolbarStateKey } from "../view-preference-keys"
import type { SerializedAction, SerializedView } from "../types"

export interface TableLayoutProps {
  slug: string
  schema: any
  view: SerializedView
  data?: Record<string, any>[]
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
 * Table layout for operational views — fully backend-driven with server-side
 * pagination, server-side sorting, and server-side filtering via Dyrected Where DSL.
 */
export function TableLayout({
  slug,
  schema,
  view,
  isLoading: isParentLoading,
  client,
  schemas,
  resolvePreview,
  hasDetail = true,
  actions,
  onRunAction,
  isRunningAction,
}: TableLayoutProps) {
  const toolbarStateKey = getToolbarStateKey(slug, view.slug)
  const legacyToolbarStateKey = getLegacyToolbarStateKey(slug, view.slug)
  const storedState = React.useMemo(
    () => loadToolbarState(toolbarStateKey) ?? loadToolbarState(legacyToolbarStateKey),
    [toolbarStateKey, legacyToolbarStateKey],
  )
  const [searchParams, setSearchParams] = useSearchParams()

  // URL is source of truth on first render — fallback to storage → view defaults.
  const getInitialPagination = (): PaginationState => {
    const pageParam = searchParams.get("page")
    const limitParam = searchParams.get("limit")
    if (pageParam || limitParam) {
      const pageIndex = pageParam ? Math.max(0, (Number(pageParam) || 1) - 1) : 0
      const pageSize = limitParam ? Math.max(1, Number(limitParam) || 20) : (storedState?.pageSize ?? 20)
      return { pageIndex, pageSize }
    }
    return { pageIndex: 0, pageSize: storedState?.pageSize ?? 20 }
  }
  const getInitialSorting = (): SortingState => {
    const sortParam = searchParams.get("sort")
    if (sortParam) {
      const parts = sortParam.split(",").filter(Boolean)
      const parsed = parts.map((p) => (p.startsWith("-") ? { id: p.slice(1), desc: true } : { id: p, desc: false }))
      if (parsed.length) return parsed as SortingState
    }
    if (storedState?.sorting) return storedState.sorting as SortingState
    return view.sort ? [{ id: view.sort.field, desc: view.sort.direction === "desc" }] : []
  }
  const getInitialFilters = (): ColumnFiltersState => {
    const f = searchParams.get("filters")
    if (f) {
      try {
        const parsed = JSON.parse(f)
        if (Array.isArray(parsed)) return parsed as ColumnFiltersState
      } catch {}
    }
    return (storedState?.columnFilters as ColumnFiltersState | undefined) ?? []
  }

  const [pagination, setPagination] = React.useState<PaginationState>(getInitialPagination)
  const [sorting, setSorting] = React.useState<SortingState>(getInitialSorting)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(getInitialFilters)
  const [rowSelection, setRowSelection] = React.useState({})

  const handleSortingChange = React.useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      setSorting((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        persistToolbarState(toolbarStateKey, { sorting: next })
        return next
      })
    },
    [toolbarStateKey],
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

  const rowActions = React.useMemo(
    () => actions.filter((action) => (action.type ?? "row") === "row"),
    [actions],
  )
  const searchColumnId = findTextColumn(view.columns, schema)

  /**
   * Managed columns are the schema-driven field columns; the select column
   * stays pinned ahead of the persisted order.
   */
  const { allColumnIds, defaultHiddenIds } = React.useMemo(() => {
    const fieldsByName = new Map<string, any>((schema?.fields ?? []).map((f: any) => [f.name, f]))
    const specified = (view.columns?.length ? view.columns : defaultManagedOrder(schema)).filter((name) =>
      fieldsByName.has(name),
    )
    const remaining = (schema?.fields ?? [])
      .map((f: any) => f.name)
      .filter((name: string) => !specified.includes(name) && fieldsByName.has(name))

    return {
      allColumnIds: [...specified, ...remaining],
      defaultHiddenIds: remaining,
    }
  }, [schema, view.columns])

  const columnPreferences = useColumnPreferences({
    slug,
    viewSlug: view.slug,
    columnIds: allColumnIds,
    defaultHidden: defaultHiddenIds,
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

  const serverSort = React.useMemo(() => {
    if (!sorting.length) {
      return view.sort ? resolveViewSort(view.sort) : undefined
    }
    const [first] = sorting
    return `${first.desc ? "-" : ""}${first.id}`
  }, [sorting, view.sort])

  const serverWhere = React.useMemo(() => {
    return buildServerWhere({
      baseFilter: resolveViewFilter(view.filter),
      columnFilters,
      searchColumnId,
      searchableFields: allColumnIds,
      schema,
    })
  }, [view.filter, columnFilters, searchColumnId, allColumnIds, schema])

  // Keep URL in sync with filter / sort / pagination (replace, not push).
  React.useEffect(() => {
    const next = new URLSearchParams(searchParams)
    const sortStr = sorting.map((s) => `${s.desc ? "-" : ""}${s.id}`).join(",")
    if (sortStr) next.set("sort", sortStr)
    else next.delete("sort")
    if (columnFilters.length) next.set("filters", JSON.stringify(columnFilters))
    else next.delete("filters")
    const pageStr = String(pagination.pageIndex + 1)
    const limitStr = String(pagination.pageSize)
    // Only store page/limit when non-default to keep URLs tidy, but always
    // store page when >1 so deep links work.
    if (pagination.pageIndex > 0) next.set("page", pageStr)
    else next.delete("page")
    if (pagination.pageSize !== 20) next.set("limit", limitStr)
    else next.delete("limit")
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
    // Mirror to sessionStorage as fallback when URL is shared without params.
    persistToolbarState(toolbarStateKey, { sorting, columnFilters, pageSize: pagination.pageSize })
  }, [sorting, columnFilters, pagination.pageIndex, pagination.pageSize, searchParams, setSearchParams, toolbarStateKey])

  const {
    data: serverDocs,
    total,
    totalPages,
    isPending,
    isFetching,
  } = useViewData({
    slug,
    viewSlug: view.slug,
    filter: serverWhere,
    sort: serverSort,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  })

  const table = useReactTable({
    data: serverDocs,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnOrder,
      columnVisibility,
      pagination,
    },
    onSortingChange: (updater) => {
      handleSortingChange(updater as any)
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    onColumnFiltersChange: (updater) => {
      handleColumnFiltersChange(updater)
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    onPaginationChange: (updater) => {
      setPagination((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        persistToolbarState(toolbarStateKey, { pageSize: next.pageSize })
        return next
      })
    },
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: totalPages,
    rowCount: total,
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id as keyof typeof rowSelection])

  if (isParentLoading || (isPending && !serverDocs.length)) {
    return <SkeletonTable columns={allColumnIds.length} rows={8} aria-busy="true" />
  }

  return (
    <div className="dy-flex dy-flex-col dy-gap-4" data-collection={slug}>
      <DataTableToolbar
        table={table}
        searchColumnId={searchColumnId}
        searchPlaceholder="Search..."
        isFetching={isFetching}
      >
        <ExportMenu
          slug={slug}
          schema={schema}
          findArgs={{ where: serverWhere, sort: serverSort }}
          currentDocs={serverDocs}
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
        isFetching={isFetching}
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
