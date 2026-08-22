import * as React from "react"

import { X } from "lucide-react"

import { Button } from "../../../components/ui/button"
import { Separator } from "../../../components/ui/separator"
import { resolveAdminIcon } from "../../../lib/admin-icons"
import type { SerializedAction } from "./types"

interface BulkActionBarProps {
  /** Bulk-type actions available in the current view. */
  actions: SerializedAction[]
  selectedIds: string[]
  onRun: (action: SerializedAction, ids: string[]) => void
  onClearSelection: () => void
}

/**
 * Floating bar shown at the bottom while rows are selected.
 * Runs `bulk`-type actions against the whole selection.
 */
export function BulkActionBar({ actions, selectedIds, onRun, onClearSelection }: BulkActionBarProps) {
  const bulkActions = actions.filter((action) => (action.type ?? "row") === "bulk")

  return (
    <div className="dy-fixed dy-inset-x-0 dy-bottom-4 dy-z-50 dy-mx-auto dy-flex dy-w-fit dy-items-center dy-gap-2 dy-rounded-md dy-border dy-bg-background dy-p-2 dy-pl-3 dy-shadow-lg">
      <p className="dy-whitespace-nowrap dy-text-xs dy-font-medium dy-tabular-nums">
        {selectedIds.length} selected
      </p>
      <Separator orientation="vertical" className="data-[orientation=vertical]:dy-h-5" />
      <div className="dy-flex dy-items-center dy-gap-1.5">
        {bulkActions.length ? (
          bulkActions.map((action) => (
            <BulkActionButton key={action.name} action={action} selectedIds={selectedIds} onRun={onRun} />
          ))
        ) : (
          <span className="dy-text-xs dy-text-muted-foreground">No bulk actions configured</span>
        )}
      </div>
      <Separator orientation="vertical" className="data-[orientation=vertical]:dy-h-5" />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Clear selection"
        className="dy-h-8 dy-w-8"
        onClick={onClearSelection}
      >
        <X />
      </Button>
    </div>
  )
}

function BulkActionButton({
  action,
  selectedIds,
  onRun,
}: {
  action: SerializedAction
  selectedIds: string[]
  onRun: (action: SerializedAction, ids: string[]) => void
}) {
  const Icon = React.useMemo(
    () => (action.icon ? resolveAdminIcon(action.icon, X) : null),
    [action.icon],
  )
  return (
    <Button size="sm" variant="outline" onClick={() => onRun(action, selectedIds)}>
      {/* Registry lookup, not a render-time creation — see IconFor in row-actions-cell. */}
      {Icon ? React.createElement(Icon, { className: "dy-h-4 dy-w-4" }) : null}
      {action.label}
    </Button>
  )
}
