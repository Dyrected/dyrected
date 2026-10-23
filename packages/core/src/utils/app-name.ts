import type { AdminConfig, AdminStringKey } from "../types/admin.js";

type BrandingSource = Pick<AdminConfig, "branding" | "meta" | "strings"> | null | undefined;

/** Leading separators people put in a title suffix, such as `- `, `— ` or `| `. */
const SUFFIX_SEPARATOR = /^[\s\-\u2013\u2014|\u00b7:]+/;

/**
 * The name of the product as editors should see it.
 *
 * Resolution order: `branding.appName`, `branding.logoText`, then the name inside
 * `meta.titleSuffix` (without its leading `-` or `—`). Returns an empty string when
 * none is set. It never returns "Dyrected", so white-labelled products do not show
 * the underlying CMS name; callers decide what neutral wording to use instead.
 *
 * @example
 * resolveAppName({ meta: { titleSuffix: '— Acme Admin' } }) // 'Acme Admin'
 */
export function resolveAppName(admin: BrandingSource): string {
  const candidates = [
    admin?.branding?.appName,
    admin?.branding?.logoText,
    admin?.meta?.titleSuffix?.replace(SUFFIX_SEPARATOR, ""),
  ];
  for (const candidate of candidates) {
    const value = typeof candidate === "string" ? candidate.trim() : "";
    if (value) return value;
  }
  return "";
}

/**
 * The text appended to every admin page `<title>`: `meta.titleSuffix` when set,
 * otherwise `- <app name>`, otherwise an empty string.
 */
export function resolveTitleSuffix(admin: BrandingSource): string {
  const explicit = admin?.meta?.titleSuffix;
  if (typeof explicit === "string") return explicit.trim();
  const name = resolveAppName(admin);
  return name ? `- ${name}` : "";
}

/**
 * Looks up an overridable admin string, replacing `{appName}` with the resolved app name.
 * Returns `fallback` when the host did not override the key.
 */
export function resolveAdminString(admin: BrandingSource, key: AdminStringKey, fallback: string): string {
  const override = admin?.strings?.[key];
  const text = typeof override === "string" && override.trim() ? override : fallback;
  return text.replace(/\{appName\}/g, resolveAppName(admin));
}
