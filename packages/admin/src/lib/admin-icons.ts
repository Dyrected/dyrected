import { icons, type LucideIcon } from "lucide-react"
import type { AdminIconName } from "@dyrected/core"

export function isAdminIconName(value: unknown): value is AdminIconName {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(icons, value)
}

export function resolveAdminIcon(value: unknown, fallback: LucideIcon): LucideIcon {
  return isAdminIconName(value) ? icons[value] : fallback
}
