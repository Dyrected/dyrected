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

  const maxLength = schema.type !== "number" ? ((schema as any).maxLength || (schema as any).max || (schema.admin as any)?.maxLength || (schema as any).validate?.max || (schema as any).validate?.maxLength) : undefined
  const currentLength = String(field.value ?? "").length

  const inputEl = (() => {
    switch (schema.type) {
      case "number":
        return <Input type="number" {...field} value={field.value ?? ""} placeholder={schema.admin?.placeholder || "0"} disabled={disabled} />
      case "email":
        return <Input type="email" {...field} value={field.value ?? ""} placeholder={placeholder} disabled={disabled} maxLength={maxLength} />
      case "url":
        return <Input type="url" {...field} value={field.value ?? ""} placeholder={schema.admin?.placeholder || "https://"} disabled={disabled} maxLength={maxLength} />
      default: {
        const isPassword = schema.name === "password" || (schema.type as string) === "password";
        return <Input type={isPassword ? "password" : "text"} {...field} value={field.value ?? ""} placeholder={placeholder} disabled={disabled} maxLength={maxLength} />
      }
    }
  })()

  if (maxLength && typeof maxLength === "number") {
    return (
      <div className="dy-space-y-1">
        {inputEl}
        <div className="dy-flex dy-justify-end dy-text-[10px] dy-font-medium dy-text-muted-foreground/60">
          {currentLength} / {maxLength} characters
        </div>
      </div>
    )
  }

  return inputEl
}
