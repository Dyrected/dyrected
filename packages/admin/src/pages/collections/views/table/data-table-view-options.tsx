import type { Table } from "@tanstack/react-table"

import { ViewOptionsPanel } from "../view-options-panel"
import type { ColumnPreferences } from "../use-column-preferences"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
  preferences: ColumnPreferences
  isDirty: boolean
  isSaving: boolean
  isAdmin: boolean
  onOrderChange: (order: string[]) => void
  onToggleVisibility: (id: string, visible: boolean) => void
  onShowAll: () => void
  onHideAllExcept: (keepId?: string) => void
  onReset: () => void
  onSaveForMe: () => Promise<void>
  onSaveForEveryone?: () => Promise<void>
}

/**
 * The toolbar's View control: drag-to-reorder columns with visibility toggles,
 * quick show/hide shortcuts, and preference persistence (personal or global).
 * Derives labels/managed ids from the TanStack table and delegates rendering to
 * the shared ViewOptionsPanel.
 */
export function DataTableViewOptions<TData>({
  table,
  preferences,
  isDirty,
  isSaving,
  isAdmin,
  onOrderChange,
  onToggleVisibility,
  onShowAll,
  onHideAllExcept,
  onReset,
  onSaveForMe,
  onSaveForEveryone,
}: DataTableViewOptionsProps<TData>) {
  const labelById = new Map<string, string>()
  for (const column of table.getAllColumns()) {
    const header = column.columnDef.header
    const metaLabel = (column.columnDef.meta as any)?.label
    const label =
      typeof header === "string" && header ? header : typeof metaLabel === "string" ? metaLabel : column.id
    labelById.set(column.id, label)
  }

  // Only columns present in the managed preference list are draggable/toggleable;
  // pinned utility columns (select/actions) stay out of the panel.
  const managedIds = preferences.order.filter((id) => !!labelById.get(id))

  return (
    <ViewOptionsPanel
      managedIds={managedIds}
      labelById={labelById}
      hiddenIds={preferences.hidden}
      isDirty={isDirty}
      isSaving={isSaving}
      isAdmin={isAdmin}
      onOrderChange={onOrderChange}
      onToggleVisibility={onToggleVisibility}
      onShowAll={onShowAll}
      onHideAllExcept={onHideAllExcept}
      onReset={onReset}
      onSaveForMe={onSaveForMe}
      onSaveForEveryone={onSaveForEveryone}
    />
  )
}

export { ViewOptionsIcon } from "../view-options-panel"

export type { DataTableViewOptionsProps }
