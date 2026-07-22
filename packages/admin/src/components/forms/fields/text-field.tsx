import type { ReactNode } from "react"
import { ExternalLink, Mail, Minus, Plus, Star } from "lucide-react"
import { Input } from "../../ui/input"
import type { EmailField, IconField, LinkFormat, NumberField, TextField as TextFieldSchema, TextFormat, UrlField } from "@dyrected/core"
import { cn } from "../../../lib/utils"
import { formatNumber, formatText, getLinkSpec, getRatingSpec, isCodeText, resolveNumberFormat, resolveTextFormat } from "../../../lib/format"

type CharacterLimitedFieldSchema = TextFieldSchema | EmailField | UrlField | IconField
type TextInputSchema = CharacterLimitedFieldSchema | NumberField

interface TextFieldProps {
  schema: TextInputSchema
  field: {
    value: string | number | null | undefined
    onChange: (...event: any[]) => void
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
        return renderNumberInput(schema, field, disabled)
      case "email":
        return (
          <div className="dy-flex dy-items-stretch dy-gap-2">
            <Input type="email" {...field} value={field.value ?? ""} placeholder={placeholder} disabled={disabled} maxLength={maxLength} />
            <LinkAction fieldType="email" value={field.value} format={schema.admin?.format} disabled={disabled} />
          </div>
        )
      case "url":
        return (
          <div className="dy-flex dy-items-stretch dy-gap-2">
            <Input type="url" {...field} value={field.value ?? ""} placeholder={schema.admin?.placeholder || "https://"} disabled={disabled} maxLength={maxLength} />
            <LinkAction fieldType="url" value={field.value} format={schema.admin?.format} disabled={disabled} />
          </div>
        )
      default: {
        const isPassword = schema.name === "password" || (schema.type as string) === "password";
        const textFormat = schema.type === "text" ? schema.admin?.format : undefined
        return (
          <Input
            type={isPassword ? "password" : "text"}
            {...field}
            value={field.value ?? ""}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={cn(isCodeText(textFormat) && "dy-font-mono")}
          />
        )
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

  const textPreview = schema.type === "text" ? getTextPreview(field.value, schema.admin?.format) : null
  if (textPreview) {
    return (
      <div className="dy-space-y-1">
        {inputEl}
        <span className="dy-text-xs dy-text-muted-foreground">{textPreview}</span>
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

function renderNumberInput(
  schema: NumberField,
  field: TextFieldProps["field"],
  disabled?: boolean,
) {
  const min = getMin(schema)
  const max = getMax(schema)
  const format = schema.admin?.format
  const rating = getRatingSpec(field.value, format)

  if (rating) {
    const current = typeof field.value === "number" ? field.value : Number(field.value || 0)
    return (
      <div className="dy-space-y-3">
        <div
          className="dy-inline-flex dy-items-center dy-gap-1 dy-rounded-xl dy-border dy-border-border/50 dy-bg-background/70 dy-p-1"
          role="radiogroup"
          aria-label={`${schema.label || schema.name} rating`}
        >
          {Array.from({ length: rating.max }, (_, index) => {
            const value = index + 1
            const active = value <= Math.round(current)
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Set rating to ${value}`}
                disabled={disabled}
                onClick={() => field.onChange(value)}
                className={cn(
                  "dy-flex dy-h-10 dy-w-10 dy-items-center dy-justify-center dy-rounded-lg dy-transition-colors",
                  active ? "dy-bg-amber-400/15" : "hover:dy-bg-muted",
                  disabled && "dy-cursor-not-allowed dy-opacity-50"
                )}
              >
                <Star
                  className={cn(
                    "dy-h-5 dy-w-5",
                    active ? "dy-fill-amber-400 dy-text-amber-400" : "dy-text-muted-foreground/35"
                  )}
                />
              </button>
            )
          })}
        </div>
        <input
          {...field}
          type="hidden"
          value={field.value ?? ""}
          min={min}
          max={max}
        />
      </div>
    )
  }

  const adornment = getNumberAdornment(format)
  const step = getNumberStep(schema, field.value)
  const adjustValue = (direction: -1 | 1) => {
    const raw = field.value
    const current = raw === "" || raw === null || raw === undefined ? 0 : Number(raw)
    const safeCurrent = Number.isFinite(current) ? current : 0
    const next = clampNumber(roundNumber(safeCurrent + direction * step, step), min, max)
    field.onChange(next)
  }

  return (
    <div className="dy-flex dy-items-stretch dy-gap-2">
      <StepperButton
        ariaLabel={`Decrease ${schema.label || schema.name}`}
        icon={<Minus className="dy-h-4 dy-w-4" />}
        disabled={disabled || isStepLimitReached(field.value, min, step, -1)}
        onClick={() => adjustValue(-1)}
      />
      <div className="dy-relative dy-flex-1">
        {adornment?.prefix && (
          <span className="dy-pointer-events-none dy-absolute dy-left-4 dy-top-1/2 dy-z-10 dy--translate-y-1/2 dy-text-sm dy-font-medium dy-text-muted-foreground">
            {adornment.prefix}
          </span>
        )}
        <Input
          type="number"
          {...field}
          value={field.value ?? ""}
          placeholder={schema.admin?.placeholder || "0"}
          disabled={disabled}
          min={min}
          max={max}
          step="any"
          className={cn(adornment?.prefix && "dy-pl-12", adornment?.suffix && "dy-pr-14")}
        />
        {adornment?.suffix && (
          <span className="dy-pointer-events-none dy-absolute dy-right-4 dy-top-1/2 dy-z-10 dy--translate-y-1/2 dy-text-sm dy-font-medium dy-text-muted-foreground">
            {adornment.suffix}
          </span>
        )}
      </div>
      <StepperButton
        ariaLabel={`Increase ${schema.label || schema.name}`}
        icon={<Plus className="dy-h-4 dy-w-4" />}
        disabled={disabled || isStepLimitReached(field.value, max, step, 1)}
        onClick={() => adjustValue(1)}
      />
    </div>
  )
}

function StepperButton({
  ariaLabel,
  icon,
  disabled,
  onClick,
}: {
  ariaLabel: string
  icon: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "dy-flex dy-h-12 dy-w-12 dy-items-center dy-justify-center dy-rounded-xl dy-border dy-border-border/50 dy-bg-background dy-text-foreground dy-shadow-sm dy-transition-all hover:dy-bg-muted",
        "disabled:dy-cursor-not-allowed disabled:dy-opacity-50"
      )}
    >
      {icon}
    </button>
  )
}

function LinkAction({
  fieldType,
  value,
  format,
  disabled,
}: {
  fieldType: "url" | "email"
  value: unknown
  format: LinkFormat | undefined
  disabled?: boolean
}) {
  const spec = getLinkSpec(value, format, fieldType)
  if (!spec) return null

  return (
    <a
      href={spec.href}
      target={spec.newTab ? "_blank" : undefined}
      rel={spec.newTab ? "noreferrer" : undefined}
      aria-disabled={disabled ? true : undefined}
      className={cn(
        "dy-inline-flex dy-h-12 dy-w-12 dy-items-center dy-justify-center dy-rounded-xl dy-border dy-border-border/50 dy-bg-background dy-text-muted-foreground dy-shadow-sm dy-transition-all hover:dy-bg-muted hover:dy-text-foreground",
        disabled && "dy-pointer-events-none dy-opacity-50"
      )}
      title={fieldType === "email" ? "Open email composer" : "Open link"}
    >
      {fieldType === "email" ? <Mail className="dy-h-4 dy-w-4" /> : <ExternalLink className="dy-h-4 dy-w-4" />}
    </a>
  )
}

function getNumberAdornment(format: NumberField["admin"]["format"]): { prefix?: string; suffix?: string } | null {
  const resolved = resolveNumberFormat(format)
  if (!resolved) return null

  if (resolved.type === "currency") {
    const currency = resolved.currency ?? "USD"
    try {
      const parts = new Intl.NumberFormat(resolved.locale, { style: "currency", currency }).formatToParts(0)
      const currencyPart = parts.find((part) => part.type === "currency")?.value
      return { prefix: currencyPart ?? currency }
    } catch {
      return { prefix: currency }
    }
  }

  if (resolved.type === "percent") {
    return { suffix: "%" }
  }

  if (resolved.type === "unit") {
    return { suffix: resolved.unitDisplay === "long" ? resolved.unit.replace(/-/g, " ") : resolved.unit }
  }

  return null
}

function getNumberStep(schema: NumberField, value: unknown): number {
  if (hasDecimal(value) || hasDecimal(schema.min) || hasDecimal(schema.max)) return 0.01
  const resolved = resolveNumberFormat(schema.admin?.format)
  if (resolved && ["currency", "decimal", "percent", "unit"].includes(resolved.type)) return 0.01
  return 1
}

function hasDecimal(value: unknown): boolean {
  return typeof value === "number" ? !Number.isInteger(value) : typeof value === "string" && value.includes(".")
}

function roundNumber(value: number, step: number): number {
  const precision = step >= 1 ? 0 : String(step).split(".")[1]?.length ?? 0
  return Number(value.toFixed(precision))
}

function clampNumber(value: number, min?: number, max?: number): number {
  if (typeof min === "number" && value < min) return min
  if (typeof max === "number" && value > max) return max
  return value
}

function isStepLimitReached(value: unknown, limit: number | undefined, step: number, direction: -1 | 1): boolean {
  if (typeof limit !== "number") return false
  const current = value === "" || value === null || value === undefined ? 0 : Number(value)
  if (!Number.isFinite(current)) return false
  return direction < 0 ? current - step < limit : current + step > limit
}

function getTextPreview(value: unknown, format: TextFormat | undefined): string | null {
  const resolved = resolveTextFormat(format)
  if (!resolved) return null
  if (resolved.type === "code") return "Stored exactly as typed."
  const preview = String(value ?? "")
  if (!preview) return null
  const transformed = formatText(preview, format)
  if (!transformed || transformed === preview) return null
  return `Preview: ${transformed}`
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
