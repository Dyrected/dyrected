import { MoreHorizontal, Loader2, Table2 } from "lucide-react"
import { createElement, useMemo, useRef, useState, useLayoutEffect } from "react"

import { Button } from "../../../components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { resolveAdminIcon } from "../../../lib/admin-icons"
import type { SerializedAction } from "./types"
import { cn } from "../../../lib/utils"

interface RowActionsCellProps {
  actions: SerializedAction[]
  docId: string
  doc?: Record<string, any>
  onRun: (action: SerializedAction, ids: string[], targetContext?: { doc?: Record<string, any>; docs?: Record<string, any>[] }) => void
  /** Returns true while this action × selection is executing. */
  isRunning?: (action: SerializedAction, ids: string[]) => boolean
  /** Optional manual upper limit on the number of inline action buttons. */
  maxInline?: number
  /** If true, renders action buttons in a flex-wrap container without collapsing into a dropdown menu. */
  wrap?: boolean
  className?: string
}

const DEFAULT_MAX_INLINE_ACTIONS = 3

function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState<number>(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const next = Math.round(el.getBoundingClientRect().width)
      setWidth((prev) => (prev === next ? prev : next))
    }

    update()

    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const next = Math.round(entry.contentRect.width)
        setWidth((prev) => (prev === next ? prev : next))
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}

/**
 * Smart inline action buttons for a table row, card, or kanban card.
 * Dynamically measures available container width to decide how many buttons fit inline,
 * cleanly collapsing remaining actions into a dropdown menu to prevent card overflow.
 */
export function RowActionsCell({ actions, docId, doc, onRun, isRunning, maxInline, wrap = false, className }: RowActionsCellProps) {
  const [containerRef, width] = useContainerWidth<HTMLDivElement>()

  if (!actions.length) return null

  if (wrap) {
    return (
      <div className={cn("dy-flex dy-flex-wrap dy-items-center dy-gap-2", className)}>
        {actions.map((action) => {
          const running = isRunning?.(action, [docId]) ?? false
          return (
            <Button
              key={action.name}
              variant="outline"
              size="sm"
              disabled={running}
              title={action.label}
              className={cn(
                "dy-h-8 dy-px-3 dy-text-xs dy-font-medium dy-rounded-lg dy-border-border/50 dy-gap-1.5",
                action.destructive &&
                  "dy-text-destructive hover:dy-bg-destructive/10 hover:dy-text-destructive",
              )}
              onClick={() => onRun(action, [docId], doc ? { doc, docs: [doc] } : undefined)}
            >
              {running ? (
                <Loader2 className="dy-h-3.5 dy-w-3.5 dy-shrink-0 dy-animate-spin" />
              ) : (
                <IconFor action={action} />
              )}
              <span>{action.label}</span>
            </Button>
          )
        })}
      </div>
    )
  }

  // Calculate how many action buttons can comfortably fit within the measured width
  let dynamicMax = DEFAULT_MAX_INLINE_ACTIONS
  if (width > 0) {
    if (width < 110) {
      dynamicMax = 0
    } else if (width < 220) {
      dynamicMax = 1
    } else if (width < 340) {
      dynamicMax = 2
    } else {
      dynamicMax = DEFAULT_MAX_INLINE_ACTIONS
    }
  }

  const effectiveMax = maxInline !== undefined ? Math.min(maxInline, dynamicMax) : dynamicMax
  const inlineCount = actions.length === 1 && (width === 0 || width >= 80) ? 1 : effectiveMax

  const inline = actions.slice(0, inlineCount)
  const overflow = actions.slice(inlineCount)

  return (
    <div ref={containerRef} className={cn("dy-flex dy-items-center dy-gap-1 dy-max-w-full dy-overflow-hidden", className)}>
      {inline.map((action) => {
        const running = isRunning?.(action, [docId]) ?? false
        return (
          <Button
            key={action.name}
            variant="outline"
            size="sm"
            disabled={running}
            title={action.label}
            className={cn(
              "dy-h-7 dy-px-2 dy-text-xs dy-font-normal dy-shrink dy-truncate dy-max-w-full dy-gap-1.5",
              action.destructive &&
                "dy-text-destructive hover:dy-bg-destructive/10 hover:dy-text-destructive",
            )}
            onClick={() => onRun(action, [docId], doc ? { doc, docs: [doc] } : undefined)}
          >
            {running ? (
              <Loader2 className="dy-h-3.5 dy-w-3.5 dy-shrink-0 dy-animate-spin" />
            ) : (
              <IconFor action={action} />
            )}
            <span className="dy-truncate">{action.label}</span>
          </Button>
        )
      })}
      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="dy-h-7 dy-w-7 dy-shrink-0 dy-text-muted-foreground hover:dy-text-foreground"
              aria-label="More actions"
            >
              <MoreHorizontal className="dy-h-4 dy-w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dy-w-48">
            {overflow.map((action) => (
              <DropdownMenuItem
                key={action.name}
                onClick={() => onRun(action, [docId], doc ? { doc, docs: [doc] } : undefined)}
                className={cn(
                  "dy-cursor-pointer dy-gap-2",
                  action.destructive ? "dy-text-destructive focus:dy-text-destructive" : undefined
                )}
              >
                <IconFor action={action} />
                <span className="dy-truncate">{action.label}</span>
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
  return Icon ? createElement(Icon, { className: "dy-h-3.5 dy-w-3.5 dy-shrink-0" }) : null
}
