import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "../../../../components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "../../../../components/ui/tabs"
import type { CalendarViewMode } from "./calendar-utils"

interface CalendarToolbarProps {
  mode: CalendarViewMode
  label: string
  onModeChange: (mode: CalendarViewMode) => void
  onMove: (direction: -1 | 1) => void
  onToday: () => void
}

/**
 * Navigation toolbar for the calendar — period label, prev/next/today controls,
 * and the month/week/day switcher.
 */
export function CalendarToolbar({ mode, label, onModeChange, onMove, onToday }: CalendarToolbarProps) {
  return (
    <div className="dy-flex dy-flex-col dy-gap-2 sm:dy-flex-row sm:dy-items-center sm:dy-justify-between">
      <div className="dy-flex dy-items-center dy-gap-2">
        <Button variant="outline" size="icon" className="dy-h-8 dy-w-8" aria-label="Previous period" onClick={() => onMove(-1)}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="sm" className="dy-h-8" onClick={onToday}>
          Today
        </Button>
        <Button variant="outline" size="icon" className="dy-h-8 dy-w-8" aria-label="Next period" onClick={() => onMove(1)}>
          <ChevronRight />
        </Button>
        <p className="dy-text-sm dy-font-semibold">{label}</p>
      </div>
      <Tabs value={mode} onValueChange={(value) => onModeChange(value as CalendarViewMode)}>
        <TabsList className="dy-h-8">
          <TabsTrigger value="month" className="dy-text-xs">Month</TabsTrigger>
          <TabsTrigger value="week" className="dy-text-xs">Week</TabsTrigger>
          <TabsTrigger value="day" className="dy-text-xs">Day</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
