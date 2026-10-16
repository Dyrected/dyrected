import type { AccessRule } from "./access.js";
import type { AdminIconName } from "./admin.js";
import type { DefineWorkspaceOptions, NavBadgeConfig, NavGroup } from "./navigation.js";

export interface PageAction {
  label: string;
  icon?: AdminIconName | string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
}

export interface PageBreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageConfig {
  /** URL slug → /pages/:slug. Lowercase kebab, unique. Optional if defined on workspace. */
  slug?: string;
  /** Label shown in the navigation sidebar and default title. Optional if defined on workspace. */
  label?: string;
  /** Lucide icon name for navigation. Optional if defined on workspace. */
  icon?: AdminIconName | string;
  /** Key in AdminComponents.pages. */
  component: string;
  /** Sidebar group. Same semantics as workspace groups. Omitted → ungrouped. */
  group?: string | NavGroup;
  /** Relative position: insert immediately after this collection or nav item slug. */
  after?: string;
  /** Relative position: insert immediately before this collection or nav item slug. */
  before?: string;
  /** Numeric sort weight within its group (lower numbers first, default 100). */
  order?: number;
  /** Fast shortcut to pin item to start or end of its group: 'first' | 'last'. */
  position?: "first" | "last";
  /** Live badge in navigation. Reuses NavBadgeConfig. */
  badge?: NavBadgeConfig | string;
  /**
   * Declarative UI gating rule controlling navigation visibility and route access.
   *
   * IMPORTANT: This is a best-effort client-side UI gate. Pages calling the SDK
   * or host API must rely on server-side access control for true security.
   */
  access?: string[] | AccessRule | { read?: AccessRule<any> };
  /**
   * Layout presentation style.
   * - 'contained' (default): padded, centered with responsive max-width.
   * - 'full': edge-to-edge layout without horizontal padding.
   */
  layout?: "contained" | "full";
  /**
   * Whether to display the admin host header/chrome.
   * Set to `false` for full custom kiosk interfaces or custom headers.
   * @default true
   */
  chrome?: boolean;
  /** Serializable options readable via usePageMeta / props. */
  options?: Record<string, unknown>;
}

export type DefinePageInput = PageConfig & {
  slug: string;
  label: string;
  component: string;
};

/**
 * Type-safe helper to define a custom admin page in navigation.
 * Returns a navigation workspace item configured for the page.
 */
export function definePage<const T extends DefinePageInput>(config: T): DefineWorkspaceOptions {
  return {
    slug: config.slug,
    label: config.label,
    icon: config.icon,
    group: config.group,
    order: config.order,
    after: config.after,
    before: config.before,
    position: config.position,
    badge: config.badge,
    access: (config.access && typeof config.access === "object" && "read" in config.access ? config.access.read : config.access) as any,
    page: config,
  };
}

