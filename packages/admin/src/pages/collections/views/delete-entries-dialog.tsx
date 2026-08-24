import { Button } from "../../../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import type { DeleteDialogState } from "./use-system-ops"

interface DeleteEntriesDialogProps {
  state: DeleteDialogState
  confirmationValue: string
  onConfirmationValueChange: (value: string) => void
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirmation modal for the built-in delete operation. Auth-collection
 * deletes additionally require typing the document title.
 */
export function DeleteEntriesDialog({
  state,
  confirmationValue,
  onConfirmationValueChange,
  isPending,
  onCancel,
  onConfirm,
}: DeleteEntriesDialogProps) {
  const confirmationMatches =
    !state.requiresTypedConfirmation || confirmationValue.trim() === state.expectedValue

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:dy-max-w-lg">
        <DialogHeader>
          <DialogTitle>{state.title}</DialogTitle>
          <DialogDescription>{state.description}</DialogDescription>
        </DialogHeader>

        {state.requiresTypedConfirmation ? (
          <div className="dy-space-y-2">
            <Label htmlFor="delete-confirmation-input">
              Type <span className="dy-font-mono dy-text-foreground">{state.expectedValue}</span> to confirm
            </Label>
            <Input
              id="delete-confirmation-input"
              value={confirmationValue}
              onChange={(event) => onConfirmationValueChange(event.target.value)}
              autoFocus
            />
          </div>
        ) : null}

        <DialogFooter className="dy-flex dy-justify-end dy-gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending || !confirmationMatches}
          >
            {isPending
              ? "Deleting..."
              : state.mode === "single"
                ? "Delete entry"
                : `Delete ${state.ids.length} entr${state.ids.length === 1 ? "y" : "ies"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
