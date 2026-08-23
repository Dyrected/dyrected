import { useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import { Plus } from "lucide-react"

import { Button } from "../../../components/ui/button"
import { useDyrected } from "../../../providers/dyrected-context"
import { getSiteUrl } from "../../../lib/utils"
import { resolvePreviewUrl } from "../../../lib/preview-url"
import { useViewData } from "./use-view-data"
import { useViewMetrics } from "./use-view-metrics"
import { useViewActions } from "./use-view-actions"
import { useSystemOps } from "./use-system-ops"
import { DeleteEntriesDialog } from "./delete-entries-dialog"
import { evaluateAccess, isSystemAction, mergeWithSystemActions } from "./system-actions"
import { resolveViewFilter } from "./resolve-view-filter"
import { ViewHeader } from "./view-header"
import { MetricCards } from "./metric-cards"
import { ActionDialogs } from "./action-dialogs"
import { ExportMenu, ImportCsvDialog } from "./view-io-actions"
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
 * operations (view/edit/duplicate/delete/export), then delegates rendering to
 * the layout component selected by `view.layout`.
 */
export function OperationalViewPage({ slug, schema, view, schemas }: OperationalViewPageProps) {
  const { client, user } = useDyrected()
  const layout = view.layout ?? "table"
  const customActions = useMemo(() => (view.actions ?? []) as SerializedAction[], [view.actions])

  const { data, isLoading } = useViewData({
    slug,
    viewSlug: view.slug,
    filter: view.filter,
    sort: view.sort,
  })
  const metrics = useViewMetrics({ slug, viewSlug: view.slug, metrics: view.metrics })
  const actionRunner = useViewActions({ slug, viewSlug: view.slug })

  const canCreate = useMemo(() => evaluateAccess(schema?.access?.create, user), [schema, user])
  const canDelete = useMemo(() => evaluateAccess(schema?.access?.delete, user), [schema, user])
  const hasDetail = schema?.detail !== false

  const systemOps = useSystemOps({ slug, schema, schemas, data: data ?? [] })

  /** All actions for this view: server-defined first, built-ins after. */
  const actions = useMemo(
    () => mergeWithSystemActions(customActions, { canCreate, canDelete, hasDetail }),
    [customActions, canCreate, canDelete, hasDetail],
  )

  const handleRunAction = useCallback(
    (action: SerializedAction, ids: string[]) => {
      if (isSystemAction(action)) {
        systemOps.runSystemAction(action.operation, ids)
        return
      }
      actionRunner.initiate(action, ids)
    },
    [actionRunner, systemOps],
  )

  const resolvePreview = useCallback(
    (doc: Record<string, any>) =>
      schema?.admin?.previewUrl
        ? resolvePreviewUrl(schema.admin.previewUrl, doc, getSiteUrl((schemas as any)?.admin?.siteUrl))
        : null,
    [schema, schemas],
  )

  const headerActions = useMemo(() => actions.filter((action) => action.type === "header"), [actions])

  const layoutProps: KanbanLayoutProps | CalendarLayoutProps | CardsLayoutProps | TableLayoutProps | SpreadsheetLayoutProps = {
    slug,
    schema,
    view,
    data: data ?? [],
    isLoading,
    client,
    schemas,
    actions,
    onRunAction: handleRunAction,
  }

  return (
    <div className="dy-flex dy-flex-col dy-gap-6">
      <ViewHeader
        label={view.label}
        icon={view.icon}
        layout={layout}
        description={schema.labels ? `Collection: ${schema.labels.plural || schema.labels.singular}` : undefined}
      >
        <div className="dy-flex dy-w-full dy-flex-col dy-gap-2 sm:dy-w-auto sm:dy-flex-row sm:dy-items-center">
          <HeaderActionSlot actions={headerActions} onRun={handleRunAction} docIds={(data ?? []).map((doc) => String(doc.id))} />
          <ExportMenu
            slug={slug}
            schema={schema}
            findArgs={{ where: resolveViewFilter(view.filter), sort: sortString(view.sort) }}
            currentDocs={data ?? []}
          />
          {canCreate && <ImportCsvDialog slug={slug} schema={schema} />}
          {canCreate && (
            <Button asChild className="dy-h-8 dy-px-3 dy-text-xs">
              <Link to={`/collections/${slug}/new`}>
                <Plus className="dy-h-3.5 dy-w-3.5" />
                New {schema.labels?.singular || schema.slug}
              </Link>
            </Button>
          )}
        </div>
      </ViewHeader>

      <MetricCards
        metrics={metrics.data ?? []}
        isLoading={metrics.isLoading}
      />

      {layout === "kanban" ? (
        <KanbanLayout {...layoutProps} />
      ) : layout === "calendar" ? (
        <CalendarLayout {...layoutProps} />
      ) : layout === "cards" ? (
        <CardsLayout {...layoutProps} />
      ) : layout === "spreadsheet" ? (
        <SpreadsheetLayout
          {...(layoutProps as SpreadsheetLayoutProps)}
          resolvePreview={resolvePreview}
          hasDetail={hasDetail}
        />
      ) : (
        <TableLayout
          {...(layoutProps as TableLayoutProps)}
          resolvePreview={resolvePreview}
          hasDetail={hasDetail}
        />
      )}

      <ActionDialogs
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
    </div>
  )
}

function HeaderActionSlot({
  actions,
  onRun,
  docIds,
}: {
  actions: SerializedAction[]
  onRun: (action: SerializedAction, ids: string[]) => void
  docIds: string[]
}) {
  if (!actions.length) return null
  return (
    <>
      {actions.map((action) => (
        <button
          key={action.name}
          className="dy-inline-flex dy-h-8 dy-items-center dy-gap-1.5 dy-rounded-md dy-border dy-bg-background dy-px-3 dy-text-xs dy-font-medium hover:dy-bg-accent"
          onClick={() => onRun(action, docIds)}
        >
          {action.label}
        </button>
      ))}
    </>
  )
}

function sortString(sort?: { field: string; direction: "asc" | "desc" }): string | undefined {
  if (!sort) return undefined
  return `${sort.direction === "desc" ? "-" : ""}${sort.field}`
}
