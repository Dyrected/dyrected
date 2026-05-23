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

  const maxLength = (schema as any).maxLength || (schema as any).max || (schema.admin as any)?.maxLength || (schema as any).validate?.max || (schema as any).validate?.maxLength
  const currentLength = String(field.value ?? "").length

  const textareaEl = <Textarea {...field} value={field.value ?? ""} placeholder={placeholder} disabled={disabled} maxLength={maxLength} />

  if (maxLength && typeof maxLength === "number") {
    return (
      <div className="dy-space-y-1">
        {textareaEl}
        <div className="dy-flex dy-justify-end dy-text-[10px] dy-font-medium dy-text-muted-foreground/60">
          {currentLength} / {maxLength} characters
        </div>
      </div>
    )
  }

  return textareaEl
}
