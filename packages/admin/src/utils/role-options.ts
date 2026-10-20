export interface RoleOption {
  value: string
  label: string
}

type FieldLike = {
  name?: string
  type?: string
  options?: unknown
  admin?: { inviteRole?: boolean } | null
}

type SchemaLike = { fields?: FieldLike[] } | null | undefined

/**
 * Roles a project has defined, read from its auth collection's role field.
 *
 * The role field is the one named `roles` or `role`, or a select marked
 * `admin.inviteRole` (the same lookup the invite dialog uses). Select options
 * can be plain strings or `{ label, value }` objects. Returns an empty list
 * when the field has no fixed options (for example a free-text or JSON field),
 * so callers can fall back to letting the user type a role.
 */
export function resolveRoleOptions(authCollection: SchemaLike): RoleOption[] {
  const roleField = authCollection?.fields?.find(
    (field) => field.name === "roles" || field.name === "role" || (field.type === "select" && field.admin?.inviteRole),
  )
  if (!roleField || !Array.isArray(roleField.options)) return []

  const seen = new Set<string>()
  const options: RoleOption[] = []
  for (const option of roleField.options as unknown[]) {
    const value = typeof option === "string" ? option : (option as { value?: unknown } | null)?.value
    if (typeof value !== "string" || !value.trim() || seen.has(value)) continue
    seen.add(value)
    const label = typeof option === "object" && option !== null ? (option as { label?: unknown }).label : undefined
    options.push({ value, label: typeof label === "string" && label.trim() ? label : value })
  }
  return options
}
