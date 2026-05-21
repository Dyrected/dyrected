import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "../../../lib/utils"
import { Button } from "../../ui/button"
import { Calendar } from "../../ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover"

interface DatePickerProps {
  value?: string | Date
  onChange: (date?: string) => void
  label?: string
  disabled?: boolean
}

export function DatePicker({ value, onChange, label, disabled }: DatePickerProps) {
  const date = value ? new Date(value) : undefined

  return (
    <div className="dy-flex dy-flex-col dy-gap-2">
      {label && <label className="dy-text-sm dy-font-medium dy-leading-none dy-peer-disabled:dy-cursor-not-allowed dy-peer-disabled:dy-opacity-70">{label}</label>}
      <Popover open={disabled ? false : undefined}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            disabled={disabled}
            className={cn(
              "dy-w-full dy-justify-start dy-text-left dy-font-normal dy-h-11 dy-px-4 dy-bg-background hover:dy-bg-muted/50 dy-border-border/60 dy-shadow-sm dy-transition-all hover:dy-shadow-md",
              !date && "dy-text-muted-foreground"
            )}
          >
            <CalendarIcon className="dy-mr-3 dy-h-4 dy-w-4 dy-text-primary" />
            <span className="dy-flex-1 dy-truncate">
              {date ? format(date, "PPP") : "Pick a date..."}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="dy-w-auto dy-p-0 dy-border-border/50 dy-shadow-2xl dy-rounded-xl" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              if (newDate) {
                // Store date as ISO string
                onChange(newDate.toISOString())
              } else {
                onChange(undefined)
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
