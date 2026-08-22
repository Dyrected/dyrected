import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import { Button } from "../../../components/ui/button"

interface ActionConfirmDialogProps {
  open: boolean
  label: string
  confirm?: string
  isRunning: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmation modal shown when an action declares `confirm`.
 * Confirming runs the action immediately.
 */
export function ActionConfirmDialog({ open, label, confirm, isRunning, onConfirm, onCancel }: ActionConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onCancel() : undefined)}>
      <DialogContent className="dy-sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{confirm || label}</DialogTitle>
          {confirm && <DialogDescription>{label}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="dy-gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isRunning}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={isRunning}>
            {isRunning && <Loader2 className="dy-mr-1 dy-h-3.5 dy-w-3.5 dy-animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
