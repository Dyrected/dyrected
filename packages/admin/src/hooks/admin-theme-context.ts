import * as React from "react"
import type { AdminThemePreference, ResolvedAdminTheme } from "./admin-theme"

export interface AdminThemeContextValue {
  theme: AdminThemePreference
  resolvedTheme: ResolvedAdminTheme
  setTheme: (theme: AdminThemePreference) => void
  themeClassName: string
}

export const AdminThemeContext = React.createContext<AdminThemeContextValue | null>(null)
