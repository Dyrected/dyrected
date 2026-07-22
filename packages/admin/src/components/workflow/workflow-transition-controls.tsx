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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import {
  getAvailableWorkflowTransitions,
  getPrimaryWorkflowTransition,
  groupWorkflowTransitions,
  shouldUseSaveDraftAsPrimaryAction,
} from "../../lib/workflow-ui"

export interface WorkflowCapableClient {
  transition<T = unknown>(
    collection: string,
    id: string,
    transitionName: string,
    opts?: TransitionOptions,
  ): Promise<T>
}

export type PreparedWorkflowTransitionContext = {
  documentIds: string[]
  documentLabels?: Record<string, string | undefined>
  expectedRevisions?: Record<string, number | undefined>
  invalidateQueryKeys?: Array<readonly unknown[]>
}

export type PrepareWorkflowTransition = (
  transition: WorkflowTransition,
) => Promise<PreparedWorkflowTransitionContext | null>

type TransitionExecutionResult = {
  transition: WorkflowTransition
  successCount: number
  failureCount: number
  firstError?: Error
}

type PendingCommentTransition = {
  transition: WorkflowTransition
  context: PreparedWorkflowTransitionContext
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

function WorkflowCommentDialogBody({
  transition,
  pending,
  onConfirm,
  onCancel,
}: {
  transition: WorkflowTransition
  pending: boolean
  onConfirm: (comment: string) => void
  onCancel: () => void
}) {
  const [comment, setComment] = React.useState("")

  return (
    <DialogContent className="sm:dy-max-w-md">
      <DialogHeader>
        <DialogTitle>{transition.label}</DialogTitle>
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
          placeholder={`Required for "${transition.label}"`}
          autoFocus
        />
      </div>
      <DialogFooter className="dy-flex dy-justify-end dy-gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(comment.trim())}
          disabled={pending || !comment.trim()}
        >
          {pending ? <Loader2 className="dy-h-4 dy-w-4 dy-animate-spin" /> : transition.label}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
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
  return (
    <Dialog open={!!transition} onOpenChange={onOpenChange}>
      {transition ? (
        <WorkflowCommentDialogBody
          key={transition.name}
          transition={transition}
          pending={pending}
          onConfirm={onConfirm}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
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
  return transitions.map((transition) => {
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
  })
}

function useWorkflowTransitionExecutor({
  collection,
  documentIds,
  documentLabels,
  expectedRevisions,
  invalidateQueryKeys,
  onComplete,
  prepareTransition,
}: {
  collection: string
  documentIds: string[]
  documentLabels?: Record<string, string | undefined>
  expectedRevisions?: Record<string, number | undefined>
  invalidateQueryKeys?: Array<readonly unknown[]>
  onComplete?: (result: TransitionExecutionResult) => void
  prepareTransition?: PrepareWorkflowTransition
}) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()
  const wfClient = client as unknown as WorkflowCapableClient
  const [commentTransition, setCommentTransition] = React.useState<PendingCommentTransition | null>(null)
  const [isPreparing, setIsPreparing] = React.useState(false)

  const getDefaultContext = React.useCallback((): PreparedWorkflowTransitionContext => ({
    documentIds,
    documentLabels,
    expectedRevisions,
    invalidateQueryKeys,
  }), [documentIds, documentLabels, expectedRevisions, invalidateQueryKeys])

  const mutation = useMutation({
    mutationFn: async ({
      transition,
      comment,
      context,
    }: {
      transition: WorkflowTransition
      comment?: string
      context: PreparedWorkflowTransitionContext
    }) => {
      let successCount = 0
      let failureCount = 0
      let firstError: Error | undefined

      for (const id of context.documentIds) {
        try {
          await wfClient.transition(collection, id, transition.name, {
            expectedRevision: context.expectedRevisions?.[id],
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

      return { transition, successCount, failureCount, firstError, context }
    },
    onSuccess: async (result) => {
      setCommentTransition(null)
      const queryKeys = [...(invalidateQueryKeys ?? []), ...(result.context.invalidateQueryKeys ?? [])]
      if (queryKeys.length > 0) {
        await Promise.all(
          queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] })),
        )
      }

      if (result.failureCount === 0) {
        if (result.context.documentIds.length === 1) {
          const singleDocumentId = result.context.documentIds[0] ?? ""
          toast.success(formatSingleTransitionSuccessMessage(
            result.transition.label,
            result.context.documentLabels?.[singleDocumentId],
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

  const requestTransition = React.useCallback(async (transition: WorkflowTransition) => {
    try {
      setIsPreparing(true)
      const context = await (prepareTransition?.(transition) ?? Promise.resolve(getDefaultContext()))
      if (!context || context.documentIds.length === 0) return
      if (transition.requireComment) {
        setCommentTransition({ transition, context })
        return
      }
      mutation.mutate({ transition, context })
    } catch (error) {
      const message = error instanceof Error ? error.message : "The workflow action could not be prepared."
      toast.error("Could not continue", {
        description: message,
      })
    } finally {
      setIsPreparing(false)
    }
  }, [getDefaultContext, mutation, prepareTransition])

  const confirmComment = React.useCallback((comment: string) => {
    if (!commentTransition) return
    mutation.mutate({
      transition: commentTransition.transition,
      comment,
      context: commentTransition.context,
    })
  }, [commentTransition, mutation])

  return {
    requestTransition,
    commentTransition,
    setCommentTransition,
    confirmComment,
    mutation,
    isPreparing,
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
  prepareTransition,
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
  prepareTransition?: PrepareWorkflowTransition
}) {
  const transitions = React.useMemo(
    () => getAvailableWorkflowTransitions(workflowConfig, workflowMeta),
    [workflowConfig, workflowMeta],
  )
  const groupedTransitions = React.useMemo(
    () => groupWorkflowTransitions(transitions),
    [transitions],
  )
  const primaryTransition = React.useMemo(
    () => getPrimaryWorkflowTransition(transitions),
    [transitions],
  )
  const saveDraftIsPrimary = React.useMemo(
    () => Boolean(onSaveDraft && shouldUseSaveDraftAsPrimaryAction(workflowConfig, workflowMeta)),
    [onSaveDraft, workflowConfig, workflowMeta],
  )
  const {
    requestTransition,
    commentTransition,
    setCommentTransition,
    confirmComment,
    mutation,
    isPreparing,
  } = useWorkflowTransitionExecutor({
    collection,
    documentIds: [documentId],
    documentLabels: { [documentId]: documentLabel },
    expectedRevisions: { [documentId]: workflowMeta.revision },
    invalidateQueryKeys,
    onComplete,
    prepareTransition,
  })

  const activeTransitionName = (mutation.variables as { transition?: WorkflowTransition } | undefined)?.transition?.name
  const isPrimaryLoading = mutation.isPending && activeTransitionName === primaryTransition?.name
  const hasTransitions = transitions.length > 0
  const hasMenuItems = hasTransitions || (!!onSaveDraft && !saveDraftIsPrimary)
  const isBusy = mutation.isPending || isPreparing || !!saveDraftPending
  const primaryLabel = saveDraftIsPrimary
    ? (saveDraftPending ? "Saving draft..." : "Save draft")
    : (primaryTransition?.label ?? "No actions")
  const primaryDisabled = saveDraftIsPrimary
    ? isBusy
    : (!primaryTransition || isBusy)

  React.useEffect(() => {
    onPendingChange?.(mutation.isPending || isPreparing)
  }, [isPreparing, mutation.isPending, onPendingChange])

  return (
    <>
      <div className={cn("dy-inline-flex dy-items-center", className)}>
        <div className="dy-mx-1 dy-h-6 dy-w-px dy-bg-border/60" />
        <div className="dy-inline-flex dy-overflow-hidden dy-rounded-lg dy-border dy-border-primary/20 dy-shadow-sm">
          <Button
            size="sm"
            className="dy-h-9 dy-rounded-none dy-border-0 dy-px-4 dy-font-bold dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary/90"
            disabled={primaryDisabled}
            onClick={() => {
              if (saveDraftIsPrimary) {
                void onSaveDraft?.()
                return
              }
              if (primaryTransition) {
                void requestTransition(primaryTransition)
              }
            }}
            title={saveDraftIsPrimary ? "Save draft" : (primaryTransition?.label ?? "No workflow actions available")}
          >
            {saveDraftIsPrimary && saveDraftPending ? (
              <span className="dy-flex dy-items-center dy-gap-2">
                <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" />
                Saving draft...
              </span>
            ) : isPrimaryLoading || isPreparing ? (
              <span className="dy-flex dy-items-center dy-gap-2">
                <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" />
                {isPreparing ? "Saving…" : "Applying…"}
              </span>
            ) : (
              primaryLabel
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
              {onSaveDraft && !saveDraftIsPrimary && (
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
              )}
              {hasTransitions && (
                <>
                  {onSaveDraft && <DropdownMenuSeparator />}
                  <WorkflowTransitionActionItems
                    transitions={groupedTransitions.normal}
                    workflowConfig={workflowConfig}
                    onSelect={(transition) => {
                      void requestTransition(transition)
                    }}
                    disabled={isBusy}
                  />
                  {groupedTransitions.unpublish.length > 0 && groupedTransitions.normal.length > 0 && (
                    <DropdownMenuSeparator />
                  )}
                  <WorkflowTransitionActionItems
                    transitions={groupedTransitions.unpublish}
                    workflowConfig={workflowConfig}
                    onSelect={(transition) => {
                      void requestTransition(transition)
                    }}
                    disabled={isBusy}
                  />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <WorkflowCommentDialog
        transition={commentTransition?.transition ?? null}
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
    isPreparing,
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
            onSelect={(transition) => {
              void requestTransition(transition)
            }}
            disabled={mutation.isPending || isPreparing}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <WorkflowCommentDialog
        transition={commentTransition?.transition ?? null}
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
  onSaveDraft,
  saveDraftPending,
  prepareTransition,
}: {
  collection: string
  documentId: string
  workflowConfig: WorkflowConfig
  workflowMeta: WorkflowMetadata
  onSaveDraft?: () => Promise<void> | void
  saveDraftPending?: boolean
  prepareTransition?: PrepareWorkflowTransition
}) {
  const transitions = React.useMemo(
    () => getAvailableWorkflowTransitions(workflowConfig, workflowMeta),
    [workflowConfig, workflowMeta],
  )
  const groupedTransitions = React.useMemo(
    () => groupWorkflowTransitions(transitions),
    [transitions],
  )
  const {
    requestTransition,
    commentTransition,
    setCommentTransition,
    confirmComment,
    mutation,
    isPreparing,
  } = useWorkflowTransitionExecutor({
    collection,
    documentIds: [documentId],
    expectedRevisions: { [documentId]: workflowMeta.revision },
    invalidateQueryKeys: [
      ["entry", collection, documentId],
      ["collection", collection],
      ["workflow-history", collection, documentId],
    ],
    prepareTransition,
  })
  const activeTransitionName = (mutation.variables as { transition?: WorkflowTransition } | undefined)?.transition?.name

  if (transitions.length === 0 && !onSaveDraft) {
    return (
      <p className="dy-text-xs dy-text-muted-foreground/50 dy-italic">
        No transitions available from this state.
      </p>
    )
  }

  return (
    <>
      <div className="dy-space-y-2">
        {onSaveDraft && (
          <Button
            size="sm"
            variant="secondary"
            className="dy-w-full dy-h-9 dy-rounded-lg dy-text-xs dy-font-semibold dy-justify-start dy-gap-2"
            disabled={mutation.isPending || isPreparing || saveDraftPending}
            onClick={() => void onSaveDraft()}
          >
            {saveDraftPending ? <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" /> : <Save className="dy-h-3.5 dy-w-3.5" />}
            {saveDraftPending ? "Saving draft..." : "Save draft"}
          </Button>
        )}
        {groupedTransitions.normal.map((transition) => {
          const isLoading = mutation.isPending && activeTransitionName === transition.name
          const targetState = workflowConfig.states.find((state) => state.name === transition.to)
          return (
            <Button
              key={transition.name}
              size="sm"
              variant="default"
              className="dy-w-full dy-h-9 dy-rounded-lg dy-text-xs dy-font-semibold dy-justify-start dy-gap-2"
              disabled={mutation.isPending || isPreparing}
              onClick={() => {
                void requestTransition(transition)
              }}
            >
              {isLoading ? <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" /> : <StateIcon color={targetState?.color} />}
              {transition.label}
            </Button>
          )
        })}
        {groupedTransitions.unpublish.length > 0 && groupedTransitions.normal.length > 0 && (
          <div className="dy-px-1 dy-pt-2">
            <div className="dy-h-px dy-bg-border/60" />
          </div>
        )}
        {groupedTransitions.unpublish.map((transition) => {
          const isLoading = mutation.isPending && activeTransitionName === transition.name
          const targetState = workflowConfig.states.find((state) => state.name === transition.to)
          return (
            <Button
              key={transition.name}
              size="sm"
              variant="outline"
              className="dy-w-full dy-h-9 dy-rounded-lg dy-text-xs dy-font-semibold dy-justify-start dy-gap-2"
              disabled={mutation.isPending || isPreparing}
              onClick={() => {
                void requestTransition(transition)
              }}
            >
              {isLoading ? <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" /> : <StateIcon color={targetState?.color} />}
              {transition.label}
            </Button>
          )
        })}
      </div>
      <WorkflowCommentDialog
        transition={commentTransition?.transition ?? null}
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
