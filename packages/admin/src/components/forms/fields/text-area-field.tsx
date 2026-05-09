import { Textarea } from "../../ui/textarea"
import type { Field as FieldSchema } from "@dyrected/sdk"

interface TextAreaFieldProps {
  schema: FieldSchema
  field: any
  disabled?: boolean
}

export function TextAreaField({ schema, field, disabled }: TextAreaFieldProps) {
  const label = schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)
  const placeholder = schema.admin?.placeholder || `Enter ${label.toLowerCase()}...`

  return <Textarea {...field} value={field.value ?? ""} placeholder={placeholder} disabled={disabled} />
}
