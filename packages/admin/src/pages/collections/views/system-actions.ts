import jexl from "jexl"

import type { SerializedAction, SystemOperation, ViewActionFeatures } from "./types"

export function isSystemAction(
  action: SerializedAction,
): action is SerializedAction & { operation: SystemOperation } {
  return typeof action.operation === "string"
}

/**
 * Evaluates a collection access rule (`false` denies, a Jexl string evaluates
 * against `{ user }` — plus the document when one is in scope; anything else
 * allows). Mirrors the list-view access model.
 */
export function evaluateAccess(
  access: unknown,
  user: Record<string, unknown> | null | undefined,
  doc?: Record<string, unknown>,
): boolean {
  if (access === false) return false
  if (typeof access === "string") {
    try {
      return !!jexl.evalSync(access, doc ? { user, ...doc } : { user })
    } catch (error) {
      console.warn("Access rule evaluation failed:", error)
      return true
    }
  }
  return true
}

/** Built-in operation metadata: name → serialized action template. */
const BUILTINS: Array<{
  key: keyof ViewActionFeatures
  name: string
  label: string
  icon: string
  type: NonNullable<SerializedAction["type"]>
  operation: SystemOperation
  destructive?: boolean
}> = [
  { key: "view", name: "__view", label: "View", icon: "Eye", type: "row", operation: "view" },
  { key: "edit", name: "__edit", label: "Edit", icon: "Pencil", type: "row", operation: "edit" },
  { key: "delete", name: "__delete", label: "Delete", icon: "Trash2", type: "row", operation: "delete", destructive: true },
  { key: "duplicate", name: "__duplicate", label: "Duplicate", icon: "Copy", type: "row", operation: "duplicate" },
  { key: "delete", name: "__delete-bulk", label: "Delete selected", icon: "Trash2", type: "bulk", operation: "delete", destructive: true },
  { key: "exportSelected", name: "__export-selected", label: "Export selected", icon: "FileDown", type: "bulk", operation: "export-selected" },
]

export interface SystemActionOptions {
  canCreate: boolean
  canDelete: boolean
  hasDetail: boolean
  features?: ViewActionFeatures
}

/**
 * Builds the enabled built-in actions in canonical priority order.
 *
 * `row` comes back as [view, edit, delete, duplicate] so resolvers can
 * interleave custom actions between Delete and Duplicate — keeping
 * View · Edit · Delete inline ahead of everything else by default.
 * `bulk` comes back as [delete-bulk, export-selected] to append after any
 * custom bulk actions.
 */
export function createBuiltinActions(options: SystemActionOptions): {
  row: SerializedAction[]
  bulk: SerializedAction[]
} {
  const features = options.features ?? {}

  const make = (
    key: keyof ViewActionFeatures,
    matchName: string,
    extraGate?: boolean,
  ): SerializedAction | null => {
    const builtin = BUILTINS.find((candidate) => candidate.name === matchName)
    if (!builtin || features[key] === false || extraGate === false) return null
    if (key === "view" && !options.hasDetail) return null
    if (key === "duplicate" && !options.canCreate) return null
    if (key === "delete" && !options.canDelete) return null

    return {
      name: builtin.name,
      label: builtin.label,
      icon: builtin.icon,
      type: builtin.type,
      destructive: builtin.destructive,
      operation: builtin.operation,
    }
  }

  const row = [
    make("view", "__view"),
    make("edit", "__edit"),
    make("delete", "__delete"),
    make("duplicate", "__duplicate"),
  ].filter((action): action is SerializedAction => action !== null)

  const bulk = [
    make("delete", "__delete-bulk"),
    make("exportSelected", "__export-selected"),
  ].filter((action): action is SerializedAction => action !== null)

  return { row, bulk }
}
