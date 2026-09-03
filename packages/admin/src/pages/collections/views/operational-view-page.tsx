import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { FileDown, FileUp, Loader2, Plus, RefreshCw } from "lucide-react"

import { Button } from "../../../components/ui/button"
import { useDyrected } from "../../../providers/dyrected-context"
import { cn, getSiteUrl } from "../../../lib/utils"
import { resolvePreviewUrl } from "../../../lib/preview-url"
import { AdminComponentSlot } from "../../../components/admin-component-slot"
import type { CollectionViewSlotProps } from "../../../types/admin-components"
import { useViewMetrics } from "./use-view-metrics"
import { useViewActions } from "./use-view-actions"
import { useSystemOps } from "./use-system-ops"
import { useViewMode } from "./use-view-mode"
import { DeleteEntriesDialog } from "./delete-entries-dialog"
import { evaluateAccess, isSystemAction } from "./system-actions"
import { resolveViewActions } from "./resolve-view-actions"
import { resolveViewFilter, resolveViewSort } from "./resolve-view-filter"
import { ViewHeader } from "./view-header"
import { ViewModeSwitcher } from "./view-mode-switcher"
import { MetricCards } from "./metric-cards"
import { ActionDialogs } from "./action-dialogs"
import {
  ExportMenu,
  ImportCsvDialog,
  MobileHeaderMenu,
  createExportHandlers,
  type HeaderMenuItem,
} from "./view-io-actions"
import type { SerializedAction, SerializedView } from "./types"
import { TableLayout, type TableLayoutProps } from "./table/table-layout"
import { KanbanLayout, type KanbanLayoutProps } from "./kanban/kanban-layout"
import { CalendarLayout, type CalendarLayoutProps } from "./calendar/calendar-layout"
import { CardsLayout, type CardsLayoutProps } from "./cards/cards-layout"
import {
  SpreadsheetLayout,
  type SpreadsheetLayoutProps,
} from "./spreadsheet/spreadsheet-layout"

export interface OperationalViewPageProps {
  slug: string
  schema: any
  view: SerializedView
  schemas: unknown
}

/**
 * Orchestrator for an operational view workspace.
 *
 * Owns the shared data/metrics/action plumbing plus the built-in document
 * operations (view/edit/duplicate/delete/export), the table⇄spreadsheet mode
 * switcher, extension slots, and delegates rendering to the active layout.
 */
export function OperationalViewPage({ slug, schema, view, schemas }: OperationalViewPageProps) {
  const { client, components, user } = useDyrected()
  const queryClient = useQueryClient()
  const authoredLayout = view.layout ?? "table"

  // Only tabular views can switch between table and spreadsheet.
  const isTabular =
    !authoredLayout || authoredLayout === "table" || authoredLayout === "spreadsheet"
  const viewMode = useViewMode({
    slug,
    viewSlug: view.slug,
    layout: isTabular ? authoredLayout : undefined,
  })
  const layout = isTabular ? viewMode.mode : authoredLayout

  const customActions = useMemo(() => (view.actions ?? []) as SerializedAction[], [view.actions])

  const metrics = useViewMetrics({ slug, viewSlug: view.slug, metrics: view.metrics })
  const isViewFetching = useIsFetching({ queryKey: ["operational-view", slug] }) > 0
  const isMetricsFetching = useIsFetching({ queryKey: ["operational-view-metrics", slug] }) > 0
  const isGroupsFetching = useIsFetching({ queryKey: ["table-group", slug] }) > 0
  const isFetchingData = isViewFetching || isMetricsFetching || isGroupsFetching || metrics.isFetching

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["operational-view", slug] }),
      queryClient.invalidateQueries({ queryKey: ["operational-view-metrics", slug] }),
      queryClient.invalidateQueries({ queryKey: ["table-group", slug] }),
      queryClient.invalidateQueries({ queryKey: ["table-group-distinct", slug] }),
      queryClient.invalidateQueries({ queryKey: ["table-group-relations"] }),
    ])
  }, [queryClient, slug])

  const actionRunner = useViewActions({ slug, viewSlug: view.slug })

  const canCreate = useMemo(() => evaluateAccess(schema?.access?.create, user), [schema, user])
  const canDelete = useMemo(() => evaluateAccess(schema?.access?.delete, user), [schema, user])
  const hasDetail = schema?.detail !== false

  const systemOps = useSystemOps({ slug, schema, schemas, data: [] })

  const resolvedActions = useMemo(
    () =>
      resolveViewActions(view, {
        canCreate,
        canDelete,
        hasDetail,
      }),
    // `view` fields are stable per route; features/order ride along on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customActions, canCreate, canDelete, hasDetail, view.features, view.actionOrder],
  )
  const actions = resolvedActions.all

  /** Combined loading predicate across server actions and built-in ops. */
  const isRunningAction = useCallback(
    (action: SerializedAction, ids: string[]) => {
      if (isSystemAction(action)) {
        return systemOps.isOperationRunning(action.operation, ids)
      }
      return actionRunner.isActionRunning(action.name, ids)
    },
    [systemOps, actionRunner],
  )

  const handleRunAction = useCallback(
    (action: SerializedAction, ids: string[], targetContext?: { doc?: Record<string, any>; docs?: Record<string, any>[] }) => {
      if (isSystemAction(action)) {
        systemOps.runSystemAction(action.operation, ids)
        return
      }
      actionRunner.initiate(action, ids, targetContext)
    },
    [actionRunner, systemOps],
  )

  const resolvePreview = useCallback(
    (doc: Record<string, any>) => resolvePreviewUrl(schema?.admin?.previewUrl, doc, getSiteUrl((schemas as any)?.admin?.siteUrl)),
    [schema, schemas],
  )

  const headerActions = resolvedActions.headerActions
  const docIds: string[] = []
  // Table and spreadsheet render their own Export menu with filtered counts;
  // the header-level export covers the non-filtering layouts only.
  const headerHasExport = !isTabular

  const exportHandlers = createExportHandlers({
    client,
    slug,
    schema,
    findArgs: { where: resolveViewFilter(view.filter), sort: resolveViewSort(view.sort) },
  })

  const [isImportOpen, setIsImportOpen] = useState(false)

  const mobileMenuItems: HeaderMenuItem[] = [
    {
      key: "refresh",
      label: isFetchingData ? "Refreshing data…" : "Refresh data",
      icon: RefreshCw,
      disabled: isFetchingData,
      onSelect: () => void handleRefresh(),
    },
    ...headerActions.map((action) => ({
      key: `header:${action.name}`,
      label: action.label,
      onSelect: () => handleRunAction(action, docIds),
    })),
    ...(headerHasExport
      ? [
        {
          key: "export-all",
          label: "Export all records",
          icon: FileDown,
          onSelect: () => void exportHandlers.exportAll(),
        },
      ]
      : []),
    ...(canCreate
      ? [{ key: "import", label: "Import CSV", icon: FileUp, onSelect: () => setIsImportOpen(true) }]
      : []),
  ]

  const slotProps: CollectionViewSlotProps = {
    client: client!,
    user,
    collection: schema,
    collectionSlug: slug,
    viewSlug: view.slug,
    view: view as unknown as Record<string, unknown>,
    documents: [],
    isLoading: false,
    permissions: { canCreate },
    urls: {
      collection: `/collections/${slug}`,
      create: `/collections/${slug}/new`,
    },
  }
  const collectionViewComponents = (schema.admin as any)?.components?.collectionView as
    | Record<string, string[]>
    | undefined
  const legacyListComponents = schema.admin?.components as unknown as
    | { beforeList?: string[]; beforeListTable?: string[]; afterListTable?: string[]; afterList?: string[] }
    | undefined
  const slotRegistry = useMemo(
    () => ({
      ...(components?.collectionList as any),
      ...(components?.collectionView as any),
    }),
    [components?.collectionList, components?.collectionView],
  )
  const legacyRegistry = components?.collectionList

  const getLegacyKeysForSlot = (slot: string): string[] | undefined => {
    if (slot === "beforeViewHeader") return legacyListComponents?.beforeList
    if (slot === "beforeViewContent") return legacyListComponents?.beforeListTable
    if (slot === "afterViewContent") {
      const keys = [...(legacyListComponents?.afterListTable ?? []), ...(legacyListComponents?.afterList ?? [])]
      return keys.length ? keys : undefined
    }
    return undefined
  }

  // Legacy slot props for backwards compat with collectionList slot consumers.
  // Operational views don't have paginated response in the header, so we stub
  // the legacy shape with empty documents.
  const legacySlotProps = {
    client: client!,
    user,
    collection: schema,
    collectionSlug: slug,
    response: undefined,
    documents: [] as Record<string, unknown>[],
    isLoading: false,
    pagination: { page: 1, totalPages: 1, total: 0, hasNextPage: false, hasPrevPage: false },
    permissions: { canRead: true, canCreate },
    urls: { collection: `/collections/${slug}`, create: `/collections/${slug}/new` },
  }

  const renderSlot = (slot: string) => {
    const collectionDirectKeys = (schema.admin as any)?.components?.[slot] as string[] | undefined
    const collectionViewKeys = (collectionViewComponents as any)?.[slot] as string[] | undefined
    const viewKeys = (view as any)?.components?.[slot] as string[] | undefined

    const mergedViewKeys = [
      ...(collectionViewKeys ?? []),
      ...(collectionDirectKeys ?? []),
      ...(viewKeys ?? []),
    ]

    const legacyKeys = getLegacyKeysForSlot(slot)
    return (
      <>
        {legacyKeys?.length ? (
          <AdminComponentSlot
            slot={`collectionView.${slot}__legacy`}
            componentKeys={legacyKeys}
            registry={legacyRegistry}
            componentProps={legacySlotProps as any}
          />
        ) : null}
        <AdminComponentSlot
          slot={`collectionView.${slot}`}
          componentKeys={mergedViewKeys.length ? mergedViewKeys : undefined}
          registry={slotRegistry}
          componentProps={slotProps}
        />
      </>
    )
  }

  const layoutProps: KanbanLayoutProps | CalendarLayoutProps | CardsLayoutProps | TableLayoutProps | SpreadsheetLayoutProps = {
    slug,
    schema,
    view,
    client,
    schemas,
    actions,
    onRunAction: handleRunAction,
    isRunningAction,
  }

  return (
    <div className="dy-flex dy-flex-col dy-gap-6">
      {renderSlot("beforeViewHeader")}

      <ViewHeader
        label={view.label}
        icon={view.icon}
        layout={layout}
        description={schema.labels ? `Collection: ${schema.labels.plural || schema.labels.singular}` : undefined}
      >
        <div className="dy-flex dy-w-full dy-items-center dy-gap-2 sm:dy-w-auto sm:dy-justify-end">
          {isTabular && <ViewModeSwitcher mode={viewMode.mode} onChange={viewMode.setMode} />}

          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={isFetchingData}
            className="dy-h-8 dy-gap-1.5 dy-px-2.5 dy-text-xs"
            title="Refresh view data"
          >
            <RefreshCw className={cn("dy-h-3.5 dy-w-3.5", isFetchingData && "dy-animate-spin")} />
            <span className="dy-hidden md:dy-inline">
              {isFetchingData ? "Refreshing…" : "Refresh"}
            </span>
          </Button>

          {headerActions.length > 0 && (
            <div className="dy-hidden sm:dy-flex sm:dy-items-center sm:dy-gap-2">
              {headerActions.map((action) => {
                const running = isRunningAction(action, docIds)
                return (
                  <Button
                    key={action.name}
                    variant="outline"
                    size="sm"
                    disabled={running}
                    className="dy-h-8 dy-px-3 dy-text-xs"
                    onClick={() => handleRunAction(action, docIds)}
                  >
                    {running ? (
                      <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" />
                    ) : null}
                    {running ? `${action.label}…` : action.label}
                  </Button>
                )
              })}
            </div>
          )}

          {headerHasExport && (
            <span className="dy-hidden sm:dy-inline-flex">
              <ExportMenu
                slug={slug}
                schema={schema}
                findArgs={{ where: resolveViewFilter(view.filter), sort: resolveViewSort(view.sort) }}
              />
            </span>
          )}

          {canCreate && (
            <Button
              variant="outline"
              size="sm"
              className="dy-hidden dy-h-8 dy-gap-1.5 dy-px-3 dy-text-xs sm:dy-inline-flex"
              onClick={() => setIsImportOpen(true)}
            >
              <FileUp className="dy-h-3.5 dy-w-3.5" />
              Import
            </Button>
          )}

          {canCreate && (
            <Button asChild size="sm" className="dy-h-8 dy-flex-1 dy-px-3 dy-text-xs sm:dy-flex-none">
              <Link to={`/collections/${slug}/new`}>
                <Plus className="dy-h-3.5 dy-w-3.5" />
                New {schema.labels?.singular || schema.slug}
              </Link>
            </Button>
          )}

          <MobileHeaderMenu items={mobileMenuItems} />
        </div>
      </ViewHeader>

      {renderSlot("afterViewHeader")}

      {(() => {
        const metricsList = metrics.data ?? []
        return (
          <MetricCards
            metrics={metricsList}
            isLoading={metrics.isLoading && metricsList.length === 0}
            isRefetching={isFetchingData && metricsList.length > 0}
          />
        )
      })()}

      {renderSlot("beforeViewContent")}

      {layout === "kanban" ? (
        <KanbanLayout {...(layoutProps as KanbanLayoutProps)} />
      ) : layout === "calendar" ? (
        <CalendarLayout {...(layoutProps as CalendarLayoutProps)} />
      ) : layout === "cards" ? (
        <CardsLayout {...(layoutProps as CardsLayoutProps)} />
      ) : layout === "spreadsheet" ? (
        <SpreadsheetLayout {...(layoutProps as SpreadsheetLayoutProps)} resolvePreview={resolvePreview} hasDetail={hasDetail} />
      ) : (
        <TableLayout {...(layoutProps as TableLayoutProps)} resolvePreview={resolvePreview} hasDetail={hasDetail} />
      )}

      {renderSlot("afterViewContent")}

      <ActionDialogs
        collection={slug}
        schemas={schemas}
        pending={actionRunner.pending}
        isRunning={actionRunner.isRunning}
        onResolve={(input) => void actionRunner.resolve(input)}
        onCancel={actionRunner.cancel}
      />

      <DeleteEntriesDialog
        state={systemOps.deleteDialog}
        confirmationValue={systemOps.confirmationValue}
        onConfirmationValueChange={systemOps.setConfirmationValue}
        isPending={systemOps.isDeleting}
        onCancel={systemOps.closeDeleteDialog}
        onConfirm={systemOps.confirmDelete}
      />

      <ImportCsvDialog
        slug={slug}
        schema={schema}
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </div>
  )
}
