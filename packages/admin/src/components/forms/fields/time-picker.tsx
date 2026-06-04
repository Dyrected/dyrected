import * as React from "react"
import { Clock } from "lucide-react"
import { Input } from "../../ui/input"

interface TimePickerProps {
  value?: string
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
}

/**
 * A standalone time-only input field.
 * Stores values as "HH:mm" strings.
 */
export function TimePicker({ value, onChange, label, disabled }: TimePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="dy-flex dy-flex-col dy-gap-2">
      {label && (
        <label className="dy-text-sm dy-font-medium dy-leading-none dy-peer-disabled:dy-cursor-not-allowed dy-peer-disabled:dy-opacity-70">
          {label}
        </label>
      )}
      <div className="dy-relative dy-flex dy-items-center">
        <Clock className="dy-absolute dy-left-3 dy-h-4 dy-w-4 dy-text-primary dy-pointer-events-none" />
        <Input
          type="time"
          value={value || ""}
          onChange={handleChange}
          disabled={disabled}
          className="dy-h-11 dy-pl-9 dy-bg-background hover:dy-bg-muted/50 dy-border-border/60 dy-shadow-sm dy-transition-all hover:dy-shadow-md dy-text-sm"
        />
      </div>
    </div>
  )
}
