import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react"
import { useDyrected } from "../../providers/dyrected-context"
import { cn } from "../../lib/utils"
import type { WorkflowMetadata } from "@dyrected/core"
import type { PaginatedResult, WorkflowHistoryEntry } from "@dyrected/sdk"
import { WorkflowTransitionPanelActions, type WorkflowCapableClient } from "./workflow-transition-controls"

interface WorkflowHistoryCapableClient extends WorkflowCapableClient {
  workflowHistory(
    collection: string,
    id: string,
    args?: { limit?: number },
  ): Promise<PaginatedResult<WorkflowHistoryEntry>>
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkflowState {
  name: string
  label: string
  color?: "neutral" | "warning" | "success" | "danger" | "info"
  published?: boolean
}

interface WorkflowTransition {
  name: string
  label: string
  from: string | string[]
  to: string
  requiredCapabilities?: string[]
  requireComment?: boolean
  unpublish?: boolean
}

interface WorkflowConfig {
  initialState: string
  states: WorkflowState[]
  transitions: WorkflowTransition[]
}

// Local config types matching Server Schema

interface WorkflowPanelProps {
  collection: string
  documentId: string
  workflowMeta: WorkflowMetadata & { availableTransitions?: string[] }
  workflowConfig: WorkflowConfig
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  success: {
    bg: "dy-bg-emerald-50 dy-border-emerald-200 dark:dy-bg-emerald-500/12 dark:dy-border-emerald-500/30",
    text: "dy-text-emerald-700 dark:dy-text-emerald-300",
    dot: "dy-bg-emerald-500 dark:dy-bg-emerald-400",
  },
  warning: {
    bg: "dy-bg-amber-50 dy-border-amber-200 dark:dy-bg-amber-500/12 dark:dy-border-amber-500/30",
    text: "dy-text-amber-700 dark:dy-text-amber-300",
    dot: "dy-bg-amber-500 dark:dy-bg-amber-400",
  },
  danger: {
    bg: "dy-bg-red-50 dy-border-red-200 dark:dy-bg-red-500/12 dark:dy-border-red-500/30",
    text: "dy-text-red-700 dark:dy-text-red-300",
    dot: "dy-bg-red-500 dark:dy-bg-red-400",
  },
  info: {
    bg: "dy-bg-blue-50 dy-border-blue-200 dark:dy-bg-blue-500/12 dark:dy-border-blue-500/30",
    text: "dy-text-blue-700 dark:dy-text-blue-300",
    dot: "dy-bg-blue-500 dark:dy-bg-blue-400",
  },
  neutral: {
    bg: "dy-bg-muted/40 dy-border-border/60 dark:dy-bg-muted/60 dark:dy-border-border/80",
    text: "dy-text-muted-foreground dark:dy-text-foreground/80",
    dot: "dy-bg-muted-foreground/60 dark:dy-bg-foreground/60",
  },
}

function stateColors(color?: string) {
  return STATE_COLORS[color ?? "neutral"] ?? STATE_COLORS.neutral
}

function StateIcon({ color }: { color?: string }) {
  if (color === "success") return <CheckCircle className="dy-h-3.5 dy-w-3.5" />
  if (color === "warning") return <Clock className="dy-h-3.5 dy-w-3.5" />
  if (color === "danger") return <XCircle className="dy-h-3.5 dy-w-3.5" />
  if (color === "info") return <AlertCircle className="dy-h-3.5 dy-w-3.5" />
  return <Clock className="dy-h-3.5 dy-w-3.5" />
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkflowPanel({
  collection,
  documentId,
  workflowMeta,
  workflowConfig,
}: WorkflowPanelProps) {
  const { client } = useDyrected()
  const [showHistory, setShowHistory] = useState(false)

  const currentState = workflowConfig.states.find((s) => s.name === workflowMeta.state)
  const colors = stateColors(currentState?.color)
  const wfClient = client as unknown as WorkflowHistoryCapableClient

  const { data: historyResult, isLoading: historyLoading } = useQuery({
    queryKey: ["workflow-history", collection, documentId],
    queryFn: () => wfClient.workflowHistory(collection, documentId, { limit: 20 }),
    enabled: showHistory && !!client,
  })
  const history: WorkflowHistoryEntry[] = historyResult?.docs ?? []

  return (
    <div className="dy-rounded-2xl dy-border dy-border-border/50 dy-bg-muted/10 dy-p-4 dy-space-y-4">
      {/* State badge */}
      <div className="dy-flex dy-items-center dy-justify-between">
        <p className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/50">
          Workflow
        </p>
        <div
          className={cn(
            "dy-flex dy-items-center dy-gap-1.5 dy-rounded-full dy-border dy-px-2.5 dy-py-1 dy-text-xs dy-font-semibold",
            colors.bg,
            colors.text,
          )}
        >
          <StateIcon color={currentState?.color} />
          {currentState?.label ?? workflowMeta.state}
        </div>
      </div>

      {/* Revision + published info */}
      <div className="dy-flex dy-gap-4 dy-text-[11px] dy-text-muted-foreground/60">
        <span>Revision {workflowMeta.revision}</span>
        {workflowMeta.publishedAt && (
          <span>
            Published {new Date(workflowMeta.publishedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Transition buttons */}
      <WorkflowTransitionPanelActions
        collection={collection}
        documentId={documentId}
        workflowConfig={workflowConfig}
        workflowMeta={workflowMeta}
      />

      {/* History toggle */}
      <div>
        <button
          className="dy-flex dy-items-center dy-gap-1 dy-text-[11px] dy-font-medium dy-text-muted-foreground/60 hover:dy-text-muted-foreground dy-transition-colors"
          onClick={() => setShowHistory((v) => !v)}
        >
          {showHistory ? (
            <ChevronUp className="dy-h-3 dy-w-3" />
          ) : (
            <ChevronDown className="dy-h-3 dy-w-3" />
          )}
          History
        </button>

        {showHistory && (
          <div className="dy-mt-2 dy-space-y-1">
            {historyLoading && (
              <p className="dy-text-xs dy-text-muted-foreground/50 dy-py-2 dy-text-center">
                Loading…
              </p>
            )}
            {!historyLoading && history.length === 0 && (
              <p className="dy-text-xs dy-text-muted-foreground/50 dy-italic">
                No transitions yet.
              </p>
            )}
            {history.map((entry) => {
              const fromState = workflowConfig.states.find((s) => s.name === entry.from)
              const toState = workflowConfig.states.find((s) => s.name === entry.to)
              return (
                <div
                  key={entry.id}
                  className="dy-flex dy-flex-col dy-gap-0.5 dy-rounded-lg dy-border dy-border-border/40 dy-bg-background/50 dy-px-3 dy-py-2"
                >
                  <div className="dy-flex dy-items-center dy-gap-1.5 dy-text-xs dy-font-medium dy-text-foreground/80">
                    <span
                      className={cn(
                        "dy-inline-block dy-h-1.5 dy-w-1.5 dy-rounded-full",
                        stateColors(fromState?.color).dot,
                      )}
                    />
                    {fromState?.label ?? entry.from}
                    <span className="dy-text-muted-foreground/40">→</span>
                    <span
                      className={cn(
                        "dy-inline-block dy-h-1.5 dy-w-1.5 dy-rounded-full",
                        stateColors(toState?.color).dot,
                      )}
                    />
                    {toState?.label ?? entry.to}
                  </div>
                  {entry.comment && (
                    <p className="dy-text-[11px] dy-text-muted-foreground dy-italic">
                      "{entry.comment}"
                    </p>
                  )}
                  <p className="dy-text-[10px] dy-text-muted-foreground/40">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
