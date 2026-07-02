export type ThemePreference = "system" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

export const THEME_STORAGE_KEY = "dyrected-theme"

/**
 * Shared theme state, mirroring the Dyrected admin UI's system/light/dark model.
 * The `.dark` class on <html> is applied by the `theme.client` plugin, which
 * owns the side effects; this composable only exposes reactive state + a setter.
 */
export function useTheme() {
  const preference = useState<ThemePreference>("dy-theme-preference", () => "system")
  const systemTheme = useState<ResolvedTheme>("dy-theme-system", () => "light")

  const resolvedTheme = computed<ResolvedTheme>(() =>
    preference.value === "system" ? systemTheme.value : preference.value,
  )

  function setTheme(next: ThemePreference) {
    preference.value = next
  }

  return { preference, systemTheme, resolvedTheme, setTheme }
}
