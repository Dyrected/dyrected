import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "../../lib/utils"
import { buttonVariants } from "../../components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("dy-p-3 dy-bg-background dy-rounded-xl dy-border dy-border-border/40 dy-shadow-sm", className)}
      classNames={{
        months: "dy-flex dy-flex-col sm:dy-flex-row dy-space-y-4 sm:dy-space-x-4 sm:dy-space-y-0",
        month: "dy-space-y-4",
        caption: "dy-flex dy-justify-center dy-pt-1 dy-relative dy-items-center",
        caption_label: "dy-text-sm dy-font-semibold dy-tracking-tight",
        nav: "dy-space-x-1 dy-flex dy-items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "dy-h-7 dy-w-7 dy-bg-transparent dy-p-0 dy-opacity-50 hover:dy-opacity-100"
        ),
        nav_button_previous: "dy-absolute dy-left-1",
        nav_button_next: "dy-absolute dy-right-1",
        table: "dy-w-full dy-border-collapse dy-space-y-1",
        head_row: "dy-flex",
        head_cell:
          "dy-text-muted-foreground dy-rounded-md dy-w-9 dy-font-medium dy-text-[0.8rem]",
        row: "dy-flex dy-w-full dy-mt-2",
        cell: "dy-h-9 dy-w-9 dy-text-center dy-text-sm dy-p-0 dy-relative [&:has([aria-selected].day-range-end)]:dy-rounded-r-md [&:has([aria-selected].day-outside)]:dy-bg-accent/50 [&:has([aria-selected])]:dy-bg-accent first:[&:has([aria-selected])]:dy-rounded-l-md last:[&:has([aria-selected])]:dy-rounded-r-md focus-within:dy-relative focus-within:dy-z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "dy-h-9 dy-w-9 dy-p-0 dy-font-normal aria-selected:dy-opacity-100"
        ),
        day_range_end: "dy-day-range-end",
        day_selected:
          "dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary hover:dy-text-primary-foreground focus:dy-bg-primary focus:dy-text-primary-foreground",
        day_today: "dy-bg-accent dy-text-accent-foreground",
        day_outside:
          "dy-day-outside dy-text-muted-foreground dy-opacity-50 aria-selected:dy-bg-accent/50 aria-selected:dy-text-muted-foreground aria-selected:dy-opacity-30",
        day_disabled: "dy-text-muted-foreground dy-opacity-50",
        day_range_middle:
          "aria-selected:dy-bg-accent aria-selected:dy-text-accent-foreground",
        day_hidden: "dy-invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeftIcon {...props} className="dy-h-4 dy-w-4" />,
        IconRight: ({ ...props }) => <ChevronRightIcon {...props} className="dy-h-4 dy-w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
