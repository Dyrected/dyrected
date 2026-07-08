import jexl from 'jexl'

/**
 * Resolves the previewUrl from a collection schema against a document entry.
 * Handles both function-based configurations and Jexl string evaluations.
 */
export function resolvePreviewUrl(
  previewUrlConfig: string | ((doc: any, opts: any) => string | null) | undefined,
  entry: any,
  siteUrl: string
): string | null {
  if (!previewUrlConfig) return null

  let previewUrl = typeof previewUrlConfig === 'function'
    ? previewUrlConfig(entry, { locale: 'en' })
    : previewUrlConfig

  if (typeof previewUrl === 'string' && previewUrl.includes('{{')) {
    previewUrl = previewUrl.replace(/{{(.*?)}}/g, (_, key) => String(entry?.[key.trim()] || ""))
  } else if (typeof previewUrl === 'string' && entry) {
    try {
      const context = { ...entry, siteUrl }
      if (previewUrl.includes('+') || previewUrl.includes('?') || previewUrl.includes('==') || previewUrl.includes('siteUrl')) {
        previewUrl = jexl.evalSync(previewUrl, context)
      }
    } catch (e) {
      console.error("[PreviewDebug] Jexl Evaluation Failed:", e)
    }
  }

  // If the resolved URL is relative, prepend the resolved site URL
  if (typeof previewUrl === 'string' && previewUrl.startsWith('/')) {
    previewUrl = `${siteUrl}${previewUrl}`
  }

  return typeof previewUrl === 'string' ? previewUrl : null
}
