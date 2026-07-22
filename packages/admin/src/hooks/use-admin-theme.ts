import * as React from "react"
import type { AdminThemeHookResult } from "../public/contracts"
import {
  adminThemeClassName,
  getSystemAdminTheme,
  type AdminThemePreference,
} from "./admin-theme"
import { AdminThemeContext } from "./admin-theme-context"

export type { AdminThemePreference, ResolvedAdminTheme } from "./admin-theme"

export function useAdminTheme(): AdminThemeHookResult {
  const context = React.useContext(AdminThemeContext)
  if (!context) {
    const resolvedTheme = getSystemAdminTheme()
    return {
      theme: "system" as AdminThemePreference,
      systemTheme: resolvedTheme,
      resolvedTheme,
      setTheme: () => undefined,
      themeClassName: adminThemeClassName(resolvedTheme),
      controller: null,
    }
  }

  const state = React.useSyncExternalStore(
    context.subscribe,
    context.getState,
    context.getState
  )

  return React.useMemo(
    (): AdminThemeHookResult => ({
      ...state,
      setTheme: context.setTheme,
      controller: context,
    }),
    [context, context.setTheme, state]
  )
}
