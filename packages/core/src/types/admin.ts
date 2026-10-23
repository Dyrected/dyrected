import type { icons as lucideIcons } from "lucide-react";
import type { DefineWorkspaceOptions } from "./navigation.js";
import type { PageConfig } from "./pages.js";

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

/**
 * How much of the default edit screen's chrome surrounds a custom form.
 *
 * - `full` (default): header, status badge, default save bar, and the unsaved-changes guard.
 * - `header`: header and the unsaved-changes guard. The form supplies its own actions.
 * - `none`: nothing. The form owns the whole screen.
 */
export type FormShell = "full" | "header" | "none";

/** The values `formShell` accepts. */
export const FORM_SHELLS: readonly FormShell[] = ["full", "header", "none"];

/**
 * Registry keys of custom components that replace the body of a create or edit screen.
 * Each key is resolved against `components.forms` in the host's admin registration.
 */
export interface DocumentFormComponentSlots {
  /** Used when creating a record. Falls back to `form`, then the built-in form. */
  createForm?: string;
  /** Used when editing a record. Falls back to `form`, then the built-in form. */
  editForm?: string;
  /** Fallback for both create and edit. */
  form?: string;
  /** How much default chrome surrounds the custom form. Defaults to `full`. */
  formShell?: FormShell;
}

/** Component keys a global can replace. A global is always edited, never created. */
export type GlobalFormComponentSlots = Pick<DocumentFormComponentSlots, "editForm" | "form" | "formShell">;

/** Ordered custom component keys rendered around a collection's list content. */
export interface CollectionListComponentSlots extends DocumentFormComponentSlots {
  /**
   * Set to `false` to keep the built-in form when this collection is created or edited
   * in a drawer (inline relationship creation), even if `createForm` is set.
   */
  formInDrawer?: boolean;
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
 * Keys of the admin copy that can be overridden with `admin.strings`.
 *
 * - `auth.signIn.title` / `auth.signIn.subtitle`: heading and subtitle on the sign-in screen.
 * - `auth.firstUser.title` / `auth.firstUser.subtitle`: heading and subtitle when creating the first account.
 * - `auth.activate.subtitle`: sentence shown above the password field when activating an account.
 * - `media.storageMissing`: message shown when file uploads are not configured.
 */
export type AdminStringKey =
  | "auth.signIn.title"
  | "auth.signIn.subtitle"
  | "auth.firstUser.title"
  | "auth.firstUser.subtitle"
  | "auth.activate.subtitle"
  | "media.storageMissing";

/** Map of overridable admin copy. See {@link AdminStringKey}. */
export type AdminStrings = Partial<Record<AdminStringKey, string>>;

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
  /**
   * Custom navigation layout for the admin sidebar.
   * If omitted, all collections and globals appear in default sections.
   */
  navigation?: DefineWorkspaceOptions[];
  /** Optional custom landing page slug replacing the dashboard as the root view. */
  homePage?: string;
  /** Custom component slots around the built-in dashboard. */
  components?: AdminDashboardComponentSlots;
  branding?: {
    /**
     * The name editors know your product by, for example `"Acme Studio"`.
     *
     * This is the one place to set it. It is used in the browser tab title, the
     * sign-in screens, the sidebar (when no logo is set), transactional emails,
     * the API documentation page and the AI assistant. When omitted, Dyrected
     * falls back to {@link logoText}, then to the name in `meta.titleSuffix`, and
     * finally shows no product name at all. It never falls back to "Dyrected".
     * @example 'Acme Studio'
     */
    appName?: string;
    /** Full logo image shown in the expanded sidebar. URL or imported image asset. */
    logo?: string;
    /**
     * Logo variant for dark mode, used wherever {@link logo} is shown (sidebar and
     * sign-in screens). When omitted, {@link logo} is used in both themes.
     */
    logoDark?: string;
    /**
     * Accessible description of the logo image (its `alt` text). Defaults to the
     * resolved app name.
     */
    logoAlt?: string;
    /**
     * Hide the "Dyrected CMS" credit shown at the bottom of the sign-in and
     * first-user screens.
     * @default false
     */
    hidePoweredBy?: boolean;
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
     * String appended to every Admin page's `<title>`, for example `'- Acme Studio'`.
     *
     * When omitted it is derived from `branding.appName` (as `- <appName>`), so most
     * projects only need to set the app name. If no name is configured anywhere the
     * title has no suffix.
     */
    titleSuffix?: string;
  };
  /**
   * Switches for parts of the admin that are aimed at developers rather than editors.
   * Turn them off when you ship the admin to clients under your own brand.
   */
  features?: {
    /**
     * Show the "System Info & Updates" panel (version, update notices, upgrade command).
     * The panel is only ever shown to administrators.
     * @default true
     */
    systemInfo?: boolean;
    /**
     * Show the "Set up" screen that generates an AI prompt for wiring a website to this CMS.
     * @default true
     */
    setupPrompt?: boolean;
  };
  /**
   * Where help links in the admin point.
   */
  links?: {
    /**
     * Documentation URL used by "Help" and "Docs" links. Set to `false` to hide them.
     * @default 'https://docs.dyrected.com'
     */
    docs?: string | false;
  };
  /**
   * Overrides for the user-facing wording of the admin. Every key is optional; missing
   * keys use the built-in text. `{appName}` in a value is replaced with the resolved app name.
   *
   * @example
   * strings: {
   *   'auth.signIn.title': 'Welcome to {appName}',
   *   'auth.signIn.subtitle': 'Sign in to manage your content.',
   * }
   */
  strings?: AdminStrings;
  /**
   * The canonical/base URL of the frontend website for links and iframe live previews.
   */
  siteUrl?: string;
  /**
   * Public URL of the Admin UI, used for links in invite and password-reset emails.
   * Falls back to the `DYRECTED_ADMIN_URL` env var, then the page the admin is running on,
   * then `/admin` (resolved against the request origin).
   */
  adminUrl?: string;
}
