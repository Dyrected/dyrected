import type { icons as lucideIcons } from "lucide-react";

/** A valid icon component name from the Lucide icon set bundled with Dyrected Admin. */
export type AdminIconName = keyof typeof lucideIcons;

/** Ordered custom component keys rendered around the built-in Admin dashboard. */
export interface AdminDashboardComponentSlots {
  beforeDashboard?: string[];
  afterDashboard?: string[];
}

/** Ordered custom component keys rendered around a collection's list content. */
export interface CollectionListComponentSlots {
  beforeList?: string[];
  beforeListTable?: string[];
  afterListTable?: string[];
  afterList?: string[];
}

/**
 * Branding and metadata options for the Dyrected Admin UI.
 *
 * @example
 * admin: {
 *   branding: {
 *     logo: '/logo.svg',
 *     primaryColor: '#6366f1',
 *   },
 *   meta: {
 *     titleSuffix: '- My App',
 *   },
 * }
 */
export interface AdminConfig {
  /** Custom component slots around the built-in dashboard. */
  components?: AdminDashboardComponentSlots;
  branding?: {
    /** Full logo image shown in the expanded sidebar. URL or imported image asset. */
    logo?: string;
    /** Compact logo mark used in the collapsed sidebar state. */
    logoMark?: string;
    /** Text alternative or addition to the logo image. */
    logoText?: string;
    /**
     * Primary accent colour as any CSS colour value.
     * @example '#6366f1'
     * @example 'hsl(240 50% 60%)'
     */
    primaryColor?: string;
    /** Browser tab favicon URL. */
    favicon?: string;
    /** Font family for body and UI text. Must be loaded separately. */
    fontSans?: string;
    /** Font family for headings. Must be loaded separately. */
    fontSerif?: string;
  };
  meta?: {
    /**
     * String appended to every Admin page's `<title>`.
     * @default '- Dyrected'
     */
    titleSuffix?: string;
  };
  /**
   * The canonical/base URL of the frontend website for links and iframe live previews.
   */
  siteUrl?: string;
}
