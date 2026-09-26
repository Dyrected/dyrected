import React, { useState, useEffect } from "react"
import { AlertCircle, RotateCcw } from "lucide-react"

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
import type { TrashConflict, TrashEntrySnapshot } from "./trash-types"

export interface RestoreConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: TrashEntrySnapshot | null
  conflicts: TrashConflict[]
  onConfirmOverrides: (overrides: Record<string, unknown>) => Promise<void>
  isPending?: boolean
}

export function RestoreConflictDialog({
  open,
  onOpenChange,
  entry,
  conflicts,
  onConfirmOverrides,
  isPending = false,
}: RestoreConflictDialogProps) {
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open || !entry) {
      setOverrides({})
      return
    }

    const initial: Record<string, string> = {}
    for (const c of conflicts) {
      const originalValue = (entry.snapshot?.[c.field] ?? c.value) as unknown
      initial[c.field] = originalValue !== undefined && originalValue !== null ? String(originalValue) : ""
    }
    setOverrides(initial)
  }, [open, entry, conflicts])

  if (!entry) return null

  const handleFieldChange = (field: string, value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(overrides)) {
      payload[k] = v
    }
    await onConfirmOverrides(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:dy-max-w-lg">
        <DialogHeader>
          <div className="dy-flex dy-items-center dy-gap-2 dy-text-amber-600 dark:dy-text-amber-400">
            <AlertCircle className="dy-h-5 dy-w-5" />
            <DialogTitle>Restore Conflict</DialogTitle>
          </div>
          <DialogDescription>
            This document cannot be restored with its original values because one or more unique
            fields are currently used by another active document.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="dy-space-y-4 dy-py-2">
          <div className="dy-rounded-md dy-bg-amber-500/10 dy-p-3 dy-text-xs dy-space-y-1.5 dy-border dy-border-amber-500/20">
            <span className="dy-font-semibold dy-text-amber-800 dark:dy-text-amber-300">
              Conflicting Fields:
            </span>
            <ul className="dy-list-disc dy-list-inside dy-text-amber-700 dark:dy-text-amber-400">
              {conflicts.map((c, i) => (
                <li key={i}>
                  Field <span className="dy-font-mono dy-font-semibold">{c.field}</span>: value{" "}
                  <span className="dy-font-mono dy-font-semibold">"{String(c.value)}"</span> already exists
                </li>
              ))}
            </ul>
          </div>

          <div className="dy-space-y-3">
            <h4 className="dy-text-xs dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground">
              Provide New Values to Restore
            </h4>
            {conflicts.map((c) => (
              <div key={c.field} className="dy-space-y-1.5">
                <Label htmlFor={`conflict-${c.field}`} className="dy-text-xs">
                  {c.field} (New unique value)
                </Label>
                <Input
                  id={`conflict-${c.field}`}
                  value={overrides[c.field] ?? ""}
                  onChange={(e) => handleFieldChange(c.field, e.target.value)}
                  placeholder={`Enter new ${c.field}`}
                  required
                  autoFocus
                />
              </div>
            ))}
          </div>

          <DialogFooter className="dy-flex dy-justify-end dy-gap-2 dy-pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || Object.values(overrides).some((v) => !v.trim())}
              className="dy-gap-1.5"
            >
              <RotateCcw className="dy-h-4 dy-w-4" />
              <span>{isPending ? "Restoring..." : "Restore with changes"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
