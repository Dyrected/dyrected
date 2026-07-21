import * as React from "react"
import {
  getSystemAdminTheme,
  type AdminThemePreference,
} from "./admin-theme"
import { createAdminThemeController, type AdminThemeController } from "../controllers/theme"
import { AdminThemeContext } from "./admin-theme-context"
import { useAdminTheme } from "./use-admin-theme"
import { usePreferences } from "./use-preferences"

function subscribeToSystemAdminTheme(
  onChange: (theme: "light" | "dark") => void
) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)")
  const syncSystemTheme = () => {
    onChange(media.matches ? "dark" : "light")
  }

  syncSystemTheme()
  media.addEventListener("change", syncSystemTheme)
  return () => media.removeEventListener("change", syncSystemTheme)
}

export function AdminThemeProvider({
  children,
  controller,
}: {
  children: React.ReactNode
  controller?: AdminThemeController
}) {
  const [theme, setTheme] = usePreferences<AdminThemePreference>("theme", "system")
  const controllerRef = React.useRef<AdminThemeController>(
    controller ??
      createAdminThemeController({
        theme,
        systemTheme: getSystemAdminTheme(),
        onThemeChange: setTheme,
      })
  )
  const activeController = controllerRef.current

  React.useEffect(() => {
    activeController.setState((currentState) => {
      if (currentState.theme === theme) return currentState
      return {
        ...currentState,
        theme,
      }
    })
  }, [activeController, theme])

  React.useEffect(() => {
    return subscribeToSystemAdminTheme((systemTheme) => {
      activeController.setSystemTheme(systemTheme)
    })
  }, [activeController])

  return <AdminThemeContext.Provider value={activeController}>{children}</AdminThemeContext.Provider>
}

export function AdminThemedRoot({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, themeClassName } = useAdminTheme()

  return (
    <div className={`${themeClassName} dy-h-full`} data-theme={resolvedTheme}>
      {children}
    </div>
  )
}
