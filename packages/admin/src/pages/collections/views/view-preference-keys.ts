/**
 * Standardized preference keys for operational views.
 *
 * v1 used `layout:collections:${slug}:list` for the (only) list view.
 * Operational views standardize on:
 *   default view → `layout:collections:${slug}:list`
 *   named view   → `layout:collections:${slug}:view:${viewSlug}`
 *
 * The `viewSlug` "list" and "default" both map to the default key so a
 * synthesized fallback view (slug "list") round-trips to the legacy key and
 * preserves saved column order on upgrade.
 */

export function getViewBaseKey(slug: string, viewSlug: string): string {
  if (viewSlug === "list" || viewSlug === "default") {
    return `layout:collections:${slug}:list`
  }
  return `layout:collections:${slug}:view:${viewSlug}`
}

export function getColumnPrefKey(slug: string, viewSlug: string, variant?: string): string {
  const base = getViewBaseKey(slug, viewSlug)
  return variant ? `${base}:${variant}` : base
}

export function getColumnSessionKey(slug: string, viewSlug: string, variant?: string): string {
  return `${getColumnPrefKey(slug, viewSlug, variant)}:session`
}

export function getViewModePrefKey(slug: string, viewSlug: string): string {
  return `${getViewBaseKey(slug, viewSlug)}:mode`
}

/**
 * Legacy keys to check for migration (read old, write new).
 */
export function getLegacyColumnPrefKey(slug: string, viewSlug: string, variant?: string): string {
  const keyScope = variant ? `${viewSlug}:${variant}` : viewSlug
  return `view-pref:${slug}:${keyScope}`
}

export function getLegacyColumnSessionKey(slug: string, viewSlug: string, variant?: string): string {
  const keyScope = variant ? `${viewSlug}:${variant}` : viewSlug
  return `view-columns:${slug}:${keyScope}`
}

export function getLegacyViewModePrefKey(slug: string, viewSlug: string): string {
  return `view-mode:${slug}:${viewSlug}`
}

export function getToolbarStateKey(slug: string, viewSlug: string, variant?: string): string {
  const base = getViewBaseKey(slug, viewSlug)
  return variant ? `${base}:toolbar:${variant}` : `${base}:toolbar`
}

export function getLegacyToolbarStateKey(slug: string, viewSlug: string, variant?: string): string {
  return variant ? `view-toolbar:${slug}:${viewSlug}:${variant}` : `view-toolbar:${slug}:${viewSlug}`
}
