import * as React from "react"
import { format } from "date-fns"
import type { DateFormat } from "@dyrected/core"
import { Calendar as CalendarIcon, Clock, X, ChevronDown } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { formatDate } from "../../../lib/format"
import { cn } from "../../../lib/utils"
import { Button } from "../../ui/button"
import { Calendar } from "../../ui/calendar"
import { Input } from "../../ui/input"

// ---------------------------------------------------------------------------
// Shared inline wrapper — kept mounted so navigation state is preserved
// ---------------------------------------------------------------------------
function InlinePicker({
  open,
  setOpen,
  triggerRef,
  children,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  triggerRef: React.RefObject<HTMLDivElement | null>
  children: React.ReactNode
}) {
  React.useEffect(() => {
    if (!open) return
    const handle = (e: PointerEvent) => {
      // If the element is no longer in the document, it was removed by a React re-render. Ignore it.
      if (e.target && !document.contains(e.target as Node)) return;
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", handle, { capture: true })
    return () => document.removeEventListener("pointerdown", handle, { capture: true })
  }, [open, setOpen, triggerRef])

  return (
    <div
      // Use visibility:hidden + pointer-events:none instead of unmounting so
      // react-day-picker keeps its internal month-navigation state alive.
      className={cn(
        "dy-absolute dy-left-0 dy-top-full dy-z-50 dy-mt-1 dy-rounded-lg dy-border dy-border-border/50 dy-bg-popover dy-shadow-2xl dy-transition-[opacity,transform] dy-duration-100 dy-origin-top-left",
        open
          ? "dy-opacity-100 dy-scale-100 dy-pointer-events-auto"
          : "dy-opacity-0 dy-scale-95 dy-pointer-events-none dy-invisible"
      )}
      inert={!open ? true : undefined}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DatePicker (single date, optionally with time)
// ---------------------------------------------------------------------------
interface DatePickerProps {
  id?: string
  value?: string | Date
  onChange: (date?: string) => void
  label?: string
  disabled?: boolean
  withTime?: boolean
  fieldType: "date" | "datetime" | "time"
  format?: DateFormat
}

export function DatePicker({ id, value, onChange, label, disabled, withTime, fieldType, format: valueFormat }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const date = value ? new Date(value) : undefined

  const timeString = React.useMemo(() => {
    if (!withTime || !date) return "00:00"
    return format(date, "HH:mm")
  }, [withTime, date])

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      onChange(undefined)
      return
    }
    if (withTime && date) {
      newDate.setHours(date.getHours(), date.getMinutes(), 0, 0)
    }
    onChange(newDate.toISOString())
    if (!withTime) setOpen(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!date) return
    const [h, m] = e.target.value.split(":").map(Number)
    const newDate = new Date(date)
    newDate.setHours(h || 0, m || 0, 0, 0)
    onChange(newDate.toISOString())
  }

  const triggerLabelFormat = withTime ? "PPP p" : "PPP"
  const helperText = date ? formatDate(date.toISOString(), valueFormat, fieldType) : null

  return (
    <div className="dy-flex dy-flex-col dy-gap-2">
      {label && (
        <span className="dy-text-sm dy-font-medium dy-leading-none">
          {label}
        </span>
      )}
      <div ref={wrapperRef} className="dy-relative">
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "dy-w-full dy-justify-start dy-text-left dy-font-normal dy-h-11 dy-px-4 dy-bg-background hover:dy-bg-muted/50 dy-border-border/60 dy-shadow-sm dy-transition-all hover:dy-shadow-md",
            !date && "dy-text-muted-foreground",
            open && "dy-ring-2 dy-ring-primary/20 dy-border-primary/40"
          )}
        >
          <CalendarIcon className="dy-mr-3 dy-h-4 dy-w-4 dy-text-primary dy-shrink-0" />
          <span className="dy-flex-1 dy-truncate">
            {date ? format(date, triggerLabelFormat) : withTime ? "Pick a date & time..." : "Pick a date..."}
          </span>
          {date ? (
            <X
              className="dy-ml-2 dy-h-3.5 dy-w-3.5 dy-text-muted-foreground hover:dy-text-foreground dy-shrink-0 dy-transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onChange(undefined)
              }}
            />
          ) : (
            <ChevronDown className={cn("dy-ml-2 dy-h-3.5 dy-w-3.5 dy-text-muted-foreground dy-shrink-0 dy-transition-transform", open && "dy-rotate-180")} />
          )}
        </Button>

        <InlinePicker open={open && !disabled} setOpen={setOpen} triggerRef={wrapperRef}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
          {withTime && (
            <div className="dy-p-3 dy-border-t dy-border-border/40 dy-bg-muted/10 dy-flex dy-items-center dy-justify-between dy-gap-2">
              <div className="dy-flex dy-items-center dy-gap-2 dy-text-xs dy-text-muted-foreground">
                <Clock className="dy-h-3.5 dy-w-3.5 dy-text-primary" />
                <span>Time:</span>
              </div>
              <Input
                type="time"
                value={timeString}
                onChange={handleTimeChange}
                className="dy-h-8 dy-w-28 dy-text-xs dy-bg-background"
              />
            </div>
          )}
        </InlinePicker>
      </div>
      {helperText && (
        <span className="dy-text-xs dy-text-muted-foreground">Display: {helperText}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DateRangePicker (from / to range)
// ---------------------------------------------------------------------------
interface DateRangePickerProps {
  id?: string
  value?: { from?: string; to?: string }
  onChange: (range: { from?: string; to?: string } | undefined) => void
  label?: string
  disabled?: boolean
}

export function DateRangePicker({ id, value, onChange, label, disabled }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  const range: DateRange | undefined = React.useMemo(() => {
    if (!value?.from && !value?.to) return undefined
    return {
      from: value.from ? new Date(value.from) : undefined,
      to: value.to ? new Date(value.to) : undefined,
    }
  }, [value])

  const handleSelect = (selected: DateRange | undefined) => {
    if (!selected) {
      onChange(undefined)
      return
    }
    onChange({
      from: selected.from?.toISOString(),
      to: selected.to?.toISOString(),
    })
    if (selected.from && selected.to) setOpen(false)
  }

  const displayLabel = React.useMemo(() => {
    if (!range?.from) return "Pick a date range..."
    if (!range.to) return format(range.from, "PPP") + " → ..."
    return `${format(range.from, "PP")} – ${format(range.to, "PP")}`
  }, [range])

  return (
    <div className="dy-flex dy-flex-col dy-gap-2">
      {label && (
        <span className="dy-text-sm dy-font-medium dy-leading-none">
          {label}
        </span>
      )}
      <div ref={wrapperRef} className="dy-relative">
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "dy-w-full dy-justify-start dy-text-left dy-font-normal dy-h-11 dy-px-4 dy-bg-background hover:dy-bg-muted/50 dy-border-border/60 dy-shadow-sm dy-transition-all hover:dy-shadow-md",
            !range?.from && "dy-text-muted-foreground",
            open && "dy-ring-2 dy-ring-primary/20 dy-border-primary/40"
          )}
        >
          <CalendarIcon className="dy-mr-3 dy-h-4 dy-w-4 dy-text-primary dy-shrink-0" />
          <span className="dy-flex-1 dy-truncate">{displayLabel}</span>
          {range?.from ? (
            <X
              className="dy-ml-2 dy-h-3.5 dy-w-3.5 dy-text-muted-foreground hover:dy-text-foreground dy-shrink-0 dy-transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onChange(undefined)
              }}
            />
          ) : (
            <ChevronDown className={cn("dy-ml-2 dy-h-3.5 dy-w-3.5 dy-text-muted-foreground dy-shrink-0 dy-transition-transform", open && "dy-rotate-180")} />
          )}
        </Button>

        <InlinePicker open={open && !disabled} setOpen={setOpen} triggerRef={wrapperRef}>
          <Calendar
            mode="range"
            selected={range}
            defaultMonth={range?.from}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </InlinePicker>
      </div>
    </div>
  )
}
