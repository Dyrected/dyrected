export type AdminThemePreference = "system" | "light" | "dark"
export type ResolvedAdminTheme = "light" | "dark"

export function resolveAdminTheme(
  preference: AdminThemePreference,
  systemTheme: ResolvedAdminTheme,
): ResolvedAdminTheme {
  return preference === "system" ? systemTheme : preference
}

export function adminThemeClassName(resolvedTheme: ResolvedAdminTheme) {
  return resolvedTheme === "dark"
    ? "dy-admin-ui dark"
    : "dy-admin-ui"
}
