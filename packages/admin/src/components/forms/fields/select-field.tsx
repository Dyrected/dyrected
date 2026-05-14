import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select"
import { normalizeOptions } from "../utils"
import type { Field as FieldSchema } from "@dyrected/sdk"

interface SelectFieldProps {
  schema: FieldSchema
  field: any
  disabled?: boolean
}

export function SelectField({ schema, field, disabled }: SelectFieldProps) {
  const label = schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)
  const options = normalizeOptions(schema.options)

  return (
    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
      <SelectTrigger className="dy-h-12 dy-rounded-xl dy-border-border/40 dy-bg-white/50 focus:dy-ring-0 focus:dy-ring-offset-0 focus:dy-bg-white dy-shadow-sm dy-transition-all hover:dy-shadow-md">
        <SelectValue placeholder={schema.admin?.placeholder || `Select ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent className="dy-rounded-xl dy-border-border/40 dy-shadow-xl dy-animate-in dy-fade-in dy-zoom-in-95">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="dy-rounded-lg focus:dy-bg-primary/5 focus:dy-text-primary dy-transition-colors">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
