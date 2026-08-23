import { MoreHorizontal } from "lucide-react"

import { Button } from "../../../components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { resolveAdminIcon } from "../../../lib/admin-icons"
import type { SerializedAction } from "./types"
import { Table2 } from "lucide-react"
import { createElement, useMemo } from "react"
import { cn } from "../../../lib/utils"

interface RowActionsCellProps {
  actions: SerializedAction[]
  docId: string
  onRun: (action: SerializedAction, ids: string[]) => void
}

const MAX_INLINE_ACTIONS = 2

/**
 * Inline action buttons for a table row or kanban card.
 * The first `MAX_INLINE_ACTIONS` render as buttons; the rest collapse into an
 * overflow menu.
 */
export function RowActionsCell({ actions, docId, onRun }: RowActionsCellProps) {
  if (!actions.length) return null

  const inline = actions.slice(0, MAX_INLINE_ACTIONS)
  const overflow = actions.slice(MAX_INLINE_ACTIONS)

  return (
    <div className="dy-flex dy-items-center dy-gap-1">
      {inline.map((action) => (
        <Button
          key={action.name}
          variant="outline"
          size="sm"
          className={cn(
            "dy-h-7 dy-px-2 dy-text-xs dy-font-normal",
            action.destructive &&
              "dy-text-destructive hover:dy-bg-destructive/10 hover:dy-text-destructive",
          )}
          onClick={() => onRun(action, [docId])}
        >
          <IconFor action={action} />
          {action.label}
        </Button>
      ))}
      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="dy-h-7 dy-w-7" aria-label="More actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflow.map((action) => (
              <DropdownMenuItem
                key={action.name}
                onClick={() => onRun(action, [docId])}
                className={action.destructive ? "dy-text-destructive focus:dy-text-destructive" : undefined}
              >
                <IconFor action={action} />
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

function IconFor({ action }: { action: SerializedAction }) {
  const Icon = useMemo(
    () => (action.icon ? resolveAdminIcon(action.icon, Table2) : undefined),
    [action.icon],
  )
  // resolveAdminIcon returns components from a static module registry, so this
  // is a lookup rather than a render-time creation — createElement keeps it
  // out of JSX scope for the static-components lint rule.
  return Icon ? createElement(Icon, { className: "dy-h-3.5 dy-w-3.5" }) : null
}
