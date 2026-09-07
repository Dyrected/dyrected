import * as React from "react"
import { cn } from "../../../../lib/utils"

interface DataGridCellWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  isFocused?: boolean
  isSelected?: boolean
  isEditing?: boolean
  isDirty?: boolean
  /** Click selects; double-click (or Enter) edits. */
  onSelect: () => void
  onEdit: () => void
  children: React.ReactNode
}

/**
 * Shared chrome for every spreadsheet cell: focus ring, dirty state marker,
 * selection wash, and click/touch contracts.
 */
export function DataGridCellWrapper({
  isFocused,
  isSelected,
  isEditing,
  isDirty,
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
      data-dirty={isDirty || undefined}
      onClick={(event) => {
        event.stopPropagation()
        if (!isEditing) {
          onEdit()
        }
      }}
      className={cn(
        "dy-relative dy-box-border dy-w-full dy-min-h-[38px] dy-h-full dy-overflow-hidden dy-px-3 dy-text-xs dy-outline-none",
        "dy-flex dy-items-center dy-transition-colors",
        !isEditing && "dy-cursor-pointer sm:dy-cursor-cell",
        isSelected && "dy-bg-primary/5",
        isDirty && "dy-bg-amber-500/10 dark:dy-bg-amber-500/15",
        isFocused &&
          "dy-z-[1] before:dy-pointer-events-none before:dy-absolute before:dy-inset-0 before:dy-border-2 before:dy-border-primary before:dy-rounded-sm before:dy-content-['']",
        className,
      )}
      {...props}
    >
      {isDirty ? (
        <span
          title="Unsaved change"
          className="dy-pointer-events-none dy-absolute dy-top-0.5 dy-right-0.5 dy-h-1.5 dy-w-1.5 dy-rounded-full dy-bg-amber-500"
        />
      ) : null}
      {children}
    </div>
  )
}

