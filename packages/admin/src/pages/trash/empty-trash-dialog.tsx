import { useState } from "react"
import { AlertTriangle, Trash2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"

export interface EmptyTrashDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expectedValue: string
  title: string
  description?: string
  onConfirm: () => Promise<void>
  isPending?: boolean
}

export function EmptyTrashDialog({
  open,
  onOpenChange,
  expectedValue,
  title,
  description = "All trashed documents will be permanently deleted and cannot be recovered.",
  onConfirm,
  isPending = false,
}: EmptyTrashDialogProps) {
  const [confirmationInput, setConfirmationInput] = useState("")

  const matches = confirmationInput.trim() === expectedValue.trim()

  const handleClose = () => {
    setConfirmationInput("")
    onOpenChange(false)
  }

  const handleConfirm = async () => {
    if (!matches) return
    await onConfirm()
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="sm:dy-max-w-md">
        <DialogHeader>
          <div className="dy-flex dy-items-center dy-gap-2 dy-text-destructive">
            <AlertTriangle className="dy-h-5 dy-w-5" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="dy-space-y-3 dy-py-2">
          <div className="dy-rounded-md dy-bg-destructive/10 dy-p-3 dy-text-xs dy-text-destructive dy-border dy-border-destructive/20">
            This action is permanent and immediate. Any stored media or assets associated with these
            documents will also be permanently deleted.
          </div>

          <div className="dy-space-y-1.5">
            <Label htmlFor="empty-trash-confirmation" className="dy-text-xs">
              Type <span className="dy-font-mono dy-font-semibold dy-text-foreground">{expectedValue}</span> to confirm
            </Label>
            <Input
              id="empty-trash-confirmation"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={expectedValue}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="dy-flex dy-justify-end dy-gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!matches || isPending}
            className="dy-gap-1.5"
          >
            <Trash2 className="dy-h-4 dy-w-4" />
            <span>{isPending ? "Emptying trash..." : "Empty trash forever"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
