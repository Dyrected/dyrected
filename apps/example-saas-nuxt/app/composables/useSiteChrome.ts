import { computed } from 'vue'

/** A resolved link: an href plus whether it points off-site. */
export interface ResolvedLink {
  href: string
  external: boolean
}

/**
 * A `url` field resolves to `{ type, url, label? }` (or a plain string).
 * Normalize it to an href + whether it points off-site. Shared by the navbar
 * and footer so link handling stays consistent.
 */
export function resolveLink(url: unknown): ResolvedLink {
  if (!url) return { href: '#', external: false }
  if (typeof url === 'string') return { href: url, external: /^https?:\/\//.test(url) }
  const obj = url as { url?: string; type?: string }
  const href = obj.url || '#'
  return { href, external: obj.type === 'custom' || /^https?:\/\//.test(href) }
}

/**
 * Site branding (logo, name, initials) from the `settings` global, shared by
 * the navbar and footer. `depth: 1` resolves the `logo` relationship to a
 * media object with a `.url`. Default content lives on the global's
 * `initialData` in dyrected.config.ts (auto-seeded on first read), so this
 * composable stays content-free and only derives the view model.
 */
export function useBranding() {
  const { data } = useDyrectedGlobal('settings', { depth: 1 })

  return computed(() => {
    const settings = data.value || {}
    const siteName = settings.siteName || ''
    // Preserve the two-tone brand ("SnackTrack Pro" → accent on the last word).
    // Single-word names render entirely as the lead.
    const words = siteName.trim().split(/\s+/).filter(Boolean)
    const nameAccent = words.length > 1 ? words.pop()! : ''
    const nameLead = words.join(' ')
    return {
      siteName,
      nameLead,
      nameAccent,
      tagline: settings.tagline || '',
      logo: settings.logo || null,
      initials: settings.logoInitials || '',
    }
  })
}
