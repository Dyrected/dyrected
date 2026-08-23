import { createBuiltinActions, type SystemActionOptions } from "./system-actions"
import type { SerializedAction } from "./types"

export interface ResolvedViewActions {
  /** Every enabled action, resolved and ordered. */
  all: SerializedAction[]
  rowActions: SerializedAction[]
  bulkActions: SerializedAction[]
  headerActions: SerializedAction[]
}

/** Stable sort of a bucket by a configured name order; unlisted names append. */
function applyOrder(actions: SerializedAction[], order?: string[]): SerializedAction[] {
  if (!order?.length) return actions
  const rank = new Map(order.map((name, index) => [name, index]))
  return [...actions].sort((a, b) => {
    const rankA = rank.get(a.name) ?? Number.MAX_SAFE_INTEGER
    const rankB = rank.get(b.name) ?? Number.MAX_SAFE_INTEGER
    return rankA - rankB
  })
}

/**
 * Single source of truth for which actions a view exposes and in what order.
 *
 * Default row ordering keeps the primary trio inline:
 *   View · Edit · Delete · …customs… · Duplicate
 * `view.actionOrder` overrides it; `view.features` hides built-ins.
 */
export function resolveViewActions(
  view: { actions?: SerializedAction[]; features?: SystemActionOptions["features"]; actionOrder?: string[] },
  options: SystemActionOptions,
): ResolvedViewActions {
  const customs = view.actions ?? []
  const builtins = createBuiltinActions(options)

  const rowActions = applyOrder(
    [
      ...builtins.row.slice(0, -1),
      ...customs.filter((action) => (action.type ?? "row") === "row"),
      ...builtins.row.slice(-1),
    ],
    view.actionOrder,
  )

  const bulkActions = applyOrder(
    [
      ...customs.filter((action) => action.type === "bulk"),
      ...builtins.bulk,
    ],
    view.actionOrder,
  )

  const headerActions = customs.filter((action) => action.type === "header")

  return {
    rowActions,
    bulkActions,
    headerActions,
    all: [...headerActions, ...rowActions, ...bulkActions],
  }
}
