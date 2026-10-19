import { useCallback, useMemo, useState, useSyncExternalStore } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useIsFetching, useQuery, useQueryClient } from "@tanstack/react-query"
import { FileDown, FileUp, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react"

import { Button } from "../../../components/ui/button"
import { useDyrected } from "../../../providers/dyrected-context"
import { cn, getSiteUrl } from "../../../lib/utils"
import { resolvePreviewUrl } from "../../../lib/preview-url"
import { AdminComponentSlot } from "../../../components/admin-component-slot"
import { InviteDialog } from "../../../components/collections/invite-dialog"
import type { CollectionViewSlotProps } from "../../../types/admin-components"
import { useViewMetrics, type MetricFilterTarget } from "./use-view-metrics"
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
import { BuiltInLayout, type BuiltInLayoutProps } from "./built-in-layout"
import { getLayoutCapabilities } from "./layout-registry"
import { CustomLayout } from "./custom/custom-layout"
import { useViewController } from "./use-view-controller"
import { ViewControllerContext } from "../../../providers/view-controller"
import { RecordPeekDrawer } from "./record-peek-drawer"
import { buildServerWhere } from "./build-server-where"

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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const peekRecordId = searchParams.get("record")
  const isPeekOpen = Boolean(peekRecordId)

  const handleClosePeek = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete("record")
      return next
    })
  }, [setSearchParams])

  const authoredLayout = view.layout ?? "table"

  // Only tabular views can switch between table and spreadsheet.
  const isTabular = getLayoutCapabilities(authoredLayout).tabular
  const viewMode = useViewMode({
    slug,
    viewSlug: view.slug,
    layout: isTabular ? authoredLayout : undefined,
  })
  const layout = isTabular ? viewMode.mode : authoredLayout

  // Actions mutate data, so they follow the same `update` rule the server
  // enforces when the action runs; hide the ones this user would be denied.
  const customActions = useMemo(
    () =>
      ((view.actions ?? []) as SerializedAction[]).filter((action) =>
        evaluateAccess((action as any).access?.update, user),
      ),
    [view.actions, user],
  )

  // Extract active toolbar filters and search query from URL search parameters
  const activeFilters = useMemo(() => {
    const raw = searchParams.get("filters")
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [searchParams])
  const activeSearch = searchParams.get("search") ?? ""
  const activeJoinOperator = (searchParams.get("joinOperator") as "and" | "or") || "and"

  const filteredWhere = useMemo(() => {
    return buildServerWhere({
      baseFilter: resolveViewFilter(view.filter),
      columnFilters: activeFilters,
      search: activeSearch,
      schema,
      joinOperator: activeJoinOperator,
    })
  }, [view.filter, activeFilters, activeSearch, schema, activeJoinOperator])

  const handleToggleMetricFilter = useCallback(
    (target: MetricFilterTarget) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        const raw = next.get("filters")
        let currentFilters: Array<{ id: string; value: unknown }> = []
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) currentFilters = parsed
          } catch {
            currentFilters = []
          }
        }

        const isAlreadyActive = currentFilters.some((f) => {
          if (f.id !== target.columnId) return false
          if (f.value === target.value) return true
          if (typeof f.value === "object" && f.value !== null) {
            const opVal = f.value as any
            if (opVal.value === target.value) return true
            if (opVal.operator === target.operator && opVal.value === target.value) {
              if (target.value2 !== undefined) {
                return opVal.value2 === target.value2
              }
              return true
            }
            if (Array.isArray(opVal.value) && Array.isArray(target.value)) {
              return JSON.stringify(opVal.value) === JSON.stringify(target.value)
            }
          }
          return false
        })

        let newFilters: Array<{ id: string; value: unknown }>
        if (isAlreadyActive) {
          newFilters = currentFilters.filter((f) => f.id !== target.columnId)
        } else {
          const filterValue =
            target.operator && target.operator !== "eq"
              ? {
                  operator: target.operator,
                  value: target.value,
                  ...(target.value2 !== undefined ? { value2: target.value2 } : {}),
                }
              : { operator: "eq", value: target.value }

          newFilters = [
            ...currentFilters.filter((f) => f.id !== target.columnId),
            { id: target.columnId, value: filterValue },
          ]
        }

        if (newFilters.length > 0) {
          next.set("filters", JSON.stringify(newFilters))
        } else {
          next.delete("filters")
        }
        next.delete("page")
        return next
      })
    },
    [setSearchParams],
  )

  const metrics = useViewMetrics({
    slug,
    viewSlug: view.slug,
    metrics: view.metrics,
    metricsScope: view.metricsScope,
    viewFilter: view.filter,
    filteredWhere,
    schema,
  })
  const isViewFetching = useIsFetching({ queryKey: ["operational-view", slug] }) > 0
  const isMetricsFetching = useIsFetching({ queryKey: ["operational-view-metrics", slug] }) > 0
  const isGroupsFetching = useIsFetching({ queryKey: ["table-group", slug] }) > 0
  const isFetchingData = isViewFetching || isMetricsFetching || isGroupsFetching || metrics.isFetching

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["operational-view", slug] }),
      queryClient.invalidateQueries({ queryKey: ["operational-view-metrics", slug] }),
      queryClient.invalidateQueries({ queryKey: ["metric-group-options", slug] }),
      queryClient.invalidateQueries({ queryKey: ["table-group", slug] }),
      queryClient.invalidateQueries({ queryKey: ["table-group-distinct", slug] }),
      queryClient.invalidateQueries({ queryKey: ["table-group-relations"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-navigation-badges"] }),
    ])
  }, [queryClient, slug])

  const actionRunner = useViewActions({ slug, viewSlug: view.slug })

  const canCreate = useMemo(() => evaluateAccess(schema?.access?.create, user), [schema, user])
  const canDelete = useMemo(() => evaluateAccess(schema?.access?.delete, user), [schema, user])
  const hasDetail = schema?.detail !== false

  // Extract invite configuration if this is an auth collection
  const inviteConfig = useMemo(() => {
    if (!schema?.auth) return null

    // Find role field if it exists
    const roleField = schema.fields?.find(
      (f: any) =>
        f.name === "roles" || f.name === "role" || (f.type === "select" && f.admin?.inviteRole)
    )

    if (!roleField) return { enabled: true }

    const options = Array.isArray(roleField.options)
      ? roleField.options.map((opt: any) =>
          typeof opt === "string" ? { label: opt, value: opt } : opt
        )
      : []

    return {
      enabled: true,
      roleField: {
        fieldName: roleField.name,
        hasMany: roleField.type === "multiSelect" || roleField.hasMany,
        options,
      },
    }
  }, [schema])

  const systemOps = useSystemOps({ slug, schema, schemas, data: [] })

  const resolvedActions = useMemo(
    () =>
      resolveViewActions(
        { actions: customActions, features: view.features, actionOrder: view.actionOrder },
        {
          canCreate,
          canDelete,
          hasDetail,
          trash: schema?.trash,
        },
      ),
    [customActions, canCreate, canDelete, hasDetail, view.features, view.actionOrder, schema?.trash],
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

  /**
   * Action entry point for custom layouts. With `input`, the request skips the
   * confirm/input dialogs; without it, the host dialogs run as usual.
   */
  const runCustomLayoutAction = useCallback(
    async (action: SerializedAction, docs: Record<string, any>[], input?: Record<string, unknown>) => {
      const ids = docs.map((doc) => String(doc.id))
      if (isSystemAction(action)) {
        systemOps.runSystemAction(action.operation, ids)
        return true
      }
      if (input !== undefined) {
        return actionRunner.execute(
          {
            actionName: action.name,
            label: action.label,
            confirm: action.confirm,
            submitLabel: action.submitLabel,
            fields: action.fields,
            ids,
            doc: docs[0],
            docs,
          },
          input,
        )
      }
      actionRunner.initiate(action, ids, { doc: docs[0], docs })
      return true
    },
    [actionRunner, systemOps],
  )

  const canUpdate = useMemo(() => evaluateAccess(schema?.access?.update, user), [schema, user])
  const customPermissions = useMemo(
    () => ({ canCreate, canUpdate, canDelete }),
    [canCreate, canUpdate, canDelete],
  )

  // Server actions and built-in operations report running state differently;
  // the controller exposes both as one list of `name::ids` keys.
  const runningKeys = useMemo(() => {
    const keys: string[] = []
    if (actionRunner.runningKey) keys.push(actionRunner.runningKey)
    for (const action of actions) {
      if (action.operation === "delete" && systemOps.deletingIds.length) {
        keys.push(`${action.name}::${[...systemOps.deletingIds].sort().join(",")}`)
      }
      if (action.operation === "duplicate" && systemOps.duplicatingId) {
        keys.push(`${action.name}::${systemOps.duplicatingId}`)
      }
    }
    return keys
  }, [actionRunner.runningKey, actions, systemOps.deletingIds, systemOps.duplicatingId])

  const controller = useViewController({
    slug,
    schema,
    view,
    actions,
    permissions: customPermissions,
    hasDetail,
    runningKeys,
    runAction: runCustomLayoutAction,
  })

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

  const isTrashEnabled = schema?.trash?.enabled !== false && !schema?.slug?.startsWith("__")
  const { data: trashData } = useQuery({
    queryKey: ["trash-count", slug],
    queryFn: async () => {
      if (!client) return { total: 0 }
      return (client as any).request(`/api/collections/${slug}/trash?limit=1`)
    },
    enabled: !!client && isTrashEnabled,
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
    ...(isTrashEnabled
      ? [
          {
            key: "trash",
            label: `Trash${typeof trashData?.total === "number" && trashData.total > 0 ? ` (${trashData.total})` : ""}`,
            icon: Trash2,
            onSelect: () => void navigate(`/collections/${slug}/trash`),
          },
        ]
      : []),
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

  // Slots see the same documents as the layout on screen. Only the fields they
  // use are read, so a selection change does not re-render the whole page.
  const slotDocuments = useSyncExternalStore(
    controller.subscribe,
    () => controller.getState().documents,
    () => controller.getState().documents,
  )
  const slotIsLoading = useSyncExternalStore(
    controller.subscribe,
    () => controller.getState().isLoading,
    () => controller.getState().isLoading,
  )

  const slotProps: CollectionViewSlotProps = {
    client: client!,
    user,
    collection: schema,
    collectionSlug: slug,
    viewSlug: view.slug,
    view: view as unknown as Record<string, unknown>,
    documents: slotDocuments,
    isLoading: slotIsLoading,
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
  // There is no paginated response in an operational view's header, so the
  // legacy shape carries the layout's documents with single-page pagination.
  const legacySlotProps = {
    client: client!,
    user,
    collection: schema,
    collectionSlug: slug,
    response: undefined,
    documents: slotDocuments as Record<string, unknown>[],
    isLoading: slotIsLoading,
    pagination: { page: 1, totalPages: 1, total: slotDocuments.length, hasNextPage: false, hasPrevPage: false },
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

  // The app can replace a built-in layout by registering a component under its
  // name (for example `viewLayouts.kanban`); it then gets the same host shell
  // and controller as a `layout: "custom"` view.
  const layoutOverride = layout !== "custom" ? components?.viewLayouts?.[layout] : undefined
  const layoutView = useMemo(
    () => (layoutOverride ? { ...view, layout: "custom" as const, component: layout } : view),
    [layoutOverride, view, layout],
  )

  const layoutProps: BuiltInLayoutProps = {
    slug,
    schema,
    view,
    client,
    schemas,
  }

  return (
    <ViewControllerContext.Provider value={controller}>
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

            {inviteConfig?.enabled && (
              <InviteDialog
                collectionSlug={slug}
                collectionLabel={schema.labels?.singular || schema.slug}
                inviteRoleField={inviteConfig.roleField}
              />
            )}

            {canCreate && (
              <Button asChild size="sm" className="dy-h-8 dy-flex-1 dy-px-3 dy-text-xs sm:dy-flex-none">
                <Link to={`/collections/${slug}/new`}>
                  <Plus className="dy-h-3.5 dy-w-3.5" />
                  New {schema.labels?.singular || schema.slug}
                </Link>
              </Button>
            )}

            {isTrashEnabled && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="dy-h-8 dy-gap-1.5 dy-px-3 dy-text-xs"
              >
                <Link to={`/collections/${slug}/trash`}>
                  <Trash2 className="dy-h-3.5 dy-w-3.5" />
                  <span>Trash</span>
                  {typeof trashData?.total === "number" && trashData.total > 0 && (
                    <span className="dy-ml-0.5 dy-rounded-full dy-bg-muted dy-px-1.5 dy-py-0.5 dy-text-[10px] dy-font-semibold dy-tabular-nums">
                      {trashData.total}
                    </span>
                  )}
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
              activeFilters={activeFilters}
              onToggleFilter={handleToggleMetricFilter}
            />
          )
        })()}

        {renderSlot("beforeViewContent")}

        {layout === "custom" || layoutOverride ? (
        <CustomLayout
          slug={slug}
          schema={schema}
          schemas={schemas}
          view={layoutView}
          renderTableFallback={() => (
            <BuiltInLayout {...layoutProps} layout="table" resolvePreview={resolvePreview} hasDetail={hasDetail} />
          )}
        />
      ) : (
        <BuiltInLayout {...layoutProps} layout={layout} resolvePreview={resolvePreview} hasDetail={hasDetail} />
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

        <RecordPeekDrawer
          collectionSlug={slug}
          recordId={peekRecordId}
          schema={schema}
          schemas={schemas}
          isOpen={isPeekOpen}
          onClose={handleClosePeek}
        />
      </div>
    </ViewControllerContext.Provider>
  )
}
