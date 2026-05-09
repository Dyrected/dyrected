import { Input } from "../../ui/input"
import type { Field as FieldSchema } from "@dyrected/sdk"

interface TextFieldProps {
  schema: FieldSchema
  field: any
  disabled?: boolean
}

export function TextField({ schema, field, disabled }: TextFieldProps) {
  const label = schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)
  const placeholder = schema.admin?.placeholder || `Enter ${label.toLowerCase()}...`

  switch (schema.type) {
    case "number":
      return <Input type="number" {...field} value={field.value ?? ""} placeholder={schema.admin?.placeholder || "0"} disabled={disabled} />
    case "email":
      return <Input type="email" {...field} value={field.value ?? ""} placeholder={placeholder} disabled={disabled} />
    case "url":
      return <Input type="url" {...field} value={field.value ?? ""} placeholder={schema.admin?.placeholder || "https://"} disabled={disabled} />
    default:
      return <Input {...field} value={field.value ?? ""} placeholder={placeholder} disabled={disabled} />
  }
}
