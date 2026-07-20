import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CheckCircle, ChevronDown, Loader2, MessageSquarePlus, XCircle, Clock, AlertCircle, Save } from "lucide-react"
import { toast } from "sonner"
import type { WorkflowConfig, WorkflowMetadata, WorkflowTransition } from "@dyrected/core"
import type { TransitionOptions } from "@dyrected/sdk"
import { useDyrected } from "../../providers/dyrected-context"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { cn } from "../../lib/utils"
import { getAvailableWorkflowTransitions, getPrimaryWorkflowTransition } from "../../lib/workflow-ui"

export interface WorkflowCapableClient {
  transition<T = unknown>(
    collection: string,
    id: string,
    transitionName: string,
    opts?: TransitionOptions,
  ): Promise<T>
}

type TransitionExecutionResult = {
  transition: WorkflowTransition
  successCount: number
  failureCount: number
  firstError?: Error
}

function formatSingleTransitionSuccessMessage(
  transitionLabel: string,
  documentLabel?: string,
) {
  return documentLabel?.trim()
    ? `${documentLabel}: ${transitionLabel}`
    : `${transitionLabel} completed`
}

function StateIcon({ color }: { color?: string }) {
  if (color === "success") return <CheckCircle className="dy-h-3.5 dy-w-3.5" />
  if (color === "warning") return <Clock className="dy-h-3.5 dy-w-3.5" />
  if (color === "danger") return <XCircle className="dy-h-3.5 dy-w-3.5" />
  if (color === "info") return <AlertCircle className="dy-h-3.5 dy-w-3.5" />
  return <Clock className="dy-h-3.5 dy-w-3.5" />
}

function WorkflowCommentDialog({
  transition,
  pending,
  onOpenChange,
  onConfirm,
}: {
  transition: WorkflowTransition | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (comment: string) => void
}) {
  const [comment, setComment] = React.useState("")

  React.useEffect(() => {
    if (!transition) {
      setComment("")
    }
  }, [transition])

  return (
    <Dialog open={!!transition} onOpenChange={onOpenChange}>
      <DialogContent className="sm:dy-max-w-md">
        <DialogHeader>
          <DialogTitle>{transition?.label}</DialogTitle>
          <DialogDescription>
            Add the required comment before applying this workflow transition.
          </DialogDescription>
        </DialogHeader>
        <div className="dy-space-y-2">
          <label className="dy-text-xs dy-font-semibold dy-text-muted-foreground">
            Comment
          </label>
          <textarea
            className="dy-min-h-28 dy-w-full dy-rounded-lg dy-border dy-border-border/60 dy-bg-background dy-px-3 dy-py-2 dy-text-sm dy-text-foreground placeholder:dy-text-muted-foreground focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-primary/30"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={`Required for "${transition?.label ?? "this transition"}"`}
            autoFocus
          />
        </div>
        <DialogFooter className="dy-flex dy-justify-end dy-gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(comment.trim())}
            disabled={pending || !comment.trim()}
          >
            {pending ? <Loader2 className="dy-h-4 dy-w-4 dy-animate-spin" /> : transition?.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WorkflowTransitionActionItems({
  transitions,
  workflowConfig,
  onSelect,
  disabled,
}: {
  transitions: WorkflowTransition[]
  workflowConfig: WorkflowConfig
  onSelect: (transition: WorkflowTransition) => void
  disabled?: boolean
}) {
  return (
    <>
      {transitions.map((transition) => {
        const targetState = workflowConfig.states.find((state) => state.name === transition.to)
        return (
          <DropdownMenuItem
            key={transition.name}
            onClick={() => onSelect(transition)}
            disabled={disabled}
            className="dy-flex dy-items-center dy-gap-2"
          >
            <StateIcon color={targetState?.color} />
            <span className="dy-flex-1">{transition.label}</span>
            {transition.requireComment && (
              <MessageSquarePlus className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground" />
            )}
          </DropdownMenuItem>
        )
      })}
    </>
  )
}

function useWorkflowTransitionExecutor({
  collection,
  documentIds,
  documentLabels,
  expectedRevisions,
  invalidateQueryKeys,
  onComplete,
}: {
  collection: string
  documentIds: string[]
  documentLabels?: Record<string, string | undefined>
  expectedRevisions?: Record<string, number | undefined>
  invalidateQueryKeys?: Array<readonly unknown[]>
  onComplete?: (result: TransitionExecutionResult) => void
}) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()
  const wfClient = client as unknown as WorkflowCapableClient
  const [commentTransition, setCommentTransition] = React.useState<WorkflowTransition | null>(null)

  const mutation = useMutation({
    mutationFn: async ({
      transition,
      comment,
    }: {
      transition: WorkflowTransition
      comment?: string
    }) => {
      let successCount = 0
      let failureCount = 0
      let firstError: Error | undefined

      for (const id of documentIds) {
        try {
          await wfClient.transition(collection, id, transition.name, {
            expectedRevision: expectedRevisions?.[id],
            comment,
          })
          successCount += 1
        } catch (error) {
          failureCount += 1
          if (!firstError) {
            firstError = error instanceof Error ? error : new Error(String(error))
          }
        }
      }

      return { transition, successCount, failureCount, firstError }
    },
    onSuccess: async (result) => {
      setCommentTransition(null)
      if (invalidateQueryKeys?.length) {
        await Promise.all(
          invalidateQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] })),
        )
      }

      if (result.failureCount === 0) {
        if (documentIds.length === 1) {
          toast.success(formatSingleTransitionSuccessMessage(
            result.transition.label,
            documentLabels?.[documentIds[0] ?? ""],
          ))
        } else {
          toast.success(`Applied "${result.transition.label}" to ${result.successCount} ${result.successCount === 1 ? "entry" : "entries"}`)
        }
      } else if (result.successCount === 0) {
        toast.error("Transition failed", {
          description: result.firstError?.message ?? "The workflow transition could not be completed.",
        })
      } else {
        toast(`Applied "${result.transition.label}" to ${result.successCount} entries`, {
          description: `${result.failureCount} failed. ${result.firstError?.message ?? ""}`.trim(),
        })
      }

      onComplete?.(result)
    },
    onError: (error: Error) => {
      setCommentTransition(null)
      toast.error("Transition failed", {
        description: error.message,
      })
    },
  })

  const requestTransition = React.useCallback((transition: WorkflowTransition) => {
    if (transition.requireComment) {
      setCommentTransition(transition)
      return
    }
    mutation.mutate({ transition })
  }, [mutation])

  const confirmComment = React.useCallback((comment: string) => {
    if (!commentTransition) return
    mutation.mutate({ transition: commentTransition, comment })
  }, [commentTransition, mutation])

  return {
    requestTransition,
    commentTransition,
    setCommentTransition,
    confirmComment,
    mutation,
  }
}

export function WorkflowTransitionSplitButton({
  collection,
  documentId,
  workflowConfig,
  workflowMeta,
  invalidateQueryKeys,
  onComplete,
  onPendingChange,
  onSaveDraft,
  saveDraftPending,
  documentLabel,
  className,
}: {
  collection: string
  documentId: string
  workflowConfig: WorkflowConfig
  workflowMeta: WorkflowMetadata
  invalidateQueryKeys?: Array<readonly unknown[]>
  onComplete?: (result: TransitionExecutionResult) => void
  onPendingChange?: (pending: boolean) => void
  onSaveDraft?: () => Promise<void> | void
  saveDraftPending?: boolean
  documentLabel?: string
  className?: string
}) {
  const transitions = React.useMemo(
    () => getAvailableWorkflowTransitions(workflowConfig, workflowMeta),
    [workflowConfig, workflowMeta],
  )
  const primaryTransition = React.useMemo(
    () => getPrimaryWorkflowTransition(transitions),
    [transitions],
  )
  const {
    requestTransition,
    commentTransition,
    setCommentTransition,
    confirmComment,
    mutation,
  } = useWorkflowTransitionExecutor({
    collection,
    documentIds: [documentId],
    documentLabels: { [documentId]: documentLabel },
    expectedRevisions: { [documentId]: workflowMeta.revision },
    invalidateQueryKeys,
    onComplete,
  })

  const activeTransitionName = (mutation.variables as { transition?: WorkflowTransition } | undefined)?.transition?.name
  const isPrimaryLoading = mutation.isPending && activeTransitionName === primaryTransition?.name
  const hasTransitions = transitions.length > 0
  const hasMenuItems = hasTransitions || !!onSaveDraft
  const isBusy = mutation.isPending || !!saveDraftPending

  React.useEffect(() => {
    onPendingChange?.(mutation.isPending)
  }, [mutation.isPending, onPendingChange])

  return (
    <>
      <div className={cn("dy-inline-flex dy-items-center", className)}>
        <div className="dy-mx-1 dy-h-6 dy-w-px dy-bg-border/60" />
        <div className="dy-inline-flex dy-overflow-hidden dy-rounded-lg dy-border dy-border-primary/20 dy-shadow-sm">
          <Button
            size="sm"
            className="dy-h-9 dy-rounded-none dy-border-0 dy-px-4 dy-font-bold dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary/90"
            disabled={!primaryTransition || isBusy}
            onClick={() => primaryTransition && requestTransition(primaryTransition)}
            title={primaryTransition?.label ?? "No workflow actions available"}
          >
            {isPrimaryLoading ? (
              <span className="dy-flex dy-items-center dy-gap-2">
                <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" />
                Applying…
              </span>
            ) : (
              primaryTransition?.label ?? "No actions"
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="dy-h-9 dy-rounded-none dy-border-0 dy-px-2 dy-text-primary-foreground hover:dy-bg-primary/90 hover:dy-text-primary-foreground"
                disabled={!hasMenuItems || isBusy}
                aria-label="More workflow actions"
              >
                <ChevronDown className="dy-h-4 dy-w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dy-min-w-56">
              {hasTransitions && (
                <WorkflowTransitionActionItems
                  transitions={transitions}
                  workflowConfig={workflowConfig}
                  onSelect={requestTransition}
                  disabled={isBusy}
                />
              )}
              {onSaveDraft && (
                <>
                  {hasTransitions && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={() => void onSaveDraft()}
                    disabled={isBusy}
                    className="dy-flex dy-items-center dy-gap-2"
                  >
                    {saveDraftPending ? (
                      <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" />
                    ) : (
                      <Save className="dy-h-3.5 dy-w-3.5" />
                    )}
                    <span className="dy-flex-1">
                      {saveDraftPending ? "Saving draft..." : "Save draft"}
                    </span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <WorkflowCommentDialog
        transition={commentTransition}
        pending={mutation.isPending}
        onOpenChange={(open) => !open && setCommentTransition(null)}
        onConfirm={confirmComment}
      />
    </>
  )
}

export function WorkflowTransitionMenu({
  collection,
  documentIds,
  workflowConfig,
  transitions,
  expectedRevisions,
  invalidateQueryKeys,
  onComplete,
  trigger,
  documentLabels,
  align = "end",
  sideOffset = 4,
  disabled,
}: {
  collection: string
  documentIds: string[]
  workflowConfig: WorkflowConfig
  transitions: WorkflowTransition[]
  expectedRevisions?: Record<string, number | undefined>
  invalidateQueryKeys?: Array<readonly unknown[]>
  onComplete?: (result: TransitionExecutionResult) => void
  trigger: React.ReactNode
  documentLabels?: Record<string, string | undefined>
  align?: "start" | "center" | "end"
  sideOffset?: number
  disabled?: boolean
}) {
  const {
    requestTransition,
    commentTransition,
    setCommentTransition,
    confirmComment,
    mutation,
  } = useWorkflowTransitionExecutor({
    collection,
    documentIds,
    documentLabels,
    expectedRevisions,
    invalidateQueryKeys,
    onComplete,
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled || transitions.length === 0}>
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} sideOffset={sideOffset} className="dy-min-w-56">
          <WorkflowTransitionActionItems
            transitions={transitions}
            workflowConfig={workflowConfig}
            onSelect={requestTransition}
            disabled={mutation.isPending}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <WorkflowCommentDialog
        transition={commentTransition}
        pending={mutation.isPending}
        onOpenChange={(open) => !open && setCommentTransition(null)}
        onConfirm={confirmComment}
      />
    </>
  )
}

export function WorkflowTransitionPanelActions({
  collection,
  documentId,
  workflowConfig,
  workflowMeta,
}: {
  collection: string
  documentId: string
  workflowConfig: WorkflowConfig
  workflowMeta: WorkflowMetadata
}) {
  const transitions = React.useMemo(
    () => getAvailableWorkflowTransitions(workflowConfig, workflowMeta),
    [workflowConfig, workflowMeta],
  )
  const {
    requestTransition,
    commentTransition,
    setCommentTransition,
    confirmComment,
    mutation,
  } = useWorkflowTransitionExecutor({
    collection,
    documentIds: [documentId],
    documentLabels: undefined,
    expectedRevisions: { [documentId]: workflowMeta.revision },
    invalidateQueryKeys: [
      ["entry", collection, documentId],
      ["collection", collection],
      ["workflow-history", collection, documentId],
    ],
  })
  const activeTransitionName = (mutation.variables as { transition?: WorkflowTransition } | undefined)?.transition?.name

  if (transitions.length === 0) {
    return (
      <p className="dy-text-xs dy-text-muted-foreground/50 dy-italic">
        No transitions available from this state.
      </p>
    )
  }

  return (
    <>
      <div className="dy-space-y-2">
        {transitions.map((transition) => {
          const isLoading = mutation.isPending && activeTransitionName === transition.name
          const targetState = workflowConfig.states.find((state) => state.name === transition.to)
          return (
            <Button
              key={transition.name}
              size="sm"
              variant={transition.unpublish || transition.name === "reject" ? "outline" : "default"}
              className="dy-w-full dy-h-9 dy-rounded-lg dy-text-xs dy-font-semibold dy-justify-start dy-gap-2"
              disabled={mutation.isPending}
              onClick={() => requestTransition(transition)}
            >
              {isLoading ? <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" /> : <StateIcon color={targetState?.color} />}
              {transition.label}
            </Button>
          )
        })}
      </div>
      <WorkflowCommentDialog
        transition={commentTransition}
        pending={mutation.isPending}
        onOpenChange={(open) => !open && setCommentTransition(null)}
        onConfirm={confirmComment}
      />
    </>
  )
}

export function WorkflowDetailsMenuItem({
  onSelect,
}: {
  onSelect: () => void
}) {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onSelect}>
        Workflow details
      </DropdownMenuItem>
    </>
  )
}
