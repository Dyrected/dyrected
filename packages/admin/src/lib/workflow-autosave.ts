export const DEFAULT_WORKFLOW_AUTOSAVE_DELAY_MS = 1500

type WorkflowAutosaveAdminConfig = {
  autosave?: boolean
  autosaveDelayMs?: number
} & Record<string, unknown>

type WorkflowAutosaveCollectionLike = {
  workflow?: unknown
  drafts?: boolean
  admin?: WorkflowAutosaveAdminConfig
}

export type WorkflowAutosaveState =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "conflict"

export function isWorkflowEnabledCollection(
  collection?: WorkflowAutosaveCollectionLike | null,
): boolean {
  return Boolean(collection?.workflow || collection?.drafts)
}

export function resolveWorkflowAutosaveSettings(
  collection?: WorkflowAutosaveCollectionLike | null,
): { enabled: boolean; delayMs: number } {
  const workflowEnabled = isWorkflowEnabledCollection(collection)
  if (!workflowEnabled) {
    return {
      enabled: false,
      delayMs: DEFAULT_WORKFLOW_AUTOSAVE_DELAY_MS,
    }
  }

  return {
    enabled: collection?.admin?.autosave !== false,
    delayMs: collection?.admin?.autosaveDelayMs ?? DEFAULT_WORKFLOW_AUTOSAVE_DELAY_MS,
  }
}

export function classifyWorkflowAutosaveError(
  error: unknown,
): Extract<WorkflowAutosaveState, "error" | "conflict"> {
  const statusCode = typeof error === "object" && error !== null && "statusCode" in error
    ? (error as { statusCode?: unknown }).statusCode
    : undefined

  return statusCode === 409 ? "conflict" : "error"
}
