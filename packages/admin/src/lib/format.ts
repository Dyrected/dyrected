import type { DateFormat, NumberFormat } from "@dyrected/core"

/**
 * Display-only formatting for `number` and `date`/`datetime`/`time` field values,
 * driven by a field's `admin.format` option. Everything here is best-effort: an
 * unparseable value or an unsupported option falls back to a plain string rather
 * than throwing, because these run inside list-cell rendering.
 */

type NumberFormatObject = Exclude<NumberFormat, string>
type DateFormatObject = Exclude<DateFormat, string>

/** Normalize the shorthand string form into the object form. */
export function resolveNumberFormat(format: NumberFormat | undefined): NumberFormatObject | null {
  if (!format) return null
  return typeof format === "string" ? ({ type: format } as NumberFormatObject) : format
}

/** Normalize the shorthand string form into the object form. */
export function resolveDateFormat(format: DateFormat | undefined): DateFormatObject | null {
  if (!format) return null
  return typeof format === "string" ? ({ type: format } as DateFormatObject) : format
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export interface RatingSpec {
  value: number
  max: number
}

/**
 * When the field uses the `rating` format, return the numeric value and star
 * count so the caller can render stars. Returns `null` for every other format,
 * signalling that {@link formatNumber} should be used instead.
 */
export function getRatingSpec(value: unknown, format: NumberFormat | undefined): RatingSpec | null {
  const resolved = resolveNumberFormat(format)
  if (!resolved || resolved.type !== "rating") return null
  const num = toNumber(value)
  if (num === null) return null
  const max = typeof resolved.max === "number" && resolved.max > 0 ? Math.floor(resolved.max) : 5
  return { value: Math.max(0, Math.min(num, max)), max }
}

const BYTE_UNITS_DECIMAL = ["B", "KB", "MB", "GB", "TB", "PB", "EB"]
const BYTE_UNITS_BINARY = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"]

function formatBytes(bytes: number, binary: boolean, maximumFractionDigits: number): string {
  const base = binary ? 1024 : 1000
  const units = binary ? BYTE_UNITS_BINARY : BYTE_UNITS_DECIMAL
  const sign = bytes < 0 ? "-" : ""
  let amount = Math.abs(bytes)
  let unitIndex = 0
  while (amount >= base && unitIndex < units.length - 1) {
    amount /= base
    unitIndex += 1
  }
  const digits = unitIndex === 0 ? 0 : maximumFractionDigits
  const rounded = amount.toFixed(digits).replace(/\.?0+$/, "")
  return `${sign}${rounded} ${units[unitIndex]}`
}

/**
 * Format a numeric field value for display. Returns a plain string for every
 * format except `rating` (use {@link getRatingSpec} for that). Non-numeric input
 * is stringified unchanged.
 */
export function formatNumber(value: unknown, format: NumberFormat | undefined): string {
  const resolved = resolveNumberFormat(format)
  const num = toNumber(value)
  if (!resolved || num === null) return value == null ? "" : String(value)

  try {
    switch (resolved.type) {
      case "decimal":
        return new Intl.NumberFormat(resolved.locale, {
          minimumFractionDigits: resolved.minimumFractionDigits,
          maximumFractionDigits: resolved.maximumFractionDigits,
        }).format(num)
      case "currency":
        return new Intl.NumberFormat(resolved.locale, {
          style: "currency",
          currency: resolved.currency ?? "USD",
          minimumFractionDigits: resolved.minimumFractionDigits,
          maximumFractionDigits: resolved.maximumFractionDigits,
        }).format(num)
      case "percent": {
        const ratio = resolved.scale === false ? num / 100 : num
        return new Intl.NumberFormat(resolved.locale, {
          style: "percent",
          minimumFractionDigits: resolved.minimumFractionDigits,
          maximumFractionDigits: resolved.maximumFractionDigits,
        }).format(ratio)
      }
      case "unit":
        return new Intl.NumberFormat(resolved.locale, {
          style: "unit",
          unit: resolved.unit,
          unitDisplay: resolved.unitDisplay,
          maximumFractionDigits: resolved.maximumFractionDigits,
        }).format(num)
      case "compact":
        return new Intl.NumberFormat(resolved.locale, {
          notation: "compact",
          maximumFractionDigits: resolved.maximumFractionDigits ?? 1,
        }).format(num)
      case "bytes":
        return formatBytes(num, resolved.binary === true, resolved.maximumFractionDigits ?? 1)
      case "rating":
        // Rendered as stars by the caller via getRatingSpec; fall back to text.
        return `${num}/${typeof resolved.max === "number" ? resolved.max : 5}`
      default:
        return String(num)
    }
  } catch {
    // Invalid currency/unit/locale — degrade to the raw number rather than crash.
    return String(num)
  }
}

const RELATIVE_DIVISIONS: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
]

function formatRelative(date: Date, locale: string | undefined, now: number): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  let duration = (date.getTime() - now) / 1000
  for (const division of RELATIVE_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }
  return rtf.format(Math.round(duration), "year")
}

/**
 * Format a date/datetime/time field value for display. `now` is injected so the
 * `relative` format stays deterministic and testable. Unparseable input is
 * stringified unchanged.
 */
export function formatDate(
  value: unknown,
  format: DateFormat | undefined,
  fieldType: "date" | "datetime" | "time",
  now: number = Date.now(),
): string {
  const resolved = resolveDateFormat(format)
  if (value == null || value === "") return ""

  // A bare `time` value like "14:30" is not a valid Date argument on its own.
  const raw = String(value)
  const date =
    fieldType === "time" && /^\d{1,2}:\d{2}/.test(raw) ? new Date(`1970-01-01T${raw}`) : new Date(raw)
  if (Number.isNaN(date.getTime())) return raw

  const type = resolved?.type ?? fieldType

  try {
    switch (type) {
      case "relative":
        return formatRelative(date, resolved && "locale" in resolved ? resolved.locale : undefined, now)
      case "time":
        return date.toLocaleTimeString(
          resolved?.locale,
          resolved?.type === "time" ? { timeStyle: resolved.timeStyle ?? "short" } : { timeStyle: "short" },
        )
      case "datetime":
        return date.toLocaleString(
          resolved?.locale,
          resolved?.type === "datetime"
            ? { dateStyle: resolved.dateStyle ?? "medium", timeStyle: resolved.timeStyle ?? "short" }
            : { dateStyle: "medium", timeStyle: "short" },
        )
      case "date":
      default:
        return date.toLocaleDateString(
          resolved?.locale,
          resolved?.type === "date" ? { dateStyle: resolved.dateStyle ?? "medium" } : { dateStyle: "medium" },
        )
    }
  } catch {
    return date.toLocaleString()
  }
}
