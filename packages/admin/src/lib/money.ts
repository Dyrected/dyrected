import type { MoneyField } from "@dyrected/core"

/**
 * Helpers for `money` fields, which the API stores as integer minor units
 * (kobo, cents). The Admin shows major units, converting with string math so
 * editing never introduces floating-point drift.
 */

export function moneyDecimals(field: Pick<MoneyField, "decimals">): number {
  const d = field.decimals
  return typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 8 ? d : 2
}

/** Whether the Admin should present minor units as a major-unit amount. Defaults to `true`. */
export function showsMajorUnits(field: Pick<MoneyField, "admin">): boolean {
  return field.admin?.displayMinorAsMajor !== false
}

/** Resolves the ISO currency code for a value: a sibling field's value wins over the fixed `currency`. */
export function resolveMoneyCurrency(
  field: Pick<MoneyField, "currency" | "currencyField">,
  siblingData?: Record<string, unknown>,
): string | undefined {
  if (field.currencyField) {
    const fromSibling = siblingData?.[field.currencyField]
    if (typeof fromSibling === "string" && fromSibling) return fromSibling
  }
  return field.currency
}

function toMinorNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim())
  return null
}

/** `5250000` with 2 decimals becomes `"52500.00"`. */
export function minorToMajorString(minor: unknown, decimals: number): string {
  const n = toMinorNumber(minor)
  if (n === null) return ""
  const sign = n < 0 ? "-" : ""
  const digits = String(Math.abs(n)).padStart(decimals + 1, "0")
  if (decimals === 0) return `${sign}${digits}`
  return `${sign}${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`
}

/**
 * Parses what an editor typed (`"52,500.5"`) into integer minor units.
 * Returns `null` for empty input and `undefined` when the text is not a valid
 * amount or has more decimal places than the currency allows.
 */
export function majorToMinor(text: string, decimals: number): number | null | undefined {
  const cleaned = text.replace(/[\s,]/g, "")
  if (cleaned === "") return null
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(cleaned)
  if (!match) return undefined
  const [, sign, whole = "", fraction = ""] = match
  if (whole === "" && fraction === "") return undefined
  if (fraction.length > decimals) return undefined
  const minor = Number(`${whole || "0"}${fraction.padEnd(decimals, "0")}`)
  if (!Number.isSafeInteger(minor)) return undefined
  return sign ? -minor : minor
}

/** Formats stored minor units for read-only display, for example `₦52,500.00`. */
export function formatMoney(
  minor: unknown,
  field: Pick<MoneyField, "currency" | "currencyField" | "decimals" | "admin">,
  siblingData?: Record<string, unknown>,
): string {
  const n = toMinorNumber(minor)
  if (n === null) return minor == null ? "" : String(minor)
  if (!showsMajorUnits(field)) return String(n)

  const decimals = moneyDecimals(field)
  const major = n / 10 ** decimals
  const currency = resolveMoneyCurrency(field, siblingData)
  try {
    return new Intl.NumberFormat(undefined, {
      ...(currency ? { style: "currency", currency } : {}),
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major)
  } catch {
    // Unknown currency code: show the plain amount rather than crash a list cell.
    return major.toFixed(decimals)
  }
}
