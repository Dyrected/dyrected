import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "../../../lib/utils"
import { Button } from "../../ui/button"
import { Calendar } from "../../ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover"
import { Input } from "../../ui/input"

interface DatePickerProps {
  value?: string | Date
  onChange: (date?: string) => void
  label?: string
  disabled?: boolean
  withTime?: boolean
}

export function DatePicker({ value, onChange, label, disabled, withTime }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
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

  const displayFormat = withTime ? "PPP p" : "PPP"

  return (
    <div className="dy-flex dy-flex-col dy-gap-2">
      {label && (
        <label className="dy-text-sm dy-font-medium dy-leading-none dy-peer-disabled:dy-cursor-not-allowed dy-peer-disabled:dy-opacity-70">
          {label}
        </label>
      )}
      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "dy-w-full dy-justify-start dy-text-left dy-font-normal dy-h-11 dy-px-4 dy-bg-background hover:dy-bg-muted/50 dy-border-border/60 dy-shadow-sm dy-transition-all hover:dy-shadow-md",
              !date && "dy-text-muted-foreground"
            )}
          >
            <CalendarIcon className="dy-mr-3 dy-h-4 dy-w-4 dy-text-primary" />
            <span className="dy-flex-1 dy-truncate">
              {date ? format(date, displayFormat) : withTime ? "Pick a date & time..." : "Pick a date..."}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="dy-w-auto dy-p-0 dy-border-border/50 dy-shadow-2xl dy-rounded-xl" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
          {withTime && (
            <div className="dy-border-t dy-border-border/50 dy-p-3">
              <div className="dy-flex dy-items-center dy-gap-2">
                <Clock className="dy-h-4 dy-w-4 dy-text-muted-foreground dy-shrink-0" />
                <Input
                  type="time"
                  value={timeString}
                  onChange={handleTimeChange}
                  disabled={!date}
                  className="dy-h-8 dy-text-sm dy-border-border/50"
                />
              </div>
              {!date && (
                <p className="dy-text-xs dy-text-muted-foreground dy-mt-1.5 dy-pl-6">
                  Pick a date first
                </p>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
