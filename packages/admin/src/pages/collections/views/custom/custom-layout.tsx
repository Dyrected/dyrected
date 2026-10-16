import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { CUSTOM_VIEW_FETCH_ALL_LIMIT } from "@dyrected/core"

import { Button } from "../../../../components/ui/button"
import { Skeleton } from "../../../../components/ui/skeleton"
import {
  AdminComponentErrorBoundary,
  AdminComponentFallback,
  warnMissingComponent,
} from "../../../../components/admin-component-slot"
import { useDyrected } from "../../../../providers/dyrected-context"
import { ViewControllerContext, type ViewDocument } from "../../../../providers/view-controller"
import { BulkActionBar } from "../bulk-action-bar"
import type { SerializedAction, SerializedView } from "../types"
import { useViewToolbarState } from "../toolbar/use-view-toolbar-state"
import { ViewFilterToolbar } from "../toolbar/view-filter-toolbar"
import { useCustomViewSession } from "./use-custom-view-session"

export interface CustomLayoutProps {
  slug: string
  schema: any
  schemas: unknown
  view: SerializedView
  actions: SerializedAction[]
  permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }
  hasDetail: boolean
  runningKey: string | null
  onRunAction: (action: SerializedAction, docs: ViewDocument[], input?: Record<string, unknown>) => Promise<boolean>
  isRunningAction: (action: SerializedAction, ids: string[]) => boolean
  /** Renders the built-in table, used when the layout's component is not registered. */
  renderTableFallback: () => ReactNode
}

/**
 * Host shell for `layout: "custom"` views.
 *
 * The shell keeps ownership of search, pagination, selection, the bulk bar and
 * action execution, then renders the host app's component from
 * `AdminComponents.viewLayouts` with a {@link ViewController} in context.
 */
export function CustomLayout({
  slug,
  schema,
  schemas,
  view,
  actions,
  permissions,
  hasDetail,
  runningKey,
  onRunAction,
  isRunningAction,
  renderTableFallback,
}: CustomLayoutProps) {
  const { components, client } = useDyrected()
  const [showTable, setShowTable] = useState(false)
  const [, setSearchParams] = useSearchParams()

  // Changing a filter or the search text starts again from the first page.
  const resetPage = useCallback(() => {
    setSearchParams(
      (prev) => {
        if (!prev.has("page")) return prev
        const next = new URLSearchParams(prev)
        next.delete("page")
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

  const toolbar = useViewToolbarState({
    slug,
    viewSlug: view.slug,
    variant: "custom",
    schema,
    baseFilter: view.filter,
    foldSearchIntoWhere: true,
    onFilterChange: resetPage,
  })

  const { controller, state } = useCustomViewSession({
    slug,
    schema,
    view,
    toolbar,
    actions,
    permissions,
    hasDetail,
    runningKey,
    runAction: onRunAction,
  })

  const componentKey = view.component ?? ""
  const LayoutComponent = components?.viewLayouts?.[componentKey]

  useEffect(() => {
    if (!LayoutComponent) warnMissingComponent("viewLayouts", componentKey || "(none)")
  }, [LayoutComponent, componentKey])

  if (showTable) return <>{renderTableFallback()}</>

  if (!LayoutComponent) {
    return (
      <div
        role="status"
        className="dy-flex dy-flex-col dy-items-start dy-gap-3 dy-rounded-lg dy-border dy-border-dashed dy-border-border dy-p-6"
      >
        <div className="dy-space-y-1">
          <p className="dy-text-sm dy-font-medium">This view's layout is unavailable.</p>
          <p className="dy-text-xs dy-text-muted-foreground">
            {import.meta.env.DEV ? (
              <>
                No component is registered as <code className="dy-font-mono">{componentKey || "(none)"}</code> in{" "}
                <code className="dy-font-mono">viewLayouts</code>.
              </>
            ) : (
              "Ask an administrator to check this view's configuration."
            )}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowTable(true)}>
          Show as table
        </Button>
      </div>
    )
  }

  const selectedIds = state.selectedIds
  const showPagination = !view.data?.fetchAll && state.pagination.totalPages > 1

  return (
    <ViewControllerContext.Provider value={controller}>
      <div className="dy-flex dy-flex-col dy-gap-4">
        <ViewFilterToolbar
          schema={schema}
          client={client}
          schemas={schemas}
          state={toolbar}
          data={state.documents}
          isFetching={state.isFetching}
        />

        {state.isTruncated ? (
          <p role="status" className="dy-rounded-md dy-border dy-bg-muted/40 dy-px-3 dy-py-2 dy-text-xs">
            Showing the first {CUSTOM_VIEW_FETCH_ALL_LIMIT.toLocaleString()} of {state.total.toLocaleString()} records.
            Narrow the filters to see the rest.
          </p>
        ) : null}

        {state.error ? (
          <div role="alert" className="dy-flex dy-items-center dy-justify-between dy-gap-3 dy-rounded-lg dy-border dy-border-destructive/40 dy-bg-destructive/5 dy-p-3 dy-text-sm dy-text-destructive">
            <span>{state.error.message || "Could not load records."}</span>
            <Button size="sm" variant="outline" onClick={() => void controller.handlers.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {state.isLoading ? (
          <Skeleton className="dy-h-64 dy-w-full" aria-busy="true" />
        ) : (
          <AdminComponentErrorBoundary componentKey={componentKey} slot="viewLayouts">
            <Suspense fallback={<AdminComponentFallback />}>
              <LayoutComponent collection={slug} viewSlug={view.slug} />
            </Suspense>
          </AdminComponentErrorBoundary>
        )}

        {showPagination ? (
          <div className="dy-flex dy-items-center dy-justify-end dy-gap-2 dy-text-xs dy-text-muted-foreground">
            <span className="dy-tabular-nums">
              Page {state.pagination.page} of {state.pagination.totalPages}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="dy-h-8 dy-w-8"
              aria-label="Previous page"
              disabled={state.pagination.page <= 1}
              onClick={() => controller.handlers.setPage(state.pagination.page - 1)}
            >
              <ChevronLeft className="dy-h-4 dy-w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="dy-h-8 dy-w-8"
              aria-label="Next page"
              disabled={state.pagination.page >= state.pagination.totalPages}
              onClick={() => controller.handlers.setPage(state.pagination.page + 1)}
            >
              <ChevronRight className="dy-h-4 dy-w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      <BulkActionBar
        actions={actions}
        selectedIds={selectedIds}
        isRunning={isRunningAction}
        onRun={(action, ids) =>
          void onRunAction(
            action,
            state.documents.filter((doc) => ids.includes(String(doc.id))),
          )
        }
        onClearSelection={() => controller.handlers.setSelection([])}
      />
    </ViewControllerContext.Provider>
  )
}
