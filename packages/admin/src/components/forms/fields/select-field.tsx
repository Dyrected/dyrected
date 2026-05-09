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
      <SelectTrigger className="h-12 rounded-xl border-border/40 bg-white/50 focus:ring-0 focus:ring-offset-0 focus:bg-white shadow-sm transition-all hover:shadow-md">
        <SelectValue placeholder={schema.admin?.placeholder || `Select ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border/40 shadow-xl animate-in fade-in zoom-in-95">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="rounded-lg focus:bg-primary/5 focus:text-primary transition-colors">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
