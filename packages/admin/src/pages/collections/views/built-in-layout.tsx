import { CalendarLayout, type CalendarLayoutProps } from "./calendar/calendar-layout"
import { CardsLayout, type CardsLayoutProps } from "./cards/cards-layout"
import { KanbanLayout, type KanbanLayoutProps } from "./kanban/kanban-layout"
import { getLayoutCapabilities } from "./layout-registry"
import { SpreadsheetLayout, type SpreadsheetLayoutProps } from "./spreadsheet/spreadsheet-layout"
import { TableLayout, type TableLayoutProps } from "./table/table-layout"

export type BuiltInLayoutProps = KanbanLayoutProps &
  CalendarLayoutProps &
  CardsLayoutProps &
  TableLayoutProps &
  SpreadsheetLayoutProps

/**
 * Renders one of the layouts that ship with the admin. Which one a layout name
 * maps to, including names with no renderer of their own yet (`gantt`), comes
 * from the layout registry, so the page and the customizer cannot disagree.
 */
export function BuiltInLayout({ layout, ...props }: BuiltInLayoutProps & { layout: string }) {
  const rendered = getLayoutCapabilities(layout).rendersAs ?? layout

  switch (rendered) {
    case "kanban":
      return <KanbanLayout {...props} />
    case "calendar":
      return <CalendarLayout {...props} />
    case "cards":
      return <CardsLayout {...props} />
    case "spreadsheet":
      return <SpreadsheetLayout {...props} />
    default:
      return <TableLayout {...props} />
  }
}
