/**
 * Replaces {fieldName} placeholders in a URL pattern with values from a document.
 * e.g. interpolateUrlPattern("/{slug}", { slug: "about" }) => "/about"
 * Missing fields are replaced with an empty string.
 */
export function interpolateUrlPattern(pattern: string, doc: Record<string, any>): string {
  return pattern.replace(/\{(\w+)\}/g, (_, key) => {
    const val = doc[key]
    return val != null ? String(val) : ""
  })
}
