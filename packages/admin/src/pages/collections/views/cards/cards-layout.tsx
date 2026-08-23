import * as React from "react"
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { CardGridItem } from "./card-grid-item"
import { SkeletonCardGrid } from "../view-skeletons"
import { buildViewColumns } from "../build-view-columns"
import { DataTableToolbar, FILTER_INPUT_CLASSES } from "../table/data-table-toolbar"
import { ViewOptionsPanel } from "../view-options-panel"
import { useColumnPreferences } from "../use-column-preferences"
import { loadToolbarState, persistToolbarState } from "../toolbar-persistence"
import { resolveViewFilter, resolveViewSort } from "../resolve-view-filter"
import { buildServerWhere } from "../build-server-where"
import { useViewData } from "../use-view-data"
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
 * server-side operator filters (DataTableToolbar), and pagination.
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
  const toolbarStateKey = `view-toolbar:${slug}:${view.slug}:cards`
  const storedState = React.useMemo(() => loadToolbarState(toolbarStateKey), [toolbarStateKey])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    (storedState?.columnFilters as ColumnFiltersState | undefined) ?? [],
  )
  const [page, setPage] = React.useState(1)
  const pageSize = 24

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

  /** Field picker scope: the view's configured columns that exist in the schema. */
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
      searchableFields: managedIds.length ? managedIds : undefined,
      schema,
    })
  }, [view.filter, columnFilters, globalFilter, managedIds, schema])

  const {
    data: docs,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    isPending,
  } = useViewData({
    slug,
    viewSlug: view.slug,
    filter: serverWhere,
    sort: resolveViewSort(view.sort),
    page,
    limit: pageSize,
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

  if (isParentLoading || (isPending && !docs.length)) {
    return <SkeletonCardGrid items={8} aria-busy="true" />
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
            onChange={(event) => {
              setGlobalFilter(event.target.value)
              setPage(1)
            }}
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

      {docs.length ? (
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
