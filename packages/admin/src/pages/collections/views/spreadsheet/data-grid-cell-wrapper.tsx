import * as React from "react"
import { cn } from "../../../../lib/utils"

interface DataGridCellWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  isFocused?: boolean
  isSelected?: boolean
  isEditing?: boolean
  /** Click selects; double-click (or Enter) edits. */
  onSelect: () => void
  onEdit: () => void
  children: React.ReactNode
}

/**
 * Shared chrome for every grid cell: focus ring, selection wash, and the
 * click/dblclick contract. Editors render their own inputs inside.
 */
export function DataGridCellWrapper({
  isFocused,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  className,
  children,
  ...props
}: DataGridCellWrapperProps) {
  return (
    <div
      role="gridcell"
      tabIndex={-1}
      data-focused={isFocused || undefined}
      data-editing={isEditing || undefined}
      onClick={(event) => {
        event.stopPropagation()
        if (!isFocused) onSelect()
      }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onSelect()
        onEdit()
      }}
      className={cn(
        "dy-relative dy-box-border dy-w-full dy-h-full dy-overflow-hidden dy-border-b dy-border-border/40 dy-px-2.5 dy-text-xs dy-outline-none",
        "dy-flex dy-items-center",
        !isEditing && "dy-cursor-cell",
        isSelected && "dy-bg-primary/5",
        isFocused &&
          "dy-z-[1] before:dy-pointer-events-none before:dy-absolute before:dy-inset-0 before:dy-border before:dy-border-primary before:dy-content-['']",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
