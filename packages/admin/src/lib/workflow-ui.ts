import type { CollectionConfig, WorkflowConfig, WorkflowMetadata, WorkflowState, WorkflowTransition } from "@dyrected/core"

export type WorkflowDocumentLike = Record<string, unknown> & {
  id?: string
  _workflow?: WorkflowMetadata | null
}

export function resolveWorkflowState(
  workflowConfig: WorkflowConfig | null | undefined,
  workflowMeta: Pick<WorkflowMetadata, "state"> | null | undefined,
): WorkflowState | null {
  if (!workflowConfig || !workflowMeta?.state) return null
  return workflowConfig.states.find((state) => state.name === workflowMeta.state) ?? null
}

export function resolveWorkflowStateFromDocument(
  workflowConfig: WorkflowConfig | null | undefined,
  item: WorkflowDocumentLike,
): WorkflowState | null {
  return resolveWorkflowState(workflowConfig, item._workflow ?? null)
}

export type PublishingStatusSummary = {
  label: "Draft" | "Published" | "Changed"
  color: "warning" | "success" | "info"
  workflowStateLabel: string | null
}

export function resolvePublishingStatus(
  schema: CollectionConfig | undefined,
  item: Record<string, unknown>,
): PublishingStatusSummary | null {
  const hasPublishingState = !!(schema?.workflow || schema?.drafts)
  const workflowState = resolveWorkflowStateFromDocument((schema?.workflow as WorkflowConfig | undefined) ?? null, item)
  const workflowMeta = item._workflow as WorkflowMetadata | undefined

  if (workflowState) {
    const rawWorkflowLabel = (workflowState.label || workflowState.name || "").trim()
    const workflowStateLabel = rawWorkflowLabel && !["published", "draft"].includes(rawWorkflowLabel.toLowerCase())
      ? rawWorkflowLabel
      : null

    if (workflowState.published) {
      return {
        label: "Published",
        color: "success",
        workflowStateLabel,
      }
    }

    if (workflowMeta?.publishedRevision) {
      return {
        label: "Changed",
        color: "info",
        workflowStateLabel,
      }
    }

    return {
      label: "Draft",
      color: "warning",
      workflowStateLabel,
    }
  }

  if (!hasPublishingState) {
    return null
  }

  const plainStatus = item.status
  if (plainStatus === "published") {
    return { label: "Published", color: "success", workflowStateLabel: null }
  }
  if (plainStatus === "draft") {
    return { label: "Draft", color: "warning", workflowStateLabel: null }
  }
  return null
}

export function getAvailableWorkflowTransitions(
  workflowConfig: WorkflowConfig | null | undefined,
  workflowMeta: WorkflowMetadata | null | undefined,
): WorkflowTransition[] {
  if (!workflowConfig || !workflowMeta) return []
  const available = new Set(workflowMeta.availableTransitions ?? [])
  return workflowConfig.transitions.filter((transition) => available.has(transition.name))
}

export function getPrimaryWorkflowTransition(
  transitions: WorkflowTransition[],
): WorkflowTransition | null {
  if (transitions.length === 0) return null
  if (transitions.length === 1) return transitions[0] ?? null
  return transitions.find((transition) => !transition.unpublish) ?? transitions[0] ?? null
}

export type GroupedWorkflowTransitions = {
  normal: WorkflowTransition[]
  unpublish: WorkflowTransition[]
}

export function groupWorkflowTransitions(
  transitions: WorkflowTransition[],
): GroupedWorkflowTransitions {
  return transitions.reduce<GroupedWorkflowTransitions>((groups, transition) => {
    if (transition.unpublish) {
      groups.unpublish.push(transition)
    } else {
      groups.normal.push(transition)
    }
    return groups
  }, {
    normal: [],
    unpublish: [],
  })
}

export function getCommonWorkflowTransitions(
  workflowConfig: WorkflowConfig | null | undefined,
  docs: WorkflowDocumentLike[],
): WorkflowTransition[] {
  if (!workflowConfig || docs.length === 0) return []

  const availableSets = docs
    .map((doc) => doc._workflow?.availableTransitions)
    .filter((value): value is string[] => Array.isArray(value) && value.length > 0)
    .map((value) => new Set(value))

  if (availableSets.length !== docs.length) return []

  return workflowConfig.transitions.filter((transition) =>
    availableSets.every((set) => set.has(transition.name)),
  )
}
