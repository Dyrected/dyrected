import * as React from "react"
import {
  adminThemeClassName,
  resolveAdminTheme,
  type AdminThemePreference,
  type ResolvedAdminTheme,
} from "./admin-theme"
import { AdminThemeContext, type AdminThemeContextValue } from "./admin-theme-context"
import { useAdminTheme } from "./use-admin-theme"
import { usePreferences } from "./use-preferences"

function getSystemTheme(): ResolvedAdminTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = usePreferences<AdminThemePreference>("theme", "system")
  const [systemTheme, setSystemTheme] = React.useState<ResolvedAdminTheme>(() => getSystemTheme())

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const syncSystemTheme = () => {
      setSystemTheme(media.matches ? "dark" : "light")
    }

    syncSystemTheme()
    media.addEventListener("change", syncSystemTheme)
    return () => media.removeEventListener("change", syncSystemTheme)
  }, [])

  const resolvedTheme = resolveAdminTheme(theme, systemTheme)
  const value = React.useMemo<AdminThemeContextValue>(() => ({
    theme,
    resolvedTheme,
    setTheme,
    themeClassName: adminThemeClassName(resolvedTheme),
  }), [resolvedTheme, setTheme, theme])

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>
}

export function AdminThemedRoot({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, themeClassName } = useAdminTheme()

  return (
    <div className={`${themeClassName} dy-h-full`} data-theme={resolvedTheme}>
      {children}
    </div>
  )
}
