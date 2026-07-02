import { THEME_STORAGE_KEY, type ThemePreference } from "~/composables/useTheme"

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark"
}

/**
 * Owns theme side effects on the client: hydrates the stored preference, tracks
 * the OS colour scheme, persists changes, and toggles the `.dark` class on
 * <html>. The inline head script in nuxt.config sets the class before paint to
 * avoid a flash; this plugin keeps it in sync reactively thereafter.
 */
export default defineNuxtPlugin(() => {
  const { preference, systemTheme, resolvedTheme } = useTheme()

  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (isThemePreference(stored)) {
    preference.value = stored
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)")
  systemTheme.value = media.matches ? "dark" : "light"
  const onSystemChange = () => {
    systemTheme.value = media.matches ? "dark" : "light"
  }
  media.addEventListener("change", onSystemChange)

  watchEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolvedTheme.value === "dark")
    root.style.colorScheme = resolvedTheme.value
  })

  watch(preference, (value) => {
    localStorage.setItem(THEME_STORAGE_KEY, value)
  })
})
