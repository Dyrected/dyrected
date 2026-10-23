import { isUserAdmin } from "@dyrected/core"
import { useDyrected } from "../providers/dyrected-context"

export const DEFAULT_DOCS_URL = "https://docs.dyrected.com"

/**
 * Which developer-facing parts of the admin the host has left switched on, read from
 * `admin.features` and `admin.links`.
 *
 * - `systemInfo`: the version and update panel. On by default, and only ever shown to
 *   administrators.
 * - `setupPrompt`: the "Set up" screen that generates an AI prompt. On by default.
 * - `docsUrl`: where help links point, or `null` when the host set `links.docs` to `false`.
 * - `setupPageVisible`: whether the Setup page has anything to show, so the sidebar and
 *   dashboard know whether to link to it.
 */
export function useAdminFeatures() {
  const { schemas, user } = useDyrected()
  const admin = schemas?.admin

  const authCollection = schemas?.collections?.find((c) => c.slug === (user as { collection?: string } | null)?.collection)
  const isAdmin = !!user && isUserAdmin(user as never, authCollection as never)

  const setupPrompt = admin?.features?.setupPrompt !== false
  const systemInfo = admin?.features?.systemInfo !== false && isAdmin
  const docs = admin?.links?.docs
  const docsUrl = docs === false ? null : typeof docs === "string" && docs.trim() ? docs : DEFAULT_DOCS_URL

  return { setupPrompt, systemInfo, docsUrl, setupPageVisible: setupPrompt || systemInfo }
}
