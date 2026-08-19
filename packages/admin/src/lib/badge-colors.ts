import type * as React from "react"
import { cn } from "./utils"
import { getOptionBadge } from "./format"
import type { DisplayTone } from "@dyrected/core"

export interface BadgePresentation {
  className: string
  style?: React.CSSProperties
  variant?: "default" | "secondary" | "destructive" | "outline"
}

export const BADGE_COLOR_PALETTES: Record<string, string> = {
  emerald:
    "dy-border-emerald-500/20 dy-bg-emerald-500/10 dy-text-emerald-600 dark:dy-border-emerald-500/30 dark:dy-bg-emerald-500/15 dark:dy-text-emerald-400",
  green:
    "dy-border-emerald-500/20 dy-bg-emerald-500/10 dy-text-emerald-600 dark:dy-border-emerald-500/30 dark:dy-bg-emerald-500/15 dark:dy-text-emerald-400",
  success:
    "dy-border-emerald-500/20 dy-bg-emerald-500/10 dy-text-emerald-600 dark:dy-border-emerald-500/30 dark:dy-bg-emerald-500/15 dark:dy-text-emerald-400",
  amber:
    "dy-border-amber-500/20 dy-bg-amber-500/10 dy-text-amber-600 dark:dy-border-amber-500/30 dark:dy-bg-amber-500/15 dark:dy-text-amber-400",
  yellow:
    "dy-border-amber-500/20 dy-bg-amber-500/10 dy-text-amber-600 dark:dy-border-amber-500/30 dark:dy-bg-amber-500/15 dark:dy-text-amber-400",
  warning:
    "dy-border-amber-500/20 dy-bg-amber-500/10 dy-text-amber-600 dark:dy-border-amber-500/30 dark:dy-bg-amber-500/15 dark:dy-text-amber-400",
  rose:
    "dy-border-rose-500/20 dy-bg-rose-500/10 dy-text-rose-600 dark:dy-border-rose-500/30 dark:dy-bg-rose-500/15 dark:dy-text-rose-400",
  red:
    "dy-border-rose-500/20 dy-bg-rose-500/10 dy-text-rose-600 dark:dy-border-rose-500/30 dark:dy-bg-rose-500/15 dark:dy-text-rose-400",
  danger:
    "dy-border-rose-500/20 dy-bg-rose-500/10 dy-text-rose-600 dark:dy-border-rose-500/30 dark:dy-bg-rose-500/15 dark:dy-text-rose-400",
  destructive:
    "dy-border-rose-500/20 dy-bg-rose-500/10 dy-text-rose-600 dark:dy-border-rose-500/30 dark:dy-bg-rose-500/15 dark:dy-text-rose-400",
  error:
    "dy-border-rose-500/20 dy-bg-rose-500/10 dy-text-rose-600 dark:dy-border-rose-500/30 dark:dy-bg-rose-500/15 dark:dy-text-rose-400",
  blue:
    "dy-border-blue-500/20 dy-bg-blue-500/10 dy-text-blue-600 dark:dy-border-blue-500/30 dark:dy-bg-blue-500/15 dark:dy-text-blue-400",
  sky:
    "dy-border-sky-500/20 dy-bg-sky-500/10 dy-text-sky-600 dark:dy-border-sky-500/30 dark:dy-bg-sky-500/15 dark:dy-text-sky-400",
  cyan:
    "dy-border-cyan-500/20 dy-bg-cyan-500/10 dy-text-cyan-600 dark:dy-border-cyan-500/30 dark:dy-bg-cyan-500/15 dark:dy-text-cyan-400",
  info:
    "dy-border-blue-500/20 dy-bg-blue-500/10 dy-text-blue-600 dark:dy-border-blue-500/30 dark:dy-bg-blue-500/15 dark:dy-text-blue-400",
  indigo:
    "dy-border-indigo-500/20 dy-bg-indigo-500/10 dy-text-indigo-600 dark:dy-border-indigo-500/30 dark:dy-bg-indigo-500/15 dark:dy-text-indigo-400",
  violet:
    "dy-border-violet-500/20 dy-bg-violet-500/10 dy-text-violet-600 dark:dy-border-violet-500/30 dark:dy-bg-violet-500/15 dark:dy-text-violet-400",
  purple:
    "dy-border-purple-500/20 dy-bg-purple-500/10 dy-text-purple-600 dark:dy-border-purple-500/30 dark:dy-bg-purple-500/15 dark:dy-text-purple-400",
  fuchsia:
    "dy-border-fuchsia-500/20 dy-bg-fuchsia-500/10 dy-text-fuchsia-600 dark:dy-border-fuchsia-500/30 dark:dy-bg-fuchsia-500/15 dark:dy-text-fuchsia-400",
  pink:
    "dy-border-pink-500/20 dy-bg-pink-500/10 dy-text-pink-600 dark:dy-border-pink-500/30 dark:dy-bg-pink-500/15 dark:dy-text-pink-400",
  teal:
    "dy-border-teal-500/20 dy-bg-teal-500/10 dy-text-teal-600 dark:dy-border-teal-500/30 dark:dy-bg-teal-500/15 dark:dy-text-teal-400",
  orange:
    "dy-border-orange-500/20 dy-bg-orange-500/10 dy-text-orange-600 dark:dy-border-orange-500/30 dark:dy-bg-orange-500/15 dark:dy-text-orange-400",
  zinc: "dy-border-border dy-bg-muted dy-text-muted-foreground",
  gray: "dy-border-border dy-bg-muted dy-text-muted-foreground",
  grey: "dy-border-border dy-bg-muted dy-text-muted-foreground",
  slate:
    "dy-border-slate-500/20 dy-bg-slate-500/10 dy-text-slate-600 dark:dy-border-slate-500/30 dark:dy-bg-slate-500/15 dark:dy-text-slate-400",
  stone:
    "dy-border-stone-500/20 dy-bg-stone-500/10 dy-text-stone-600 dark:dy-border-stone-500/30 dark:dy-bg-stone-500/15 dark:dy-text-stone-400",
  neutral: "dy-border-border dy-bg-muted dy-text-muted-foreground",
  muted: "dy-border-border dy-bg-muted dy-text-muted-foreground",
  primary: "dy-border-primary/20 dy-bg-primary/10 dy-text-primary",
  secondary: "dy-border-border dy-bg-secondary dy-text-secondary-foreground",
}

export interface ResolveBadgePresentationOptions {
  value: unknown
  badgeText?: string
  badgeColors?: Record<string, string>
  fieldDef?: any
  defaultVariant?: "default" | "secondary" | "destructive" | "outline"
  baseClassName?: string
}

/**
 * Resolves styling and variant presentation for badge components in Detail View and tables.
 *
 * Checks explicit `badgeColors` mappings first (with case-insensitive and wildcard fallback),
 * then falls back to `admin.format` badge tones if configured on the field schema.
 */
export function resolveBadgePresentation({
  value,
  badgeText,
  badgeColors,
  fieldDef,
  defaultVariant = "secondary",
  baseClassName = "dy-font-medium dy-text-xs",
}: ResolveBadgePresentationOptions): BadgePresentation {
  let matchedColor: string | undefined

  if (badgeColors && typeof badgeColors === "object") {
    const candidates: string[] = []

    if (value != null) {
      if (typeof value === "object") {
        const valObj = value as Record<string, any>
        if (valObj.id != null) candidates.push(String(valObj.id))
        if (valObj.value != null) candidates.push(String(valObj.value))
        if (valObj.name != null) candidates.push(String(valObj.name))
        if (valObj.title != null) candidates.push(String(valObj.title))
      } else {
        candidates.push(String(value))
      }
    }

    if (badgeText && !candidates.includes(badgeText)) {
      candidates.push(badgeText)
    }

    for (const key of candidates) {
      if (key in badgeColors) {
        matchedColor = badgeColors[key]
        break
      }
      const lower = key.toLowerCase()
      const foundKey = Object.keys(badgeColors).find((k) => k.toLowerCase() === lower)
      if (foundKey) {
        matchedColor = badgeColors[foundKey]
        break
      }
    }

    if (!matchedColor) {
      matchedColor = badgeColors["*"] ?? badgeColors.default
    }
  }

  // Fallback: check fieldDef.admin.format / fieldDef.format badge tones
  if (!matchedColor && fieldDef) {
    const formatSpec = fieldDef.admin?.format ?? fieldDef.format
    const optionBadge = getOptionBadge(value, formatSpec, fieldDef.options)
    if (optionBadge?.tone) {
      matchedColor = optionBadge.tone as DisplayTone
    }
  }

  if (!matchedColor) {
    return {
      variant: defaultVariant,
      className: baseClassName,
    }
  }

  const trimmedColor = matchedColor.trim()
  const lowerColor = trimmedColor.toLowerCase()

  const preset = BADGE_COLOR_PALETTES[lowerColor]
  if (preset) {
    return {
      variant: "outline",
      className: cn(baseClassName, preset),
    }
  }

  // Raw CSS utility classes (e.g. "bg-emerald-100 text-emerald-800" or "dy-...")
  if (
    trimmedColor.includes(" ") ||
    trimmedColor.startsWith("dy-") ||
    trimmedColor.startsWith("bg-") ||
    trimmedColor.startsWith("text-") ||
    trimmedColor.startsWith("border-")
  ) {
    return {
      variant: "outline",
      className: cn(baseClassName, trimmedColor),
    }
  }

  // CSS Color value (hex, rgb, hsl, named color)
  return {
    variant: "outline",
    className: baseClassName,
    style: {
      color: trimmedColor,
      borderColor: `color-mix(in srgb, ${trimmedColor} 30%, transparent)`,
      backgroundColor: `color-mix(in srgb, ${trimmedColor} 12%, transparent)`,
    },
  }
}
