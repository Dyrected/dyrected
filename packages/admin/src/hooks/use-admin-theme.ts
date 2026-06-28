import * as React from "react"
import {
  adminThemeClassName,
  type AdminThemePreference,
  type ResolvedAdminTheme,
} from "./admin-theme"
import { AdminThemeContext } from "./admin-theme-context"

export type { AdminThemePreference, ResolvedAdminTheme } from "./admin-theme"

function getSystemTheme(): ResolvedAdminTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function useAdminTheme() {
  const context = React.useContext(AdminThemeContext)
  if (!context) {
    const resolvedTheme = getSystemTheme()
    return {
      theme: "system" as AdminThemePreference,
      resolvedTheme,
      setTheme: () => undefined,
      themeClassName: adminThemeClassName(resolvedTheme),
    }
  }
  return context
}
