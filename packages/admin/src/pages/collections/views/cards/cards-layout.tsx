import * as React from "react"
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { useSearchParams } from "react-router-dom"
import { Button } from "../../../../components/ui/button"
import { CardGridItem } from "./card-grid-item"
import { GroupedCardsView } from "./grouped-cards-view"
import { SkeletonCardGrid } from "../view-skeletons"
import { buildViewColumns } from "../build-view-columns"
import { DataTableToolbar } from "../table/data-table-toolbar"
import { getGroupableFields, useTableGroups } from "../table/use-table-groups"
import { ViewOptionsPanel } from "../view-options-panel"
import { useColumnPreferences } from "../use-column-preferences"
import { loadToolbarState, persistToolbarState } from "../toolbar-persistence"
import { resolveViewFilter, resolveViewSort } from "../resolve-view-filter"
import { buildServerWhere } from "../build-server-where"
import { useViewData } from "../use-view-data"
import { getToolbarStateKey, getLegacyToolbarStateKey } from "../view-preference-keys"
import type { SerializedAction, SerializedView } from "../types"

export interface CardsLayoutProps {
  slug: string
  schema: any
  view: SerializedView
  data?: Record<string, any>[]
  isLoading?: boolean
  client: unknown
  schemas: unknown
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
}

/**
 * Cards layout for operational views — responsive grid with server-driven search,
 * grouping, server-side operator filters (DataTableToolbar), and pagination.
 */
export function CardsLayout({
  slug,
  schema,
  view,
  isLoading: isParentLoading,
  client,
  schemas,
  actions,
  onRunAction,
}: CardsLayoutProps) {
  const toolbarStateKey = getToolbarStateKey(slug, view.slug, "cards")
  const legacyToolbarStateKey = getLegacyToolbarStateKey(slug, view.slug, "cards")
  const storedState = React.useMemo(
    () => loadToolbarState(toolbarStateKey) ?? loadToolbarState(legacyToolbarStateKey),
    [toolbarStateKey, legacyToolbarStateKey],
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const getInitialFilters = (): ColumnFiltersState => {
    const f = searchParams.get("filters")
    if (f) {
      try {
        const parsed = JSON.parse(f)
        if (Array.isArray(parsed)) return parsed as ColumnFiltersState
      } catch {
        // ignore invalid json filter param
      }
    }
    return (storedState?.columnFilters as ColumnFiltersState | undefined) ?? []
  }
  const getInitialSearch = (): string => searchParams.get("search") ?? ""
  const getInitialGroupBy = (): string | undefined => {
    const urlGroupBy = searchParams.get("groupBy")
    if (urlGroupBy) {
      return urlGroupBy === "none" ? undefined : urlGroupBy
    }
    return view.groupBy || undefined
  }
  const getInitialPage = (): number => {
    const p = searchParams.get("page")
    if (p) {
      const n = Number(p)
      if (!Number.isNaN(n) && n > 0) return n
    }
    return 1
  }
  const getInitialJoinOperator = (): "and" | "or" => {
    const op = searchParams.get("joinOperator")
    if (op === "or" || op === "and") return op
    return (storedState?.joinOperator as "and" | "or" | undefined) ?? "and"
  }
  const [globalFilter, setGlobalFilter] = React.useState(getInitialSearch)
  const [groupBy, setGroupBy] = React.useState<string | undefined>(getInitialGroupBy)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(getInitialFilters)
  const [joinOperator, setJoinOperator] = React.useState<"and" | "or">(getInitialJoinOperator)
  const [page, setPage] = React.useState(getInitialPage)
  const pageSize = 24

  // Synchronize groupBy when the active view changes
  React.useEffect(() => {
    const urlGroupBy = searchParams.get("groupBy")
    if (urlGroupBy) {
      setGroupBy(urlGroupBy === "none" ? undefined : urlGroupBy)
    } else {
      setGroupBy(view.groupBy || undefined)
    }
  }, [view.groupBy, view.slug, searchParams])

  const handleColumnFiltersChange = React.useCallback(
    (updater: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => {
      setColumnFilters((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        persistToolbarState(toolbarStateKey, { columnFilters: next })
        return next
      })
      setPage(1)
    },
    [toolbarStateKey],
  )

  const handleJoinOperatorChange = React.useCallback(
    (op: "and" | "or") => {
      setJoinOperator(op)
      persistToolbarState(toolbarStateKey, { joinOperator: op })
    },
    [toolbarStateKey],
  )

  /** Field picker scope: the view's configured columns that exist in the schema. */
  const fieldsByName = React.useMemo(
    () => new Map<string, any>((schema?.fields ?? []).map((field: any) => [field.name, field])),
    [schema],
  )

  const groupableFields = React.useMemo(() => getGroupableFields(schema), [schema])
  const groupByOptions = React.useMemo(
    () => groupableFields.map((f) => ({ value: f.name, label: f.label })),
    [groupableFields],
  )

  const { allFieldIds, defaultHiddenIds } = React.useMemo(() => {
    const specified = (view.columns ?? []).filter((name) => fieldsByName.has(name))
    const remaining = (schema?.fields ?? [])
      .map((f: any) => f.name)
      .filter((name: string) => !specified.includes(name) && fieldsByName.has(name))

    return {
      allFieldIds: [...specified, ...remaining],
      defaultHiddenIds: remaining,
    }
  }, [view.columns, fieldsByName, schema])

  const fieldPreferences = useColumnPreferences({
    slug,
    viewSlug: view.slug,
    columnIds: allFieldIds,
    defaultHidden: defaultHiddenIds,
    variant: "cards",
  })

  const visibleFieldIds = React.useMemo(
    () =>
      fieldPreferences.preferences.order.filter(
        (id) => !fieldPreferences.preferences.hidden.includes(id),
      ),
    [fieldPreferences.preferences],
  )

  const columns = React.useMemo(
    () => buildViewColumns({ schema, client, schemas }),
    [schema, client, schemas],
  )

  const serverWhere = React.useMemo(() => {
    return buildServerWhere({
      baseFilter: resolveViewFilter(view.filter),
      columnFilters,
      search: globalFilter,
      searchableFields: allFieldIds.length ? allFieldIds : undefined,
      schema,
      joinOperator,
    })
  }, [view.filter, columnFilters, globalFilter, allFieldIds, schema, joinOperator])

  // URL ↔ sessionStorage sync (replace, not push).
  React.useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (globalFilter) next.set("search", globalFilter)
    else next.delete("search")
    if (groupBy) next.set("groupBy", groupBy)
    else next.delete("groupBy")
    if (columnFilters.length) next.set("filters", JSON.stringify(columnFilters))
    else next.delete("filters")
    if (columnFilters.length >= 2 && joinOperator === "or") next.set("joinOperator", "or")
    else next.delete("joinOperator")
    if (page > 1) next.set("page", String(page))
    else next.delete("page")
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
    persistToolbarState(toolbarStateKey, { columnFilters, joinOperator })
  }, [globalFilter, groupBy, columnFilters, joinOperator, page, searchParams, setSearchParams, toolbarStateKey])

  const {
    data: docs,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    isPending,
    isFetching,
  } = useViewData({
    slug,
    viewSlug: view.slug,
    page,
    limit: pageSize,
    filter: serverWhere,
    sort: resolveViewSort(view.sort),
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
    sort: resolveViewSort(view.sort),
  })

  const table = useReactTable({
    data: docs,
    columns,
    state: { globalFilter, columnFilters },
    onGlobalFilterChange: (val) => {
      setGlobalFilter(val)
      setPage(1)
    },
    onColumnFiltersChange: handleColumnFiltersChange,
    manualFiltering: true,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const isInitialLoad =
    !docs.length &&
    !globalFilter &&
    !columnFilters.length &&
    (!isGrouped || !groupStates.some((g) => g.docs.length))

  const showSkeleton = isParentLoading || (isInitialLoad && (isGrouped ? isGroupPending : isPending))

  if (showSkeleton) {
    return <SkeletonCardGrid items={8} aria-busy="true" />
  }

  const collectionLabel = schema?.labels?.plural || schema?.labels?.singular || slug

  return (
    <div className="dy-space-y-4" data-collection={slug}>
      <DataTableToolbar
        table={table}
        searchValue={globalFilter}
        onSearchChange={(val) => {
          setGlobalFilter(val)
          setPage(1)
        }}
        searchPlaceholder={`Search ${collectionLabel}...`}
        groupBy={groupBy}
        groupByOptions={groupByOptions}
        onGroupByChange={(field) => {
          setGroupBy(field)
          setPage(1)
        }}
        isFetching={isGrouped ? isGroupFetching : isFetching}
        joinOperator={joinOperator}
        onJoinOperatorChange={handleJoinOperatorChange}
      >
        <ViewOptionsPanel
          label="Fields"
          managedIds={allFieldIds}
          labelById={labelByIdFrom(allFieldIds, fieldsByName)}
          hiddenIds={fieldPreferences.preferences.hidden}
          showLabelIds={fieldPreferences.preferences.showLabel ?? []}
          withLabelToggle
          isDirty={fieldPreferences.isDirty}
          isSaving={fieldPreferences.isSaving}
          isAdmin={fieldPreferences.isAdmin}
          onOrderChange={fieldPreferences.setOrder}
          onToggleVisibility={fieldPreferences.toggleVisibility}
          onToggleLabel={fieldPreferences.toggleLabel}
          onShowAll={fieldPreferences.showAll}
          onHideAllExcept={fieldPreferences.hideAllExcept}
          onReset={fieldPreferences.reset}
          onSaveForMe={fieldPreferences.saveForMe}
          onSaveForEveryone={
            fieldPreferences.isAdmin ? fieldPreferences.saveForEveryone : undefined
          }
        />
      </DataTableToolbar>

      {isGrouped ? (
        <GroupedCardsView
          slug={slug}
          schema={schema}
          view={view}
          client={client}
          schemas={schemas}
          actions={actions}
          onRunAction={onRunAction}
          groupStates={groupStates}
          visibleFieldIds={visibleFieldIds.length ? visibleFieldIds : undefined}
          showLabels={fieldPreferences.preferences.showLabel}
        />
      ) : docs.length ? (
        <>
          <div className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 lg:dy-grid-cols-3 xl:dy-grid-cols-4 dy-gap-4">
            {docs.map((doc) => (
              <CardGridItem
                key={String(doc.id)}
                slug={slug}
                doc={doc}
                schema={schema}
                client={client}
                schemas={schemas}
                view={view}
                actions={actions}
                onRunAction={onRunAction}
                fields={visibleFieldIds.length ? visibleFieldIds : undefined}
                showLabels={fieldPreferences.preferences.showLabel}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="dy-flex dy-items-center dy-justify-between dy-border-t dy-border-border/60 dy-pt-4">
              <p className="dy-text-xs dy-text-muted-foreground dy-tabular-nums">
                Showing page {page} of {totalPages} ({total} total)
              </p>
              <div className="dy-flex dy-items-center dy-gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!hasPrevPage}
                >
                  <ChevronLeft className="dy-h-4 dy-w-4 dy-mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={!hasNextPage}
                >
                  Next
                  <ChevronRight className="dy-h-4 dy-w-4 dy-ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="dy-rounded-md dy-border dy-border-dashed dy-p-8 dy-text-center dy-text-sm dy-text-muted-foreground">
          {globalFilter || columnFilters.length
            ? "No cards match your search or filters."
            : "No items to show yet."}
        </p>
      )}
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

