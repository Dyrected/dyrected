import type { LucideIcon } from "lucide-react"
import { Calendar, GanttChart, LayoutGrid, Puzzle, Sheet, Table2 } from "lucide-react"

/** Layouts that ship with the admin. They are the built-in entries of the layout registry. */
export const BUILT_IN_LAYOUTS = ["table", "spreadsheet", "kanban", "cards", "calendar", "gantt"] as const
export type BuiltInLayoutName = (typeof BUILT_IN_LAYOUTS)[number]

/** What the admin needs to know about a layout, whoever implements it. */
export interface ViewLayoutCapabilities {
  /** Name shown in pickers and badges. */
  label: string
  /** Icon used by the view header when the view sets none. */
  icon: LucideIcon
  /** Offered when a user creates or edits a view in the navigation customizer. */
  userSelectable: boolean
  /** Rendered as a table, so the table ⇄ spreadsheet switcher and header export do not apply twice. */
  tabular: boolean
  /** Layout that actually renders this one when it has no renderer of its own yet. */
  rendersAs?: BuiltInLayoutName
}

const REGISTRY: Record<BuiltInLayoutName | "custom", ViewLayoutCapabilities> = {
  table: { label: "Table", icon: Table2, userSelectable: true, tabular: true },
  spreadsheet: { label: "Spreadsheet", icon: Sheet, userSelectable: false, tabular: true },
  kanban: { label: "Kanban", icon: LayoutGrid, userSelectable: true, tabular: false },
  cards: { label: "Cards", icon: LayoutGrid, userSelectable: true, tabular: false },
  calendar: { label: "Calendar", icon: Calendar, userSelectable: true, tabular: false },
  // No dedicated renderer yet: views render as a table.
  gantt: { label: "Gantt", icon: GanttChart, userSelectable: true, tabular: false, rendersAs: "table" },
  // Authored in config with a `component`, so it cannot be picked in the UI.
  custom: { label: "Custom", icon: Puzzle, userSelectable: false, tabular: false },
}

const FALLBACK: ViewLayoutCapabilities = REGISTRY.table

/** Capabilities for a layout name. Unknown names behave like a table. */
export function getLayoutCapabilities(layout: string | undefined): ViewLayoutCapabilities {
  return (layout && (REGISTRY as Record<string, ViewLayoutCapabilities>)[layout]) || FALLBACK
}

/** Layouts a user may choose in the navigation customizer, in display order. */
export const USER_SELECTABLE_LAYOUTS: Array<{ value: BuiltInLayoutName; label: string }> = (
  BUILT_IN_LAYOUTS as readonly BuiltInLayoutName[]
)
  .filter((name) => REGISTRY[name].userSelectable)
  .map((name) => ({ value: name, label: REGISTRY[name].label }))
