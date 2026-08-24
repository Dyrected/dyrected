import { Table2, Sheet } from "lucide-react"

import { Button } from "../../../components/ui/button"
import { cn } from "../../../lib/utils"
import type { ViewMode } from "./use-view-mode"

interface ViewModeSwitcherProps {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

/**
 * Segmented Table ⇄ Sheet control for tabular views. Icon-only below `lg`
 * so it stays compact next to the header actions on phones.
 */
export function ViewModeSwitcher({ mode, onChange }: ViewModeSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className="dy-inline-flex dy-items-center dy-rounded-md dy-border dy-border-border/60 dy-bg-muted/30 dy-p-0.5"
    >
      <ModeButton active={mode === "table"} onClick={() => onChange("table")} icon={Table2} label="Table" />
      <ModeButton active={mode === "spreadsheet"} onClick={() => onChange("spreadsheet")} icon={Sheet} label="Sheet" />
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "dy-h-7 dy-gap-1.5 dy-px-2.5 dy-text-xs",
        active
          ? "dy-bg-background dy-shadow-sm hover:dy-bg-background"
          : "dy-text-muted-foreground hover:dy-text-foreground",
      )}
    >
      <Icon className="dy-h-3.5 dy-w-3.5" />
      <span className="dy-hidden lg:dy-inline">{label}</span>
    </Button>
  )
}
