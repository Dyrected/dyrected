import * as React from "react"
import { format } from "date-fns"
import type { DateFormat } from "@dyrected/core"
import { Clock, X, ChevronDown } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { formatDate } from "../../../lib/format"
import { cn } from "../../../lib/utils"
import { Button } from "../../ui/button"
import { Calendar } from "../../ui/calendar"
import { Input } from "../../ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover"

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

export function DatePicker({
  id,
  value,
  onChange,
  label,
  disabled,
  withTime,
  fieldType,
  format: valueFormat,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [draftText, setDraftText] = React.useState<string | null>(null)

  const date = React.useMemo(() => {
    return value ? new Date(value) : undefined
  }, [value])

  const formattedDisplay = React.useMemo(() => {
    if (!date) return ""
    return withTime ? format(date, "yyyy-MM-dd HH:mm") : format(date, "yyyy-MM-dd")
  }, [date, withTime])

  const textValue = draftText !== null ? draftText : formattedDisplay

  const timeString = React.useMemo(() => {
    if (!withTime || !date) return "00:00"
    return format(date, "HH:mm")
  }, [withTime, date])

  const commitText = React.useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) {
        onChange(undefined)
        setDraftText(null)
        return
      }
      const parsed = new Date(trimmed)
      if (!Number.isNaN(parsed.getTime())) {
        onChange(parsed.toISOString())
      }
      setDraftText(null)
    },
    [onChange],
  )

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      onChange(undefined)
      setDraftText(null)
      return
    }
    if (withTime && date) {
      newDate.setHours(date.getHours(), date.getMinutes(), 0, 0)
    }
    onChange(newDate.toISOString())
    setDraftText(null)
    if (!withTime) setOpen(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const baseDate = date ? new Date(date) : new Date()
    const [h, m] = e.target.value.split(":").map(Number)
    baseDate.setHours(h || 0, m || 0, 0, 0)
    onChange(baseDate.toISOString())
    setDraftText(null)
  }

  const helperText = date ? formatDate(date.toISOString(), valueFormat, fieldType) : null

  return (
    <div className="dy-flex dy-flex-col dy-gap-2">
      {label && (
        <span className="dy-text-sm dy-font-medium dy-leading-none">
          {label}
        </span>
      )}
      <div className="dy-relative">
        <Popover open={open} onOpenChange={setOpen}>
          <div className="dy-relative dy-flex dy-items-center">
            <Input
              id={id}
              type="text"
              disabled={disabled}
              value={textValue}
              placeholder={withTime ? "YYYY-MM-DD HH:mm (or click to pick)" : "YYYY-MM-DD (or click to pick)"}
              onChange={(e) => setDraftText(e.target.value)}
              onBlur={() => {
                if (draftText !== null) commitText(draftText)
              }}
              onFocus={() => {
                if (!disabled) setOpen(true)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (draftText !== null) commitText(draftText)
                  setOpen(false)
                }
              }}
              className={cn(
                "dy-w-full dy-h-11 dy-px-3.5 dy-bg-background dy-border-border/60 dy-shadow-sm dy-transition-all",
                date && "dy-pr-16",
                !date && "dy-pr-9",
              )}
            />
            <div className="dy-absolute dy-right-2 dy-flex dy-items-center dy-gap-1">
              {date && !disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDraftText(null)
                    onChange(undefined)
                  }}
                >
                  <X className="dy-h-3.5 dy-w-3.5" />
                </Button>
              )}
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-foreground"
                >
                  <ChevronDown className={cn("dy-h-3.5 dy-w-3.5 dy-transition-transform", open && "dy-rotate-180")} />
                </Button>
              </PopoverTrigger>
            </div>
          </div>

          <PopoverContent align="start" className="dy-w-auto dy-p-0">
            <Calendar
              mode="single"
              selected={date}
              defaultMonth={date}
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
          </PopoverContent>
        </Popover>
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
    if (!range?.from) return ""
    if (!range.to) return `${format(range.from, "yyyy-MM-dd")} → ...`
    return `${format(range.from, "yyyy-MM-dd")} – ${format(range.to, "yyyy-MM-dd")}`
  }, [range])

  return (
    <div className="dy-flex dy-flex-col dy-gap-2">
      {label && (
        <span className="dy-text-sm dy-font-medium dy-leading-none">
          {label}
        </span>
      )}
      <div className="dy-relative">
        <Popover open={open} onOpenChange={setOpen}>
          <div className="dy-relative dy-flex dy-items-center">
            <Input
              id={id}
              type="text"
              readOnly
              disabled={disabled}
              value={displayLabel}
              placeholder="Pick a date range…"
              onClick={() => {
                if (!disabled) setOpen(true)
              }}
              className={cn(
                "dy-w-full dy-h-11 dy-px-3.5 dy-bg-background dy-border-border/60 dy-shadow-sm dy-transition-all dy-cursor-pointer",
                range?.from && "dy-pr-16",
                !range?.from && "dy-pr-9",
              )}
            />
            <div className="dy-absolute dy-right-2 dy-flex dy-items-center dy-gap-1">
              {range?.from && !disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(undefined)
                  }}
                >
                  <X className="dy-h-3.5 dy-w-3.5" />
                </Button>
              )}
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-foreground"
                >
                  <ChevronDown className={cn("dy-h-3.5 dy-w-3.5 dy-transition-transform", open && "dy-rotate-180")} />
                </Button>
              </PopoverTrigger>
            </div>
          </div>

          <PopoverContent align="start" className="dy-w-auto dy-p-0">
            <Calendar
              mode="range"
              selected={range}
              defaultMonth={range?.from}
              onSelect={handleSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
