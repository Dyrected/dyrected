import type { AccessRule } from "./access.js";
import type { AdminIconName } from "./admin.js";
import type { ViewConfig } from "./views.js";
import type { PageConfig } from "./pages.js";

/**
 * Definition of a navigation group in the Dyrected admin sidebar.
 */
export interface NavGroup {
  /** Display title for the group in the sidebar. */
  name: string;
  /** Optional stable identifier/slug for the group. */
  slug?: string;
  /** Lucide icon name for the group accordion header. */
  icon?: AdminIconName | string;
  /** Whether the group is expanded by default in the sidebar. */
  defaultExpanded?: boolean;
  /** Sort order weight for the group section in the sidebar (lower numbers appear first). */
  order?: number;
}

/**
 * Configuration for real-time count badges on navigation items.
 */
export interface NavBadgeConfig {
  /** If true, automatically calculates a count based on the primary view's filter. */
  count?: boolean;
  /** Static text override for the badge (e.g. "Live", "New", "Urgent"). */
  text?: string;
  /** Custom aggregate filter evaluated on the database. */
  aggregate?: {
    collection: string;
    where?: Record<string, unknown>;
  };
  /** Visual badge color variant. */
  variant?: "default" | "warning" | "destructive" | "info" | "success";
}

/**
 * Options for defining an operational workspace, or customizing placement of collections/globals, with `defineWorkspace`.
 */
export interface DefineWorkspaceOptions {
  /** If provided, injects views into an existing collection submenu. If omitted, item stands alone. */
  addToCollection?: string;

  /** References an existing collection to position it in navigation. */
  collection?: string;

  /** References an existing global to position it in navigation. */
  global?: string;

  /** Designates this item as the dashboard link. */
  dashboard?: boolean;

  /** Designates this item as the trash link. */
  trash?: boolean;

  /** Stable URL slug for standalone operational workspaces (`/:slug`). */
  slug?: string;

  /** Display label in the sidebar (defaults to collection/global label when applicable). */
  label?: string;

  /** Lucide icon name (e.g. "ShieldAlert", "Users", "Briefcase"). */
  icon?: AdminIconName | string;

  /** Section group name (string) or group object with icon and default expanded state. */
  group?: string | NavGroup;

  /** Relative position: insert immediately after this collection or nav item slug. */
  after?: string;

  /** Relative position: insert immediately before this collection or nav item slug. */
  before?: string;

  /** Numeric sort weight within its group (lower numbers first, default 100). */
  order?: number;

  /** Fast shortcut to pin item to start or end of its group: 'first' | 'last'. */
  position?: "first" | "last";

  /** Real-time counter badge (auto-computed from primary view or custom aggregate). */
  badge?: NavBadgeConfig | string;

  /** Role-based access rules controlling who can see this navigation item. */
  access?: string[] | AccessRule;

  /** Custom internal route or external URL. */
  href?: string;

  /** References or defines a custom admin page. Can be a PageConfig or component key. */
  page?: PageConfig | string;

  /** Views belonging to this item. The first view is automatically the default. */
  views?: ViewConfig[];
}

/**
 * Helper to define an operational workspace or customize placement of collections/globals/pages.
 *
 * @example
 * ```ts
 * export const kycQueue = defineWorkspace({
 *   slug: "kyc-review",
 *   label: "KYC Review",
 *   icon: "ShieldAlert",
 *   group: "Compliance",
 *   views: [
 *     defineView({ collection: "investors", slug: "pending", label: "Pending" }),
 *   ],
 * });
 * ```
 */
export function defineWorkspace(options: DefineWorkspaceOptions): DefineWorkspaceOptions {
  return options;
}

/**
 * Runtime compiled representation of a single navigation item.
 */
export interface CompiledNavItem {
  id: string;
  type: "workspace" | "collection" | "global" | "dashboard" | "trash" | "link" | "page";
  slug: string;
  label: string;
  icon?: string;
  group?: string;
  href?: string;
  badge?: NavBadgeConfig | string;
  access?: string[] | AccessRule;
  order: number;
  collection?: string;
  global?: string;
  page?: PageConfig;
  views: ViewConfig[];
  /**
   * Set by `reconcileNavigation` on items that came from a user's navigation
   * preferences and do not exist in the server-built tree. They carry no `access`
   * rule of their own, so consumers must check the user can read the collection
   * or global they point at before showing them.
   */
  userDefined?: boolean;
}

/**
 * Runtime compiled representation of a navigation group containing items.
 */
export interface CompiledNavGroup {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  defaultExpanded?: boolean;
  order: number;
  items: CompiledNavItem[];
}

/**
 * Complete runtime compiled navigation tree.
 */
export interface CompiledNavTree {
  groups: CompiledNavGroup[];
  ungrouped: CompiledNavItem[];
  /**
   * True when an administrator has enforced a menu for the user's role. A locked
   * tree is the complete menu: clients must not add items from personal
   * preferences (`reconcileNavigation` with `allowUserItems: false`).
   */
  locked?: boolean;
}

export interface PinnedNavItemRef {
  type: "workspace" | "collection" | "global" | "trash" | "link" | "dashboard" | "page";
  slug: string;
  view?: string;
  label?: string;
  icon?: string;
}

export interface UserNavigationPreferences {
  _version: number;
  pinned?: PinnedNavItemRef[];
  hidden?: string[]; // Slugs or IDs of hidden groups, nav items, or views
  groupOrder?: string[]; // Custom ordering of group slugs / names
  itemOrder?: Record<string, string[]>; // groupSlug -> array of nav item slugs/IDs
  groups?: NavGroup[]; // User-created groups
  items?: DefineWorkspaceOptions[]; // User-created nav items / operational workspaces
}

/** Preference key under which an administrator's enforced menu for a role is stored (role scope). */
export const NAVIGATION_POLICY_KEY = "admin:navigation-policy";

/**
 * A menu an administrator has designed for a role.
 *
 * When `enforced` is true, users whose roles are all covered by an enforced
 * policy see only the items listed in `allowed` (that they also pass `access`
 * for), arranged by `layout`. Personal preferences cannot add anything back.
 */
export interface NavigationRolePolicy {
  _version: number;
  /** When false the policy is stored but ignored. */
  enforced: boolean;
  /** Ids or slugs of the navigation items this role may see. */
  allowed: string[];
  /** Order, groups and renames applied to the allowed items. */
  layout?: Pick<UserNavigationPreferences, "_version" | "hidden" | "groupOrder" | "itemOrder" | "groups" | "items">;
}

export const CURRENT_NAV_PREFERENCES_VERSION = 1;

export const DEFAULT_USER_NAV_PREFERENCES: UserNavigationPreferences = {
  _version: CURRENT_NAV_PREFERENCES_VERSION,
  pinned: [],
  hidden: [],
  groupOrder: [],
  itemOrder: {},
  groups: [],
  items: [],
};
