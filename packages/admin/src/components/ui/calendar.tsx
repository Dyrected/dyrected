import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "../../lib/utils"
import { Button, buttonVariants } from "../../components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "dy-bg-background dy-group/calendar dy-p-4 [--cell-size:2.25rem] dy-shadow-sm dy-rounded-xl dy-border dy-border-border/40",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("dy-w-fit", defaultClassNames.root),
        months: cn(
          "dy-relative dy-flex dy-flex-col dy-gap-4 md:dy-flex-row",
          defaultClassNames.months
        ),
        month: cn("dy-flex dy-w-full dy-flex-col dy-gap-4", defaultClassNames.month),
        nav: cn(
          "dy-absolute dy-inset-x-0 dy-top-0 dy-z-10 dy-flex dy-w-full dy-items-center dy-justify-between dy-gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "dy-h-[--cell-size] dy-w-[--cell-size] dy-select-none dy-p-0 aria-disabled:dy-opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "dy-h-[--cell-size] dy-w-[--cell-size] dy-select-none dy-p-0 aria-disabled:dy-opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "dy-flex dy-h-[--cell-size] dy-w-full dy-items-center dy-justify-center dy-px-[--cell-size] dy-mb-4",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "dy-flex dy-h-[--cell-size] dy-w-full dy-items-center dy-justify-center dy-gap-1.5 dy-text-sm dy-font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "has-focus:dy-border-ring dy-border-input dy-shadow-xs has-focus:dy-ring-ring/50 has-focus:dy-ring-[3px] dy-relative dy-rounded-md dy-border",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "dy-bg-popover dy-absolute dy-inset-0 dy-opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "dy-select-none dy-font-semibold dy-text-lg dy-tracking-tight",
          captionLayout === "label"
            ? "dy-text-sm"
            : "[&>svg]:dy-text-muted-foreground dy-flex dy-h-8 dy-items-center dy-gap-1 dy-rounded-md dy-pl-2 dy-pr-1 dy-text-sm [&>svg]:dy-size-3.5",
          defaultClassNames.caption_label
        ),
        table: "dy-w-full dy-border-collapse",
        weekdays: cn("dy-grid dy-grid-cols-7 dy-mb-2", defaultClassNames.weekdays),
        weekday: cn(
          "dy-text-muted-foreground dy-text-center dy-select-none dy-text-[0.8rem] dy-font-medium",
          defaultClassNames.weekday
        ),
        week: cn("dy-grid dy-grid-cols-7 dy-w-full dy-mt-1", defaultClassNames.week),
        week_number_header: cn(
          "dy-w-[--cell-size] dy-select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "dy-text-muted-foreground dy-select-none dy-text-[0.8rem]",
          defaultClassNames.week_number
        ),
        day: cn(
          "dy-group/day dy-relative dy-flex dy-items-center dy-justify-center dy-h-[--cell-size] dy-w-full dy-select-none dy-p-0 dy-text-center dy-z-50 dy-pointer-events-auto",
          defaultClassNames.day
        ),
        range_start: cn(
          "dy-bg-primary dy-text-primary-foreground dy-rounded-l-md",
          defaultClassNames.range_start
        ),
        range_middle: cn("dy-bg-accent dy-text-accent-foreground dy-rounded-none", defaultClassNames.range_middle),
        range_end: cn("dy-bg-primary dy-text-primary-foreground dy-rounded-r-md", defaultClassNames.range_end),
        today: cn(
          "dy-bg-accent/50 dy-text-accent-foreground dy-font-bold dy-rounded-md",
          defaultClassNames.today
        ),
        outside: cn(
          "dy-text-muted-foreground/40 aria-selected:dy-text-muted-foreground/40 dy-opacity-50",
          defaultClassNames.outside
        ),
        disabled: cn(
          "dy-text-muted-foreground dy-opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("dy-invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("dy-size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("dy-size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("dy-size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="dy-flex dy-size-[--cell-size] dy-items-center dy-justify-center dy-text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (!modifiers.focused) return
    // Defer focus so it doesn't race with click event processing
    const frame = requestAnimationFrame(() => ref.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "dy-flex dy-items-center dy-justify-center dy-h-[--cell-size] dy-w-full dy-min-w-[--cell-size] dy-p-0 dy-font-normal dy-transition-all",
        "hover:dy-bg-accent hover:dy-text-accent-foreground",
        "data-[selected-single=true]:dy-bg-primary data-[selected-single=true]:dy-text-primary-foreground data-[selected-single=true]:dy-rounded-full data-[selected-single=true]:dy-shadow-lg",
        "data-[range-middle=true]:dy-bg-accent data-[range-middle=true]:dy-text-accent-foreground data-[range-middle=true]:dy-rounded-none",
        "data-[range-start=true]:dy-bg-primary data-[range-start=true]:dy-text-primary-foreground data-[range-start=true]:dy-rounded-l-md",
        "data-[range-end=true]:dy-bg-primary data-[range-end=true]:dy-text-primary-foreground data-[range-end=true]:dy-rounded-r-md",
        "dy-group-data-[focused=true]/day:dy-ring-2 dy-group-data-[focused=true]/day:dy-ring-ring dy-group-data-[focused=true]/day:dy-relative dy-group-data-[focused=true]/day:dy-z-10",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
