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
  submitLabel?: string
  isRunning: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmation modal shown when an action declares `confirm`.
 * Confirming runs the action immediately.
 */
export function ActionConfirmDialog({ open, label, confirm, submitLabel, isRunning, onConfirm, onCancel }: ActionConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onCancel() : undefined)}>
      <DialogContent className="dy-flex dy-flex-col dy-p-0 dy-overflow-hidden sm:dy-max-w-md">
        <div className="sm:dy-hidden dy-pt-3 dy-pb-1 dy-flex dy-justify-center dy-shrink-0">
          <div className="dy-h-1.5 dy-w-12 dy-rounded-full dy-bg-muted-foreground/30" />
        </div>
        <div className="dy-px-5 dy-pt-4 sm:dy-px-6 sm:dy-pt-6 dy-pb-4">
          <DialogHeader className="dy-text-left">
            <DialogTitle className="dy-text-base sm:dy-text-lg">{confirm || label}</DialogTitle>
            {confirm && <DialogDescription className="dy-mt-1.5 dy-text-xs sm:dy-text-sm">{label}</DialogDescription>}
          </DialogHeader>
        </div>
        <DialogFooter className="dy-px-5 dy-py-3.5 sm:dy-px-6 sm:dy-py-4 dy-border-t dy-border-border/40 dy-bg-muted/20 dy-gap-2 dy-shrink-0">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isRunning}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={isRunning}>
            {isRunning && <Loader2 className="dy-mr-1 dy-h-3.5 dy-w-3.5 dy-animate-spin" />}
            {submitLabel || "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
