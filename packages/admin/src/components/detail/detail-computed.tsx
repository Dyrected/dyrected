/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react"
import { evaluateJexl } from "@dyrected/core"
import { formatNumber } from "../../lib/format"
import type { DetailComputedOptions } from "@dyrected/core"

export interface DetailComputedComponentProps {
  id?: string
  label: string
  expression?: string
  options?: DetailComputedOptions
  doc: any
  user?: any
}

export function DetailComputedComponent({
  id,
  label,
  expression,
  options,
  doc,
  user,
}: DetailComputedComponentProps) {
  const computedKey = id || label.toLowerCase().replace(/[^a-z0-9]+/g, "_")
  const serverComputedValue = doc?._meta?.computed?.[computedKey]

  const [value, setValue] = useState<any>(serverComputedValue)

  useEffect(() => {
    let cancelled = false

    if (serverComputedValue !== undefined) {
      setValue(serverComputedValue)
      return
    }

    if (expression) {
      evaluateJexl(expression, { doc, user }).then((evaluated) => {
        if (!cancelled) {
          setValue(evaluated)
        }
      })
    }

    return () => {
      cancelled = true
    }
  }, [serverComputedValue, expression, doc, user])

  const renderFormattedValue = () => {
    if (value === undefined || value === null) {
      return <span className="dy-text-muted-foreground/60 dy-italic dy-text-sm">-</span>
    }

    if (options?.format === "currency") {
      const currency = options.currency || "USD"
      const num = Number(value) || 0
      return (
        <span className="dy-font-bold dy-tabular-nums dy-text-lg dy-text-foreground">
          {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num)}
        </span>
      )
    }

    if (typeof value === "number") {
      return (
        <span className="dy-font-bold dy-tabular-nums dy-text-lg dy-text-foreground">
          {formatNumber(value, options?.format as any)}
        </span>
      )
    }

    return (
      <span className="dy-font-semibold dy-text-base dy-text-foreground">
        {String(value)}
      </span>
    )
  }

  return (
    <div className="dy-p-4 dy-bg-muted/30 dy-border dy-border-border/60 dy-rounded-xl dy-space-y-1">
      <span className="dy-text-xs dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground">
        {label}
      </span>
      <div>{renderFormattedValue()}</div>
    </div>
  )
}
