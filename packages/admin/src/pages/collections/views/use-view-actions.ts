import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useDyrected } from "../../../providers/dyrected-context"

export interface PendingAction {
  actionName: string
  label: string
  confirm?: string
  fields?: any[]
  /** Document ids the action targets. */
  ids: string[]
}

/** Minimal shape of a serialized `defineAction` config used at call sites. */
interface ActionLike {
  name: string
  label: string
  confirm?: string
  fields?: any[]
}

/**
 * Orchestrates operational view actions end-to-end:
 * confirmation/input dialogs → `runAction` request → cache invalidation → toasts.
 *
 * Actions that declare `confirm` or input `fields` are staged in `pending`
 * first; everything else runs immediately.
 */
export function useViewActions({ slug, viewSlug }: { slug: string; viewSlug: string }) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const execute = useCallback(
    async (action: PendingAction, input?: Record<string, unknown>): Promise<boolean> => {
      if (!client) {
        toast.error(`${action.label} failed`, { description: "Dyrected client unavailable." })
        return false
      }
      setIsRunning(true)
      try {
        await (client as any).collection(slug).runAction(viewSlug, action.actionName, {
          ...(action.ids.length === 1 ? { id: action.ids[0] } : { ids: action.ids }),
          input,
        })
        const scope = action.ids.length > 1 ? `${action.ids.length} items` : undefined
        toast.success(`${action.label} completed${scope ? ` — ${scope}` : ""}`)
        await queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
        await queryClient.invalidateQueries({ queryKey: ["operational-view-metrics", slug] })
        return true
      } catch (error: any) {
        const message = error?.message || "Something went wrong while running this action."
        toast.error(`${action.label} failed`, { description: message })
        return false
      } finally {
        setIsRunning(false)
      }
    },
    [client, queryClient, slug, viewSlug],
  )

  /** Entry point for action button clicks. Stages dialogs when required. */
  const initiate = useCallback(
    (action: ActionLike, ids: string[]) => {
      if (!ids.length || !action.name) return
      const staged: PendingAction = {
        actionName: action.name,
        label: action.label,
        confirm: action.confirm,
        fields: action.fields,
        ids,
      }
      if (action.confirm || action.fields?.length) {
        setPending(staged)
        return
      }
      void execute(staged)
    },
    [execute],
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

  return { pending, isRunning, initiate, resolve, cancel, execute }
}
