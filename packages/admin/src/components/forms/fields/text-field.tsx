import { Star } from "lucide-react"
import { Input } from "../../ui/input"
import type { EmailField, IconField, NumberField, TextField as TextFieldSchema, UrlField } from "@dyrected/core"
import { formatNumber, getRatingSpec } from "../../../lib/format"

type CharacterLimitedFieldSchema = TextFieldSchema | EmailField | UrlField | IconField
type TextInputSchema = CharacterLimitedFieldSchema | NumberField

interface TextFieldProps {
  schema: TextInputSchema
  field: {
    value: string | number | null | undefined
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onBlur?: () => void
    name: string
    ref: React.Ref<HTMLInputElement>
  }
  disabled?: boolean
}

export function TextField({ schema, field, disabled }: TextFieldProps) {
  const label = schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)
  const placeholder = schema.admin?.placeholder || `Enter ${label.toLowerCase()}...`

  const maxLength = getMaxLength(schema)
  const maxWords = getMaxWords(schema)

  const textValue = String(field.value ?? "")
  const currentLength = textValue.length
  const currentWords = textValue.trim() === "" ? 0 : textValue.trim().split(/\s+/).length

  const getWarningClass = (current: number, max: number) => {
    const ratio = current / max
    if (ratio >= 1.0) return "dy-text-destructive dy-font-semibold"
    if (ratio >= 0.8) return "dy-text-amber-500 dy-font-medium"
    return "dy-text-muted-foreground/60"
  }

  const inputEl = (() => {
    switch (schema.type) {
      case "number":
        return <Input type="number" {...field} value={field.value ?? ""} placeholder={schema.admin?.placeholder || "0"} disabled={disabled} min={getMin(schema)} max={getMax(schema)} />
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

  const numberFormat = schema.type === "number" ? schema.admin?.format : undefined
  if (numberFormat && field.value !== null && field.value !== undefined && field.value !== "") {
    const rating = getRatingSpec(field.value, numberFormat)
    return (
      <div className="dy-space-y-1">
        {inputEl}
        {rating ? (
          <div className="dy-flex dy-items-center dy-gap-0.5" title={`${rating.value} / ${rating.max}`}>
            {Array.from({ length: rating.max }, (_, i) => (
              <Star
                key={i}
                className={
                  i < Math.round(rating.value)
                    ? "dy-h-4 dy-w-4 dy-fill-amber-400 dy-text-amber-400"
                    : "dy-h-4 dy-w-4 dy-text-muted-foreground/30"
                }
              />
            ))}
          </div>
        ) : (
          <span className="dy-text-xs dy-text-muted-foreground">{formatNumber(field.value, numberFormat)}</span>
        )}
      </div>
    )
  }

  const hasMaxLength = maxLength && typeof maxLength === "number"
  const hasMaxWords = maxWords && typeof maxWords === "number"

  if (hasMaxLength || hasMaxWords) {
    return (
      <div className="dy-space-y-1">
        {inputEl}
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

  return inputEl
}

function getMaxLength(schema: TextInputSchema): number | undefined {
  if (schema.type === "number") {
    return undefined
  }

  return schema.maxLength ?? schema.admin?.maxLength
}

function getMaxWords(schema: TextInputSchema): number | undefined {
  if (schema.type !== "text") {
    return undefined
  }

  return schema.maxWords ?? schema.admin?.maxWords
}

function getMin(schema: TextInputSchema): number | undefined {
  if (schema.type !== "number") {
    return undefined
  }

  return schema.min ?? schema.admin?.min
}

function getMax(schema: TextInputSchema): number | undefined {
  if (schema.type !== "number") {
    return undefined
  }

  return schema.max ?? schema.admin?.max
}
