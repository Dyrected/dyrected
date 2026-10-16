import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { useSearchParams } from "react-router-dom"
import { Button } from "../../../../components/ui/button"
import { CardGridItem } from "./card-grid-item"
import { GroupedCardsView } from "./grouped-cards-view"
import { SkeletonCardGrid } from "../view-skeletons"
import { getGroupableFields, useTableGroups } from "../table/use-table-groups"
import { ViewOptionsPanel } from "../view-options-panel"
import { resolveViewSort } from "../resolve-view-filter"
import { useViewToolbarState } from "../toolbar/use-view-toolbar-state"
import { ViewFilterToolbar } from "../toolbar/view-filter-toolbar"
import { useColumnPreferences } from "../use-column-preferences"
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
  onRunAction: (action: SerializedAction, ids: string[], targetContext?: { doc?: Record<string, any>; docs?: Record<string, any>[] }) => void
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
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [groupBy, setGroupBy] = React.useState<string | undefined>(getInitialGroupBy)
  const [page, setPage] = React.useState(getInitialPage)
  const pageSize = 24

  const toolbar = useViewToolbarState({
    slug,
    viewSlug: view.slug,
    variant: "cards",
    schema,
    baseFilter: view.filter,
    onFilterChange: () => setPage(1),
  })
  const { search: globalFilter, columnFilters, serverWhere } = toolbar

  // Synchronize groupBy when the active view changes
  React.useEffect(() => {
    const urlGroupBy = searchParams.get("groupBy")
    if (urlGroupBy) {
      setGroupBy(urlGroupBy === "none" ? undefined : urlGroupBy)
    } else {
      setGroupBy(view.groupBy || undefined)
    }
  }, [view.groupBy, view.slug, searchParams])

  // Follow the page param when the URL changes from outside (back button, shared link).
  const urlPageParam = searchParams.get("page")
  React.useEffect(() => {
    const pageNum = urlPageParam ? Math.max(1, Number(urlPageParam) || 1) : 1
    setPage((prev) => (prev === pageNum ? prev : pageNum))
  }, [urlPageParam])

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
    const specified = (view.columns?.length ? view.columns : defaultCardsOrder(schema)).filter((name) =>
      fieldsByName.has(name),
    )
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

  // Group and page live beside the shared toolbar's filter/search params in the URL.
  React.useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (groupBy) next.set("groupBy", groupBy)
        else next.delete("groupBy")
        if (page > 1) next.set("page", String(page))
        else next.delete("page")
        return next.toString() === prev.toString() ? prev : next
      },
      { replace: true },
    )
  }, [groupBy, page, setSearchParams])

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
    search: globalFilter,
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
    search: globalFilter,
    sort: resolveViewSort(view.sort),
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

  return (
    <div className="dy-space-y-4" data-collection={slug}>
      <ViewFilterToolbar
        schema={schema}
        client={client}
        schemas={schemas}
        state={toolbar}
        data={docs}
        isFetching={isGrouped ? isGroupFetching : isFetching}
        groupBy={groupBy}
        groupByOptions={groupByOptions}
        onGroupByChange={(field) => {
          setGroupBy(field)
          setPage(1)
        }}
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
      </ViewFilterToolbar>

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
          <div className="dy-grid dy-grid-cols-[repeat(auto-fill,minmax(280px,1fr))] dy-gap-4">
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

/** Fallback visible fields when the view declares none — mirrors table layout. */
function defaultCardsOrder(schema: any): string[] {
  return (schema?.fields ?? [])
    .filter((field: any) => !["textarea", "richText", "json", "blocks"].includes(field.type))
    .slice(0, 5)
    .map((field: any) => field.name)
}

