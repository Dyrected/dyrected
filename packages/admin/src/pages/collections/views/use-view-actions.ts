import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useDyrected } from "../../../providers/dyrected-context"

export interface ActionTargetContext {
  doc?: Record<string, any>
  docs?: Record<string, any>[]
}

export interface PendingAction {
  actionName: string
  label: string
  confirm?: string
  submitLabel?: string
  fields?: any[]
  /** Document ids the action targets. */
  ids: string[]
  /** Target document (for single-record actions). */
  doc?: Record<string, any>
  /** Target documents (for bulk actions). */
  docs?: Record<string, any>[]
}

/** Minimal shape of a serialized `defineAction` config used at call sites. */
interface ActionLike {
  name: string
  label: string
  confirm?: string
  submitLabel?: string
  fields?: any[]
}

/**
 * The confirm/input-dialog → request → toast state machine shared by every
 * action runner, regardless of where the request itself goes (a view-scoped
 * `runAction`, a view-less `runCollectionAction`, or anything else). Callers
 * supply `runRequest` (how to actually execute the action) and `onSuccess`
 * (which caches to invalidate) — the staging, confirm/fields dialogs, and
 * running-state tracking never change.
 */
function useActionRunner(options: {
  runRequest: (action: PendingAction, input?: Record<string, unknown>) => Promise<unknown>
  onSuccess?: (action: PendingAction) => void | Promise<void>
}) {
  const { runRequest, onSuccess } = options
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [runningKey, setRunningKey] = useState<string | null>(null)

  const keyOf = useCallback(
    (actionName: string, ids: string[]) => `${actionName}::${[...ids].sort().join(",")}`,
    [],
  )

  const execute = useCallback(
    async (action: PendingAction, input?: Record<string, unknown>): Promise<boolean> => {
      setRunningKey(keyOf(action.actionName, action.ids))
      try {
        await runRequest(action, input)
        const scope = action.ids.length > 1 ? `${action.ids.length} items` : undefined
        toast.success(`${action.label} completed${scope ? ` — ${scope}` : ""}`)
        await onSuccess?.(action)
        return true
      } catch (error: any) {
        const message = error?.message || "Something went wrong while running this action."
        toast.error(`${action.label} failed`, { description: message })
        return false
      } finally {
        setRunningKey(null)
      }
    },
    [runRequest, onSuccess, keyOf],
  )

  /** Entry point for action button clicks. Stages dialogs when required. */
  const initiate = useCallback(
    (action: ActionLike, ids: string[], targetContext?: ActionTargetContext) => {
      if (!ids.length || !action.name) return
      if (runningKey === keyOf(action.name, ids)) return
      const staged: PendingAction = {
        actionName: action.name,
        label: action.label,
        confirm: action.confirm,
        submitLabel: action.submitLabel,
        fields: action.fields,
        ids,
        doc: targetContext?.doc,
        docs: targetContext?.docs,
      }
      if (action.confirm || action.fields?.length) {
        setPending(staged)
        return
      }
      void execute(staged)
    },
    [execute, keyOf, runningKey],
  )

  /** Runs the currently staged action with optional form input. */
  const resolve = useCallback(
    async (input?: Record<string, unknown>) => {
      if (!pending) return
      const staged = pending
      setPending(null)
      await execute(staged, input)
    },
    [pending, execute],
  )

  const cancel = useCallback(() => setPending(null), [])

  /** Whether any action is executing (coarse flag for dialogs/overlays). */
  const isRunning = runningKey !== null

  /** Whether a specific action × selection is currently executing. */
  const isActionRunning = useCallback(
    (actionName: string, ids: string[]) => runningKey === keyOf(actionName, ids),
    [runningKey, keyOf],
  )

  return { pending, isRunning, initiate, resolve, cancel, execute, isActionRunning }
}

/**
 * Orchestrates operational view actions end-to-end:
 * confirmation/input dialogs → `runAction` request → cache invalidation → toasts.
 *
 * Actions that declare `confirm` or input `fields` are staged in `pending`
 * first; everything else runs immediately. The in-flight action is tracked so
 * triggering buttons can render loading states.
 */
export function useViewActions({ slug, viewSlug }: { slug: string; viewSlug: string }) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()

  return useActionRunner({
    runRequest: (action, input) => {
      if (!client) throw new Error("Dyrected client unavailable.")
      return (client as any).collection(slug).runAction(viewSlug, action.actionName, {
        ...(action.ids.length === 1 ? { id: action.ids[0] } : { ids: action.ids }),
        input,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
      await queryClient.invalidateQueries({ queryKey: ["operational-view-metrics", slug] })
    },
  })
}

/**
 * Same action-running pipeline as `useViewActions`, but for collection-root
 * actions (`collection.actions`) that run against a single document
 * independent of any view — used by the Detail View page and by the
 * Detail-First drawers (join field / detail-repeat), which share this exact
 * context (doc, client, user) with the full Detail View.
 */
export function useCollectionActions({ slug, onSuccess }: { slug: string; onSuccess?: () => void | Promise<void> }) {
  const { client } = useDyrected()

  return useActionRunner({
    runRequest: (action, input) => {
      if (!client) throw new Error("Dyrected client unavailable.")
      return (client as any).collection(slug).runCollectionAction(action.actionName, {
        ...(action.ids.length === 1 ? { id: action.ids[0] } : { ids: action.ids }),
        input,
      })
    },
    onSuccess,
  })
}
