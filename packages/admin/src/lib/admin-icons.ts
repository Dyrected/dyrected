import { icons, type LucideIcon } from "lucide-react"
import type { AdminIconName } from "@dyrected/core"

/**
 * Type guard — returns `true` if `value` is a string that matches a known
 * Lucide icon name (i.e. a valid `AdminIconName`).
 */
export function isAdminIconName(value: unknown): value is AdminIconName {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(icons, value)
}

/**
 * Returns the Lucide icon component for `value` if it is a valid `AdminIconName`,
 * otherwise returns `fallback`.
 *
 * @param value - An untrusted value that may or may not be an icon name.
 * @param fallback - The icon to use when `value` is not a valid icon name.
 */
export function resolveAdminIcon(value: unknown, fallback: LucideIcon): LucideIcon {
  return isAdminIconName(value) ? icons[value] : fallback
}
