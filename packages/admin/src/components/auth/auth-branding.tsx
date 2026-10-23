import { resolveAdminString, resolveAppName } from "@dyrected/core"
import type { AdminStringKey } from "@dyrected/core"
import { useDyrected } from "../../providers/dyrected-context"
import { getMediaUrl } from "../../lib/utils"

/**
 * Branding the sign-in screens need, read from the schemas (`/api/schemas` is
 * public, so this is available before anyone signs in).
 *
 * `ready` is false until the schemas have loaded. Screens use it to avoid
 * painting a brand that is about to change.
 */
export function useAuthBranding() {
  const { schemas, client } = useDyrected()
  const admin = schemas?.admin
  const branding = admin?.branding
  const baseUrl = client?.getBaseUrl?.() || ""
  const appName = resolveAppName(admin)

  return {
    ready: !!schemas,
    appName,
    logo: branding?.logo ? getMediaUrl(branding.logo, baseUrl) : undefined,
    logoDark: branding?.logoDark ? getMediaUrl(branding.logoDark, baseUrl) : undefined,
    logoMark: branding?.logoMark ? getMediaUrl(branding.logoMark, baseUrl) : undefined,
    logoText: branding?.logoText,
    logoAlt: branding?.logoAlt || appName,
    hidePoweredBy: branding?.hidePoweredBy === true,
    /** Copy for `key`, honouring `admin.strings` overrides and `{appName}`. */
    text: (key: AdminStringKey, fallback: string) => resolveAdminString(admin, key, fallback),
  }
}

/**
 * The logo, or app name, shown above the heading on every sign-in screen.
 *
 * Uses the same order as the sidebar: the full logo, then the logo mark, then the
 * logo text, then the app name. Renders nothing when no branding is configured, and
 * until the schemas load, so the screen never shows a placeholder brand.
 */
export function AuthBrandMark() {
  const { ready, appName, logo, logoDark, logoMark, logoText, logoAlt } = useAuthBranding()
  if (!ready) return null

  const light = logo ?? logoMark
  if (light) {
    return (
      <div className="dy-flex dy-justify-center" data-testid="auth-brand">
        <img
          src={light}
          alt={logoAlt}
          className={`dy-max-h-12 dy-w-auto dy-object-contain ${logoDark && logo ? "dark:dy-hidden" : ""}`}
        />
        {logoDark && logo && (
          <img src={logoDark} alt={logoAlt} className="dy-hidden dark:dy-block dy-max-h-12 dy-w-auto dy-object-contain" />
        )}
      </div>
    )
  }

  const text = logoText || appName
  if (!text) return null
  return (
    <div className="dy-flex dy-justify-center" data-testid="auth-brand">
      <span className="dy-font-serif dy-text-2xl dy-font-bold dy-tracking-tight dy-text-foreground">{text}</span>
    </div>
  )
}

/**
 * The small "Dyrected CMS" credit at the bottom of the sign-in screens.
 * Hidden when `admin.branding.hidePoweredBy` is true.
 */
export function AuthPoweredBy({ href, suffix }: { href?: string; suffix?: string }) {
  const { ready, hidePoweredBy } = useAuthBranding()
  if (!ready || hidePoweredBy) return null

  return (
    <p className="dy-text-center dy-text-[10px] dy-text-muted-foreground dy-uppercase dy-tracking-widest">
      {href ? (
        <a target="_blank" rel="noreferrer" href={href}>
          Dyrected CMS
        </a>
      ) : (
        "Dyrected CMS"
      )}
      {suffix ? ` | ${suffix}` : null}
    </p>
  )
}
