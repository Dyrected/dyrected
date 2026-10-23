import { resolveAppName } from "@dyrected/core"
import type { AdminConfig } from "@dyrected/core"

export interface SidebarBrand {
  /** The product name, or an empty string when none is configured. */
  appName: string
  /** Text wordmark: the logo text, or the app name when no logo image is configured. */
  brandText: string
  /** Alt text for logo images. */
  logoAlt: string
}

/**
 * What the sidebar header should show for the host's branding. Text takes the place of
 * the logo only when there is no logo image, so a configured logo is never replaced.
 */
export function resolveSidebarBrand(admin: AdminConfig | null | undefined): SidebarBrand {
  const branding = admin?.branding
  const appName = resolveAppName(admin)
  const hasImage = !!(branding?.logo || branding?.logoMark)
  return {
    appName,
    brandText: branding?.logoText || (!hasImage ? appName : ""),
    logoAlt: branding?.logoAlt || appName,
  }
}
