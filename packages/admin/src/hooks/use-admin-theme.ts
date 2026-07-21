import * as React from "react"
import {
  adminThemeClassName,
  getSystemAdminTheme,
  type AdminThemePreference,
} from "./admin-theme"
import { AdminThemeContext } from "./admin-theme-context"
import type { AdminThemeControllerState } from "../controllers/theme"

export type { AdminThemePreference, ResolvedAdminTheme } from "./admin-theme"

export function useAdminTheme() {
  const context = React.useContext(AdminThemeContext)
  if (!context) {
    const resolvedTheme = getSystemAdminTheme()
    return {
      theme: "system" as AdminThemePreference,
      systemTheme: resolvedTheme,
      resolvedTheme,
      setTheme: () => undefined,
      themeClassName: adminThemeClassName(resolvedTheme),
    }
  }

  const state = React.useSyncExternalStore(
    context.subscribe,
    context.getState,
    context.getState
  )

  return React.useMemo(
    (): AdminThemeControllerState & { setTheme: typeof context.setTheme } => ({
      ...state,
      setTheme: context.setTheme,
    }),
    [context.setTheme, state]
  )
}
