import {
  adminThemeClassName,
  resolveAdminTheme,
  type AdminThemePreference,
  type ResolvedAdminTheme,
} from "../hooks/admin-theme"

type Listener = () => void

export interface AdminThemeControllerState {
  theme: AdminThemePreference
  systemTheme: ResolvedAdminTheme
  resolvedTheme: ResolvedAdminTheme
  themeClassName: string
}

export interface AdminThemeController {
  getState(): AdminThemeControllerState
  subscribe(listener: Listener): () => void
  setTheme(theme: AdminThemePreference): void
  setSystemTheme(theme: ResolvedAdminTheme): void
  setState(
    nextState:
      | Partial<AdminThemeControllerState>
      | ((currentState: AdminThemeControllerState) => AdminThemeControllerState)
  ): void
}

export interface AdminThemeControllerOptions {
  theme?: AdminThemePreference
  systemTheme?: ResolvedAdminTheme
  onThemeChange?: (theme: AdminThemePreference) => void
}

/**
 * Creates a framework-agnostic admin theme controller.
 *
 * This controller is the shared theme engine used by the React and Vue public
 * APIs, and can also be used directly by other framework adapters.
 */
export function createAdminThemeController({
  theme = "system",
  systemTheme = "light",
  onThemeChange,
}: AdminThemeControllerOptions = {}): AdminThemeController {
  let state: AdminThemeControllerState = {
    theme,
    systemTheme,
    resolvedTheme: resolveAdminTheme(theme, systemTheme),
    themeClassName: adminThemeClassName(resolveAdminTheme(theme, systemTheme)),
  }
  const listeners = new Set<Listener>()

  const emit = () => {
    listeners.forEach((listener) => listener())
  }

  const normalizeState = (
    nextState: Partial<AdminThemeControllerState>
  ): AdminThemeControllerState => {
    const nextTheme = nextState.theme ?? state.theme
    const nextSystemTheme = nextState.systemTheme ?? state.systemTheme
    const resolvedTheme = resolveAdminTheme(nextTheme, nextSystemTheme)

    return {
      ...state,
      ...nextState,
      theme: nextTheme,
      systemTheme: nextSystemTheme,
      resolvedTheme,
      themeClassName: adminThemeClassName(resolvedTheme),
    }
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setTheme: (nextTheme) => {
      if (state.theme === nextTheme) return
      state = normalizeState({ theme: nextTheme })
      emit()
      onThemeChange?.(nextTheme)
    },
    setSystemTheme: (nextSystemTheme) => {
      if (state.systemTheme === nextSystemTheme) return
      state = normalizeState({ systemTheme: nextSystemTheme })
      emit()
    },
    setState: (nextState) => {
      const resolvedState =
        typeof nextState === "function"
          ? nextState(state)
          : normalizeState(nextState)
      if (Object.is(resolvedState, state)) return
      state = resolvedState
      emit()
    },
  }
}
