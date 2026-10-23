import type { CompiledNavItem } from "@dyrected/core"
import { canReadSchema } from "./schema-access"

type SchemaSet = {
  collections?: Array<{ slug: string; access?: { read?: unknown } | null }>
  globals?: Array<{ slug: string; access?: { read?: unknown } | null }>
} | null | undefined

/**
 * Whether the signed-in user should see a navigation item in the sidebar.
 *
 * Items from the server tree were already pruned by `access`, so only the
 * collection/global read check applies. Items injected from a user's saved
 * preferences (`userDefined`) have no server-side `access`, so they are shown
 * only when every collection or global they point at exists and is readable.
 * An injected item that points at nothing is dropped.
 *
 * This is a UI filter; the API remains the authoritative enforcement point.
 */
export function isNavItemVisible(item: CompiledNavItem, schemas: SchemaSet, user: unknown): boolean {
  const findCollection = (slug: string) => schemas?.collections?.find((c) => c.slug === slug)
  const findGlobal = (slug: string) => schemas?.globals?.find((g) => g.slug === slug)

  if (!item.userDefined) {
    if (item.type === "collection") return canReadSchema(findCollection(item.slug), user)
    if (item.type === "global") return canReadSchema(findGlobal(item.slug), user)
    return true
  }

  const collections = new Set<string>()
  if (item.collection) collections.add(item.collection)
  for (const view of item.views ?? []) {
    if (view.collection) collections.add(view.collection)
  }
  const globals = item.global ? [item.global] : []

  if (collections.size === 0 && globals.length === 0) return false

  for (const slug of collections) {
    const schema = findCollection(slug)
    if (!schema || !canReadSchema(schema, user)) return false
  }
  for (const slug of globals) {
    const schema = findGlobal(slug)
    if (!schema || !canReadSchema(schema, user)) return false
  }
  return true
}
