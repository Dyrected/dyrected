export {
  type PinnedNavItemRef,
  type UserNavigationPreferences,
  CURRENT_NAV_PREFERENCES_VERSION,
  DEFAULT_USER_NAV_PREFERENCES,
} from "@dyrected/core";

export interface DyrectedPreferences {
  "admin:navigation": UserNavigationPreferences;
  "admin:theme": "light" | "dark" | "system";
  "admin:sidebar-width": number;
  [key: string]: unknown;
}
