import type { PendingAction } from "./use-view-actions"
import { ActionConfirmDialog } from "./action-confirm-dialog"
import { ActionFormDialog } from "./action-form-dialog"

interface ActionDialogsProps {
  collection?: string
  schemas?: unknown
  pending: PendingAction | null
  isRunning: boolean
  onResolve: (input?: Record<string, unknown>) => void
  onCancel: () => void
}

/**
 * Renders the confirmation / input-form dialog for a staged action.
 * Actions with `fields` get the form dialog (which also shows `confirm` text);
 * confirm-only actions get the simple confirmation modal.
 */
export function ActionDialogs({ collection, schemas, pending, isRunning, onResolve, onCancel }: ActionDialogsProps) {
  if (!pending) return null

  if (pending.fields?.length) {
    return (
      <ActionFormDialog
        open
        label={pending.label}
        confirm={pending.confirm}
        fields={pending.fields}
        collection={collection}
        schemas={schemas}
        isRunning={isRunning}
        onSubmit={(input) => onResolve(input)}
        onCancel={onCancel}
      />
    )
  }

  return (
    <ActionConfirmDialog
      open
      label={pending.label}
      confirm={pending.confirm}
      isRunning={isRunning}
      onConfirm={() => onResolve()}
      onCancel={onCancel}
    />
  )
}
