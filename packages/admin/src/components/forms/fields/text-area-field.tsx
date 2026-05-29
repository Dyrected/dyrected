import { Textarea } from "../../ui/textarea"
import type { Field as FieldSchema } from "@dyrected/sdk"

type ExtendedFieldSchema = FieldSchema & {
  maxLength?: number
  max?: number
  validate?: {
    max?: number
    maxLength?: number
  }
  maxWords?: number
  admin?: FieldSchema["admin"] & {
    maxLength?: number
    maxWords?: number
  }
}

interface TextAreaFieldProps {
  schema: FieldSchema
  field: {
    value: string | null | undefined
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    onBlur?: () => void
    name: string
    ref: React.Ref<HTMLTextAreaElement>
  }
  disabled?: boolean
}

import * as React from "react"

export function TextAreaField({ schema, field, disabled }: TextAreaFieldProps) {
  const label = schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)
  const placeholder = schema.admin?.placeholder || `Enter ${label.toLowerCase()}...`

  const extSchema = schema as ExtendedFieldSchema
  const maxLength = extSchema.maxLength || extSchema.max || extSchema.admin?.maxLength || extSchema.validate?.max || extSchema.validate?.maxLength
  const maxWords = extSchema.maxWords || extSchema.admin?.maxWords

  const textValue = String(field.value ?? "")
  const currentLength = textValue.length
  const currentWords = textValue.trim() === "" ? 0 : textValue.trim().split(/\s+/).length

  const getWarningClass = (current: number, max: number) => {
    const ratio = current / max
    if (ratio >= 1.0) return "dy-text-destructive dy-font-semibold"
    if (ratio >= 0.8) return "dy-text-amber-500 dy-font-medium"
    return "dy-text-muted-foreground/60"
  }

  const textareaEl = <Textarea {...field} value={field.value ?? ""} placeholder={placeholder} disabled={disabled} maxLength={maxLength} />

  const hasMaxLength = maxLength && typeof maxLength === "number"
  const hasMaxWords = maxWords && typeof maxWords === "number"

  if (hasMaxLength || hasMaxWords) {
    return (
      <div className="dy-space-y-1">
        {textareaEl}
        <div className="dy-flex dy-justify-end dy-gap-3 dy-text-[10px]">
          {hasMaxLength && (
            <span className={getWarningClass(currentLength, maxLength)}>
              {currentLength} / {maxLength} characters
            </span>
          )}
          {hasMaxWords && (
            <span className={getWarningClass(currentWords, maxWords)}>
              {currentWords} / {maxWords} words
            </span>
          )}
        </div>
      </div>
    )
  }

  return textareaEl
}
