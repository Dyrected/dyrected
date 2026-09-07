import type { icons as lucideIcons } from "lucide-react";

/** A valid icon component name from the Lucide icon set bundled with Dyrected Admin. */
export type AdminIconName = keyof typeof lucideIcons;

/** Ordered custom component keys rendered around the built-in Admin dashboard. */
export interface AdminDashboardComponentSlots {
  beforeDashboard?: string[];
  afterDashboard?: string[];
}

/** Ordered custom component keys rendered around an operational view's content. */
export interface CollectionViewComponentSlots {
  beforeViewHeader?: string[];
  afterViewHeader?: string[];
  beforeViewContent?: string[];
  afterViewContent?: string[];
}

/** Ordered custom component keys rendered around a collection's list content. */
export interface CollectionListComponentSlots {
  beforeList?: string[];
  beforeListTable?: string[];
  afterListTable?: string[];
  afterList?: string[];
  beforeViewHeader?: string[];
  afterViewHeader?: string[];
  beforeViewContent?: string[];
  afterViewContent?: string[];
  collectionView?: CollectionViewComponentSlots;
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
     * Brand colour used for committed, filled actions — Save, Create, Upload —
     * and active/selected states. Accepts a hex string, a named colour
     * (`amber`, `lime`, `violet`, `green`, `blue`, `red`, `purple`, `orange`),
     * or a raw HSL triplet (`"217 91% 60%"`). Applied in both light and dark mode.
     *
     * This is one half of the two-colour brand model. Use {@link accentColor}
     * for links and navigation accents. If you only set `primaryColor`, it is
     * reused for accents too, matching the single-brand-colour look.
     * @example '#6366f1'
     * @example 'blue'
     * @example 'hsl(240 50% 60%)'
     */
    primaryColor?: string;
    /**
     * Brand colour used for links, active navigation details, hover text, and
     * focus rings — the "accent" half of the two-colour brand model, mapped to
     * the admin's `--intelligence` token. Accepts the same formats as
     * {@link primaryColor} and applies in both light and dark mode.
     *
     * Set this when your brand has a distinct link/accent colour separate from
     * your primary action colour. When omitted, accents fall back to
     * `primaryColor` (if set) or the built-in default.
     * @example '#8b5cf6'
     * @example 'violet'
     */
    accentColor?: string;
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
