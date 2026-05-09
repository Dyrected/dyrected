import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "../../components/ui/button"
import { Calendar } from "../../components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover"

interface DatePickerProps {
  value?: string | Date
  onChange: (date?: string) => void
  label?: string
  disabled?: boolean
}

export function DatePicker({ value, onChange, label, disabled }: DatePickerProps) {
  const date = value ? new Date(value) : undefined

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
      <Popover open={disabled ? false : undefined}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-11 px-4 bg-white hover:bg-muted/50 border-border/60 shadow-sm transition-all hover:shadow-md",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
            <span className="flex-1 truncate">
              {date ? format(date, "PPP") : "Pick a date..."}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-border/50 shadow-2xl rounded-xl" align="start">
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
