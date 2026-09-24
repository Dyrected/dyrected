import * as React from "react"
import type { MoneyField as MoneyFieldSchema } from "@dyrected/core"
import { Input } from "../../ui/input"
import { majorToMinor, minorToMajorString, moneyDecimals, resolveMoneyCurrency, showsMajorUnits } from "../../../lib/money"

interface MoneyFieldProps {
  schema: MoneyFieldSchema
  field: {
    value: number | string | null | undefined
    onChange: (...event: any[]) => void
    onBlur?: () => void
    name: string
    ref: React.Ref<HTMLInputElement>
  }
  siblingData?: Record<string, unknown>
  disabled?: boolean
}

/**
 * Edits a `money` field in major units (`52,500.00`) while the form value stays
 * an integer count of minor units.
 */
export function MoneyField({ schema, field, siblingData, disabled }: MoneyFieldProps) {
  const major = showsMajorUnits(schema)
  const decimals = major ? moneyDecimals(schema) : 0
  const currency = resolveMoneyCurrency(schema, siblingData)
  const value = field.value

  const [draft, setDraft] = React.useState(() => minorToMajorString(value, decimals))

  // Follow external value changes (form reset, server response) without clobbering
  // what the editor is mid-way through typing.
  React.useEffect(() => {
    setDraft((prev) => (majorToMinor(prev, decimals) === (value ?? null) ? prev : minorToMajorString(value, decimals)))
  }, [value, decimals])

  const label = schema.label || schema.name
  return (
    <div className="dy-flex dy-items-stretch dy-gap-2">
      {currency ? (
        <span className="dy-inline-flex dy-items-center dy-rounded-md dy-border dy-border-input dy-bg-muted/40 dy-px-3 dy-text-xs dy-font-medium dy-text-muted-foreground">
          {currency}
        </span>
      ) : null}
      <Input
        ref={field.ref}
        name={field.name}
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        value={draft}
        disabled={disabled}
        aria-label={label}
        placeholder={schema.admin?.placeholder || (decimals > 0 ? `0.${"0".repeat(decimals)}` : "0")}
        onBlur={() => {
          field.onBlur?.()
          setDraft(minorToMajorString(value, decimals))
        }}
        onChange={(e) => {
          const text = e.target.value
          setDraft(text)
          const minor = majorToMinor(text, decimals)
          if (minor !== undefined) field.onChange(minor)
        }}
      />
    </div>
  )
}
