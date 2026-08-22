import { useCallback, useMemo } from "react"

import { useDyrected } from "../../../providers/dyrected-context"
import { useViewData } from "./use-view-data"
import { useViewMetrics } from "./use-view-metrics"
import { useViewActions } from "./use-view-actions"
import { ViewHeader } from "./view-header"
import { MetricCards } from "./metric-cards"
import { ActionDialogs } from "./action-dialogs"
import type { SerializedAction, SerializedView } from "./types"
import { TableLayout, type TableLayoutProps } from "./table/table-layout"
import { KanbanLayout, type KanbanLayoutProps } from "./kanban/kanban-layout"
import { CalendarLayout, type CalendarLayoutProps } from "./calendar/calendar-layout"
import { CardsLayout, type CardsLayoutProps } from "./cards/cards-layout"

export interface OperationalViewPageProps {
  slug: string
  schema: any
  view: SerializedView
  schemas: unknown
}

/**
 * Orchestrator for an operational view workspace.
 *
 * Owns the shared data/metrics/action plumbing and delegates rendering to the
 * layout component selected by `view.layout`.
 */
export function OperationalViewPage({ slug, schema, view, schemas }: OperationalViewPageProps) {
  const { client } = useDyrected()
  const layout = view.layout ?? "table"
  const actions = useMemo(() => (view.actions ?? []) as SerializedAction[], [view.actions])

  const { data, isLoading } = useViewData({
    slug,
    viewSlug: view.slug,
    filter: view.filter,
    sort: view.sort,
  })
  const metrics = useViewMetrics({ slug, viewSlug: view.slug, metrics: view.metrics })
  const actionRunner = useViewActions({ slug, viewSlug: view.slug })

  const headerActions = useMemo(() => actions.filter((action) => action.type === "header"), [actions])

  const handleRunAction = useCallback(
    (action: SerializedAction, ids: string[]) => actionRunner.initiate(action, ids),
    [actionRunner],
  )

  const layoutProps: KanbanLayoutProps | CalendarLayoutProps | CardsLayoutProps | TableLayoutProps = {
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
        <HeaderActionSlot actions={headerActions} onRun={handleRunAction} docIds={(data ?? []).map((doc) => String(doc.id))} />
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
      ) : (
        <TableLayout {...layoutProps} />
      )}

      <ActionDialogs
        pending={actionRunner.pending}
        isRunning={actionRunner.isRunning}
        onResolve={(input) => void actionRunner.resolve(input)}
        onCancel={actionRunner.cancel}
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
