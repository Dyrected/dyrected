import type {
  BooleanFormat,
  DateFormat,
  DisplayTone,
  JsonFormat,
  LinkFormat,
  NumberFormat,
  OptionFormat,
  TextFormat,
} from "@dyrected/core"

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

// ---------------------------------------------------------------------------
// Option badges (select / radio / multiSelect)
// ---------------------------------------------------------------------------

/**
 * Soft pill classes per {@link DisplayTone}. Kept here (not as JSX) so the same
 * mapping can drive list cells, previews, and tests. Composed with the base pill
 * classes by the caller.
 */
const DISPLAY_TONE_CLASS: Record<DisplayTone, string> = {
  neutral: "dy-border-border dy-bg-muted dy-text-muted-foreground",
  primary: "dy-border-primary/20 dy-bg-primary/10 dy-text-primary",
  success: "dy-border-emerald-500/20 dy-bg-emerald-500/10 dy-text-emerald-600",
  warning: "dy-border-amber-500/20 dy-bg-amber-500/10 dy-text-amber-600",
  danger: "dy-border-red-500/20 dy-bg-red-500/10 dy-text-red-600",
  info: "dy-border-blue-500/20 dy-bg-blue-500/10 dy-text-blue-600",
}

/** The color classes for a tone, falling back to `neutral`. */
export function displayToneClass(tone: DisplayTone | undefined): string {
  return DISPLAY_TONE_CLASS[tone ?? "neutral"] ?? DISPLAY_TONE_CLASS.neutral
}

type OptionFormatObject = Exclude<OptionFormat, string>

export function resolveOptionFormat(format: OptionFormat | undefined): OptionFormatObject | null {
  if (!format) return null
  return typeof format === "string" ? ({ type: format } as OptionFormatObject) : format
}

/** Field `options` as they arrive at render time — bare strings or `{ label, value }`. */
type FieldOption = string | { label?: string; value?: unknown }

function optionLabel(value: unknown, options: FieldOption[] | undefined): string {
  if (Array.isArray(options)) {
    for (const option of options) {
      if (typeof option === "string") {
        if (option === value) return option
      } else if (option && option.value === value) {
        return option.label ?? String(option.value)
      }
    }
  }
  return value == null ? "" : String(value)
}

export interface BadgeSpec {
  label: string
  tone: DisplayTone
}

/**
 * Resolve a single option value into a badge label + tone. Returns `null` when
 * the field has no badge format, signalling the caller to render plainly.
 */
export function getOptionBadge(
  value: unknown,
  format: OptionFormat | undefined,
  options?: FieldOption[],
): BadgeSpec | null {
  const resolved = resolveOptionFormat(format)
  if (!resolved || resolved.type !== "badge") return null
  const key = value == null ? "" : String(value)
  const label = resolved.labels?.[key] ?? optionLabel(value, options)
  const tone = resolved.tones?.[key] ?? resolved.defaultTone ?? "neutral"
  return { label, tone }
}

// ---------------------------------------------------------------------------
// Boolean badges
// ---------------------------------------------------------------------------

/**
 * Resolve a boolean value into a custom label + tone. Returns `null` when the
 * field has no boolean format, so the caller keeps the default Yes/No badge.
 */
export function getBooleanBadge(value: unknown, format: BooleanFormat | undefined): BadgeSpec | null {
  if (!format || format.type !== "boolean") return null
  const side = value ? format.true : format.false
  const label = side?.label ?? (value ? "Yes" : "No")
  const tone = side?.tone ?? (value ? "success" : "neutral")
  return { label, tone }
}

// ---------------------------------------------------------------------------
// Text transforms
// ---------------------------------------------------------------------------

type TextFormatObject = Exclude<TextFormat, string>

export function resolveTextFormat(format: TextFormat | undefined): TextFormatObject | null {
  if (!format) return null
  return typeof format === "string" ? ({ type: format } as TextFormatObject) : format
}

function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase())
}

/** Apply a display-only transform to a text value. */
export function formatText(value: unknown, format: TextFormat | undefined): string {
  const resolved = resolveTextFormat(format)
  const text = value == null ? "" : String(value)
  if (!resolved) return text

  switch (resolved.type) {
    case "uppercase":
      return text.toUpperCase()
    case "lowercase":
      return text.toLowerCase()
    case "capitalize":
      return capitalizeWords(text)
    case "code":
      return text
    case "truncate":
      return text.length > resolved.length ? `${text.slice(0, resolved.length)}…` : text
    case "mask": {
      const reveal = typeof resolved.reveal === "number" ? Math.max(0, resolved.reveal) : 4
      const char = resolved.character ?? "•"
      if (text.length <= reveal) return text
      const hidden = char.repeat(Math.min(text.length - reveal, 8))
      return `${hidden}${text.slice(text.length - reveal)}`
    }
    default:
      return text
  }
}

/** Whether a text format should render in a monospace pill. */
export function isCodeText(format: TextFormat | undefined): boolean {
  return resolveTextFormat(format)?.type === "code"
}

// ---------------------------------------------------------------------------
// Links (url / email)
// ---------------------------------------------------------------------------

export interface LinkSpec {
  href: string
  label: string
  newTab: boolean
}

/**
 * Resolve a url/email value into a link spec. Returns `null` when the field has
 * no link format. `fieldType` selects between an `http` link and a `mailto:`.
 */
export function getLinkSpec(
  value: unknown,
  format: LinkFormat | undefined,
  fieldType: "url" | "email",
): LinkSpec | null {
  if (!format) return null
  const resolved = typeof format === "string" ? { type: "link" as const } : format
  if (resolved.type !== "link") return null
  const raw = value == null ? "" : String(value)
  if (!raw) return null
  const href = fieldType === "email" ? `mailto:${raw}` : raw
  return { href, label: raw, newTab: resolved.newTab !== false && fieldType === "url" }
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/** Format a JSON value as a compact summary or truncated code preview. */
export function formatJson(value: unknown, format: JsonFormat | undefined): string {
  const resolved = typeof format === "string" ? { type: format } : format
  if (resolved?.type === "summary" && value && typeof value === "object") {
    const count = Array.isArray(value) ? value.length : Object.keys(value).length
    return Array.isArray(value) ? `[ ${count} items ]` : `{ ${count} keys }`
  }
  const json = JSON.stringify(value)
  if (!json) return ""
  return json.length > 40 ? `${json.slice(0, 40)}…` : json
}
