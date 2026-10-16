import * as React from "react"
import type { PaginationState, SortingState } from "@tanstack/react-table"
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table"

import { useSearchParams } from "react-router-dom"
import { Checkbox } from "../../../../components/ui/checkbox"
import { usePublishViewData } from "../../../../hooks/use-publish-view-data"
import type { ViewDataHandlers, ViewDataSlice } from "../../../../providers/view-controller"
import { DataTable } from "./data-table"
import { DataTableToolbar } from "./data-table-toolbar"
import { DataTableViewOptions } from "./data-table-view-options"
import { GroupedTableView } from "./grouped-table-view"
import { getGroupableFields, useTableGroups } from "./use-table-groups"
import { buildViewColumns } from "../build-view-columns"
import { BulkActionBar } from "../bulk-action-bar"
import { useColumnPreferences } from "../use-column-preferences"
import { ExportMenu } from "../view-io-actions"
import { SkeletonTable } from "../view-skeletons"
import { useLayoutActions } from "../use-layout-actions"
import { loadToolbarState, persistToolbarState } from "../toolbar-persistence"
import { resolveViewSort } from "../resolve-view-filter"
import { useViewToolbarState } from "../toolbar/use-view-toolbar-state"
import { useViewData } from "../use-view-data"
import { getToolbarStateKey, getLegacyToolbarStateKey } from "../view-preference-keys"
import type { SerializedView } from "../types"

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
}: TableLayoutProps) {
  const { actions, onRunAction, isRunningAction } = useLayoutActions()
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
  const getInitialGroupBy = (): string | undefined => {
    const urlGroupBy = searchParams.get("groupBy")
    if (urlGroupBy) {
      return urlGroupBy === "none" ? undefined : urlGroupBy
    }
    return view.groupBy || undefined
  }

  const [pagination, setPagination] = React.useState<PaginationState>(getInitialPagination)
  const [sorting, setSorting] = React.useState<SortingState>(getInitialSorting)
  const toolbar = useViewToolbarState({
    slug,
    viewSlug: view.slug,
    schema,
    baseFilter: view.filter,
    onFilterChange: () => setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 })),
  })
  const {
    columnFilters,
    setColumnFilters: handleColumnFiltersChange,
    joinOperator,
    setJoinOperator: handleJoinOperatorChange,
    search: globalFilter,
    setSearch: setGlobalFilter,
    serverWhere,
  } = toolbar
  const [groupBy, setGroupBy] = React.useState<string | undefined>(getInitialGroupBy)
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})

  // Synchronize groupBy when the active view changes
  React.useEffect(() => {
    const urlGroupBy = searchParams.get("groupBy")
    if (urlGroupBy) {
      setGroupBy(urlGroupBy === "none" ? undefined : urlGroupBy)
    } else {
      setGroupBy(view.groupBy || undefined)
    }
  }, [view.groupBy, view.slug, searchParams])

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

  const rowActions = React.useMemo(
    () => actions.filter((action) => (action.type ?? "row") === "row"),
    [actions],
  )

  const groupableFields = React.useMemo(() => getGroupableFields(schema), [schema])
  const groupByOptions = React.useMemo(
    () => groupableFields.map((f) => ({ value: f.name, label: f.label })),
    [groupableFields],
  )

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
  }, [view.columns, schema])

  const columnPreferences = useColumnPreferences({
    slug,
    viewSlug: view.slug,
    columnIds: allColumnIds,
    defaultHidden: defaultHiddenIds,
    variant: "table",
  })

  const columns = React.useMemo(() => {
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
          size: 40,
          minSize: 40,
          maxSize: 40,
          enableResizing: false,
          header: ({ table }: any) => (
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
          cell: ({ row }: any) => (
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

  // Keep URL in sync with sort / pagination / groupBy (replace, not push).
  // Filters, search and match logic are owned by the shared toolbar state.
  React.useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        const sortStr = sorting.map((s) => `${s.desc ? "-" : ""}${s.id}`).join(",")
        if (sortStr) next.set("sort", sortStr)
        else next.delete("sort")
        if (groupBy) next.set("groupBy", groupBy)
        else next.delete("groupBy")
        const pageStr = String(pagination.pageIndex + 1)
        const limitStr = String(pagination.pageSize)
        if (pagination.pageIndex > 0) next.set("page", pageStr)
        else next.delete("page")
        if (pagination.pageSize !== 20) next.set("limit", limitStr)
        else next.delete("limit")
        if (next.toString() === prev.toString()) return prev
        return next
      },
      { replace: true },
    )
    // Mirror to sessionStorage as fallback when URL is shared without params.
    // Filters and join logic are persisted by the shared toolbar state.
    persistToolbarState(toolbarStateKey, { sorting, pageSize: pagination.pageSize })
  }, [sorting, groupBy, pagination.pageIndex, pagination.pageSize, setSearchParams, toolbarStateKey])

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
    search: globalFilter,
    sort: serverSort,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  })

  const {
    isGrouped,
    groupStates,
    isPending: isGroupPending,
    isFetching: isGroupFetching,
  } = useTableGroups({
    slug,
    view,
    schema,
    groupField: groupBy,
    filter: serverWhere,
    search: globalFilter,
    sort: serverSort,
  })

  const [columnSizing, setColumnSizing] = React.useState<Record<string, number>>(
    () => columnPreferences.preferences.sizing ?? {},
  )

  React.useEffect(() => {
    if (columnPreferences.preferences.sizing) {
      setColumnSizing(columnPreferences.preferences.sizing)
    }
  }, [columnPreferences.preferences.sizing])

  const handleColumnSizingChange = React.useCallback(
    (updater: any) => {
      setColumnSizing((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        columnPreferences.setSizing(next)
        return next
      })
    },
    [columnPreferences],
  )

  const table = useReactTable({
    data: serverDocs,
    columns,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onColumnSizingChange: handleColumnSizingChange,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnOrder,
      columnVisibility,
      pagination,
      columnSizing,
    },
    onSortingChange: (updater) => {
      handleSortingChange(updater as any)
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    onColumnFiltersChange: handleColumnFiltersChange,
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

  const publishedDocs = React.useMemo(
    () => (isGrouped ? groupStates.flatMap((group) => group.docs) : serverDocs),
    [isGrouped, groupStates, serverDocs],
  )
  const dataSlice = React.useMemo<ViewDataSlice>(
    () => ({
      documents: publishedDocs,
      total: isGrouped ? groupStates.reduce((sum, group) => sum + group.total, 0) : total,
      isLoading: isGrouped ? isGroupPending : isPending,
      isFetching: isGrouped ? isGroupFetching : isFetching,
      isTruncated: false,
      pagination: {
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        totalPages: isGrouped ? 1 : totalPages,
      },
      sort: sorting[0] ? { field: sorting[0].id, direction: sorting[0].desc ? "desc" : "asc" } : view.sort,
      where: serverWhere,
    }),
    [publishedDocs, isGrouped, groupStates, total, isGroupPending, isPending, isGroupFetching, isFetching, pagination, totalPages, sorting, view.sort, serverWhere],
  )
  const dataHandlers = React.useMemo<ViewDataHandlers>(
    () => ({
      setPage: (next) =>
        setPagination((prev) => (prev.pageIndex === next - 1 ? prev : { ...prev, pageIndex: Math.max(0, next - 1) })),
      setSort: (next) =>
        handleSortingChange(next ? [{ id: next.field, desc: next.direction === "desc" }] : []),
    }),
    [handleSortingChange],
  )
  usePublishViewData(dataSlice, dataHandlers)

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id as keyof typeof rowSelection])

  const isInitialLoad =
    !serverDocs.length &&
    !globalFilter &&
    !columnFilters.length &&
    (!isGrouped || !groupStates.some((g) => g.docs.length))

  const showSkeleton = isParentLoading || (isInitialLoad && (isGrouped ? isGroupPending : isPending))

  if (showSkeleton) {
    return <SkeletonTable columns={allColumnIds.length} rows={8} aria-busy="true" />
  }

  const collectionLabel = schema?.labels?.plural || schema?.labels?.singular || slug

  return (
    <div className="dy-flex dy-flex-col dy-gap-4" data-collection={slug}>
      <DataTableToolbar
        table={table}
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder={`Search ${collectionLabel}...`}
        groupBy={groupBy}
        groupByOptions={groupByOptions}
        onGroupByChange={(field) => {
          setGroupBy(field)
          setPagination((prev) => ({ ...prev, pageIndex: 0 }))
        }}
        isFetching={isGrouped ? isGroupFetching : isFetching}
        joinOperator={joinOperator}
        onJoinOperatorChange={handleJoinOperatorChange}
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

      {isGrouped ? (
        <GroupedTableView
          columns={columns}
          groupStates={groupStates}
          columnOrder={columnOrder}
          columnVisibility={columnVisibility}
          sorting={sorting}
          onSortingChange={(updater) => handleSortingChange(updater as any)}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
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
      ) : (
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
      )}
    </div>
  )
}

/** Fallback managed columns when the view declares none — mirrors buildViewColumns. */
function defaultManagedOrder(schema: any): string[] {
  return (schema?.fields ?? [])
    .filter((field: any) => !["textarea", "richText", "json", "blocks"].includes(field.type))
    .slice(0, 5)
    .map((field: any) => field.name)
}


