import jexl from "jexl"

type AccessAware = { access?: { read?: unknown } | null } | null | undefined

/**
 * Whether the current user may read a collection or global, based on the
 * `access.read` value `/api/schemas` returned for them.
 *
 * The server resolves function and named-policy rules to a boolean, so `false`
 * means denied. Jexl strings are evaluated here with the signed-in user.
 * Missing or unresolvable rules default to visible: this is a UI hint only and
 * the API remains the authoritative enforcement point.
 */
export function canReadSchema(schema: AccessAware, user: unknown): boolean {
  const rule = schema?.access?.read
  if (rule === false) return false
  if (typeof rule === "string") {
    try {
      return Boolean(jexl.evalSync(rule, { user }))
    } catch {
      return false
    }
  }
  return true
}
