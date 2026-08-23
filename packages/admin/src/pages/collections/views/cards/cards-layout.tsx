import * as React from "react"
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  useReactTable,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { Search } from "lucide-react"

import { Input } from "../../../../components/ui/input"
import { CardGridItem } from "./card-grid-item"
import { SkeletonCardGrid } from "../view-skeletons"
import { buildViewColumns } from "../build-view-columns"
import { DataTableToolbar, FILTER_INPUT_CLASSES } from "../table/data-table-toolbar"
import { ViewOptionsPanel } from "../view-options-panel"
import { useColumnPreferences } from "../use-column-preferences"
import { loadToolbarState, persistToolbarState } from "../toolbar-persistence"
import { resolveDocumentTitle } from "@/lib/document-title"
import type { SerializedAction, SerializedView } from "../types"

export interface CardsLayoutProps {
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

/**
 * Visual gallery layout — media-forward cards in a responsive grid.
 *
 * Reuses the tablecn toolbar architecture headlessly: a TanStack table over
 * the same schema-driven column metadata powers global search plus faceted/
 * operator filters (DataTableToolbar), and per-user field visibility/order
 * preferences drive which fields render on each card.
 */
export function CardsLayout({
  slug,
  schema,
  view,
  data,
  isLoading,
  client,
  schemas,
  actions,
  onRunAction,
}: CardsLayoutProps) {
  const docs = React.useMemo(() => data ?? [], [data])

  const toolbarStateKey = `view-toolbar:${slug}:${view.slug}:cards`
  const storedState = React.useMemo(() => loadToolbarState(toolbarStateKey), [toolbarStateKey])
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

  const table = useReactTable({
    data: docs,
    columns,
    state: { globalFilter, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: handleColumnFiltersChange,
    globalFilterFn: cardGlobalFilter(schema, view.columns, schemas),
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const visibleDocs = React.useMemo(
    () => table.getFilteredRowModel().rows.map((row) => row.original),
    [table],
  )

  if (isLoading) {
    return <SkeletonCardGrid items={8} aria-busy="true" />
  }

  if (!docs.length) {
    return (
      <p className="dy-rounded-md dy-border dy-border-dashed dy-p-8 dy-text-center dy-text-sm dy-text-muted-foreground">
        No items to show yet.
      </p>
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

      {visibleDocs.length ? (
        <div className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 lg:dy-grid-cols-3 xl:dy-grid-cols-4 dy-gap-4">
          {visibleDocs.map((doc) => (
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
      ) : (
        <p className="dy-rounded-md dy-border dy-border-dashed dy-p-8 dy-text-center dy-text-sm dy-text-muted-foreground">
          No cards match your search or filters.
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

/**
 * Global matcher for card search: case-insensitive substring over the document
 * title plus primitive values of the view's configured columns — what the
 * cards actually display.
 */
function cardGlobalFilter(schema: any, columns: string[] | undefined, schemas: unknown) {
  return (row: any, _columnId: string, filterValue: string): boolean => {
    const needle = String(filterValue ?? "").trim().toLowerCase()
    if (!needle) return true
    const doc = row.original

    const parts = [
      resolveDocumentTitle({
        entry: doc,
        collection: schema,
        collections: (schemas as any)?.collections,
      }),
    ]
    for (const name of columns ?? []) {
      const value = doc[name]
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        parts.push(String(value))
      }
    }
    return parts.join(" ").toLowerCase().includes(needle)
  }
}
