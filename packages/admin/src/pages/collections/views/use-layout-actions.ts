import { useCallback, useContext, useSyncExternalStore } from "react"

import { ViewControllerContext, type ViewDocument } from "../../../providers/view-controller"
import type { SerializedAction } from "./types"

/** Extra target for a single-record or bulk action. */
export interface ActionTargetContext {
  doc?: Record<string, any>
  docs?: Record<string, any>[]
}

/**
 * Action plumbing for the built-in layouts, read from the view controller
 * instead of being threaded through props. It is the same pipeline custom
 * layouts reach through `useViewActions()`, so a confirm dialog, an input
 * form and the running state behave identically for every layout.
 */
export function useLayoutActions(): {
  /** Every action the view exposes, ordered, with built-ins resolved. */
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[], targetContext?: ActionTargetContext) => void
  /** True while `action` is executing against exactly `ids`. */
  isRunningAction: (action: SerializedAction, ids: string[]) => boolean
} {
  const controller = useContext(ViewControllerContext)
  if (!controller) {
    throw new Error("useLayoutActions() must be used inside an operational view.")
  }
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)

  const onRunAction = useCallback(
    (action: SerializedAction, ids: string[], targetContext?: ActionTargetContext) => {
      const known = controller.getState().documents
      const docs: ViewDocument[] =
        targetContext?.docs ??
        (targetContext?.doc ? [targetContext.doc] : ids.map((id) => known.find((doc) => String(doc.id) === id) ?? { id }))
      void controller.handlers.runAction(action.name, docs)
    },
    [controller],
  )

  const isRunningAction = useCallback(
    (action: SerializedAction, ids: string[]) =>
      state.runningActions.includes(`${action.name}::${[...ids].sort().join(",")}`),
    [state.runningActions],
  )

  return { actions: state.actions, onRunAction, isRunningAction }
}
