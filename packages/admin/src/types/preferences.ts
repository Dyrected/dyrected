import type { DefineNavItemOptions, NavGroup } from "@dyrected/core";

export interface PinnedNavItemRef {
  type: "workspace" | "collection" | "global" | "link" | "dashboard";
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
  items?: DefineNavItemOptions[]; // User-created nav items / operational workspaces
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

export interface DyrectedPreferences {
  "admin:navigation": UserNavigationPreferences;
  "admin:theme": "light" | "dark" | "system";
  "admin:sidebar-width": number;
  [key: string]: unknown;
}
