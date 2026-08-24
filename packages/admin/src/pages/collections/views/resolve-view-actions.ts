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
    const rankA =
      rank.get(a.name) ??
      (a.operation ? rank.get(a.operation) : undefined) ??
      rank.get(a.name.replace(/^__/, "")) ??
      Number.MAX_SAFE_INTEGER
    const rankB =
      rank.get(b.name) ??
      (b.operation ? rank.get(b.operation) : undefined) ??
      rank.get(b.name.replace(/^__/, "")) ??
      Number.MAX_SAFE_INTEGER
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
  // View-level feature toggles win over any defaults the caller supplied.
  const builtins = createBuiltinActions({
    ...options,
    features: { ...options.features, ...view.features },
  })

  const inlineBuiltins = builtins.row.filter((action) => action.operation !== "duplicate")
  const trailingBuiltins = builtins.row.filter((action) => action.operation === "duplicate")
  const customRows = customs.filter((action) => (action.type ?? "row") === "row")

  const rowActions = applyOrder(
    [
      ...inlineBuiltins,
      ...customRows,
      ...trailingBuiltins,
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
