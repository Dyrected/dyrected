import { Suspense, useEffect, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { CUSTOM_VIEW_FETCH_ALL_LIMIT } from "@dyrected/core"

import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
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
import { useCustomViewSession } from "./use-custom-view-session"

export interface CustomLayoutProps {
  slug: string
  schema: any
  view: SerializedView
  /** Toolbar-derived `where` (view filter + metric chips + search). */
  toolbarWhere: Record<string, any> | undefined
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
  view,
  toolbarWhere,
  actions,
  permissions,
  hasDetail,
  runningKey,
  onRunAction,
  isRunningAction,
  renderTableFallback,
}: CustomLayoutProps) {
  const { components } = useDyrected()
  const [showTable, setShowTable] = useState(false)

  const { controller, state } = useCustomViewSession({
    slug,
    schema,
    view,
    toolbarWhere,
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
        <CustomLayoutToolbar
          search={state.search}
          onSearch={controller.handlers.setSearch}
          total={state.total}
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

function CustomLayoutToolbar({
  search,
  onSearch,
  total,
  isFetching,
}: {
  search: string
  onSearch: (query: string) => void
  total: number
  isFetching: boolean
}) {
  const [draft, setDraft] = useState(search)

  // Follow the URL when search is cleared or changed from outside (e.g. back button).
  useEffect(() => {
    setDraft((prev) => (prev === search ? prev : search))
  }, [search])

  // Debounce typing into the URL-backed search.
  useEffect(() => {
    if (draft === search) return
    const timer = setTimeout(() => onSearch(draft), 300)
    return () => clearTimeout(timer)
  }, [draft, search, onSearch])

  return (
    <div className="dy-flex dy-items-center dy-justify-between dy-gap-3">
      <div className="dy-relative dy-w-full sm:dy-max-w-xs">
        <Search className="dy-pointer-events-none dy-absolute dy-left-2.5 dy-top-2.5 dy-h-4 dy-w-4 dy-text-muted-foreground" />
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search…"
          aria-label="Search records"
          className="dy-h-9 dy-pl-8"
        />
      </div>
      <p className="dy-text-xs dy-text-muted-foreground dy-tabular-nums">
        {isFetching ? "Updating…" : `${total.toLocaleString()} ${total === 1 ? "record" : "records"}`}
      </p>
    </div>
  )
}
