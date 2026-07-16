import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle, Clock, AlertCircle, XCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { useDyrected } from "../../providers/dyrected-context"
import { Button } from "../ui/button"
import { cn } from "../../lib/utils"
import type { WorkflowMetadata } from "@dyrected/core"
import type { PaginatedResult, TransitionOptions, WorkflowHistoryEntry } from "@dyrected/sdk"

/** Subset of DyrectedClient that covers the workflow methods added in this release. */
interface WorkflowCapableClient {
  workflowHistory(
    collection: string,
    id: string,
    args?: { limit?: number },
  ): Promise<PaginatedResult<WorkflowHistoryEntry>>
  transition<T = unknown>(
    collection: string,
    id: string,
    transitionName: string,
    opts?: TransitionOptions,
  ): Promise<T>
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

// ─── Comment Dialog ───────────────────────────────────────────────────────────

function CommentDialog({
  transitionLabel,
  onConfirm,
  onCancel,
  isPending,
}: {
  transitionLabel: string
  onConfirm: (comment: string) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [comment, setComment] = useState("")
  return (
    <div className="dy-mt-3 dy-space-y-2">
      <label className="dy-text-xs dy-font-medium dy-text-muted-foreground">
        Comment <span className="dy-text-destructive">*</span>
      </label>
      <textarea
        className="dy-w-full dy-rounded-lg dy-border dy-border-border/60 dy-bg-background dy-px-3 dy-py-2 dy-text-sm dy-text-foreground placeholder:dy-text-muted-foreground focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-primary/30 dy-resize-none"
        rows={3}
        placeholder={`Required for "${transitionLabel}"…`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        autoFocus
      />
      <div className="dy-flex dy-gap-2">
        <Button
          size="sm"
          className="dy-h-8 dy-px-3 dy-rounded-lg dy-text-xs dy-font-semibold"
          disabled={!comment.trim() || isPending}
          onClick={() => onConfirm(comment.trim())}
        >
          {isPending ? <Loader2 className="dy-h-3 dy-w-3 dy-animate-spin" /> : transitionLabel}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="dy-h-8 dy-px-3 dy-rounded-lg dy-text-xs"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkflowPanel({
  collection,
  documentId,
  workflowMeta,
  workflowConfig,
}: WorkflowPanelProps) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()
  const [showHistory, setShowHistory] = useState(false)
  const [pendingComment, setPendingComment] = useState<string | null>(null) // transition name awaiting comment

  const currentState = workflowConfig.states.find((s) => s.name === workflowMeta.state)
  const colors = stateColors(currentState?.color)

  // Available transitions come from the server (already capability-filtered per user)
  const available = workflowMeta.availableTransitions ?? []
  const availableTransitions = workflowConfig.transitions.filter((t) =>
    available.includes(t.name),
  )

  const wfClient = client as unknown as WorkflowCapableClient

  const { data: historyResult, isLoading: historyLoading } = useQuery({
    queryKey: ["workflow-history", collection, documentId],
    queryFn: () => wfClient.workflowHistory(collection, documentId, { limit: 20 }),
    enabled: showHistory && !!client,
  })
  const history: WorkflowHistoryEntry[] = historyResult?.docs ?? []

  // ── Transition mutation ─────────────────────────────────────────────────
  const transitionMutation = useMutation({
    mutationFn: ({ name, comment }: { name: string; comment?: string }) =>
      wfClient.transition(collection, documentId, name, {
        expectedRevision: workflowMeta.revision,
        comment,
      }),
    onSuccess: () => {
      setPendingComment(null)
      queryClient.invalidateQueries({ queryKey: ["entry", collection, documentId] })
      queryClient.invalidateQueries({ queryKey: ["workflow-history", collection, documentId] })
      toast.success("Transition applied")
    },
    onError: (err: Error) => {
      setPendingComment(null)
      toast.error("Transition failed", { description: err.message })
    },
  })

  function handleTransitionClick(t: WorkflowTransition) {
    if (t.requireComment) {
      setPendingComment(t.name)
    } else {
      transitionMutation.mutate({ name: t.name })
    }
  }

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
      {availableTransitions.length > 0 && (
        <div className="dy-space-y-2">
          {availableTransitions.map((t) => {
            const isWaiting = pendingComment === t.name
            const isLoading =
              transitionMutation.isPending &&
              (transitionMutation.variables as Record<string, unknown> | undefined)?.name === t.name

            return (
              <div key={t.name}>
                <Button
                  size="sm"
                  variant={
                    t.unpublish || t.name === "reject" ? "outline" : "default"
                  }
                  className={cn(
                    "dy-w-full dy-h-9 dy-rounded-lg dy-text-xs dy-font-semibold dy-justify-start dy-gap-2",
                    isWaiting && "dy-ring-2 dy-ring-primary/30",
                  )}
                  disabled={transitionMutation.isPending}
                  onClick={() => handleTransitionClick(t)}
                >
                  {isLoading ? (
                    <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" />
                  ) : (
                    <StateIcon
                      color={
                        workflowConfig.states.find((s) => s.name === t.to)?.color
                      }
                    />
                  )}
                  {t.label}
                </Button>

                {isWaiting && (
                  <CommentDialog
                    transitionLabel={t.label}
                    isPending={transitionMutation.isPending}
                    onConfirm={(comment) =>
                      transitionMutation.mutate({ name: t.name, comment })
                    }
                    onCancel={() => setPendingComment(null)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {available.length === 0 && (
        <p className="dy-text-xs dy-text-muted-foreground/50 dy-italic">
          No transitions available from this state.
        </p>
      )}

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
