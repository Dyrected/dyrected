/** @jsxImportSource react */
import "./index.css";
import React, { useEffect, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DyrectedProvider, type DyrectedProviderProps } from "./providers/dyrected-provider";
import { useDyrected } from "./providers/dyrected-context";
import { QueryProvider } from "./providers/query-provider";
import { AdminShell } from "./components/layout/admin-shell";
import { Dashboard } from "./pages/dashboard/dashboard";
import { OperationalViewRoute } from "./pages/collections/operational-view-route";
import { OperationalViewPage } from "./pages/collections/views/operational-view-page";
import { mergeFilters } from "./pages/collections/views/resolve-view-filter";
import { EditEntryPage } from "./pages/collections/edit-page";
import { DetailEntryPage } from "./pages/collections/detail-page";
import { MediaPage } from "./pages/media/media-page";
import { GlobalDetailPage } from "./pages/globals/detail-page";
import { GlobalEditorPage } from "./pages/globals/editor-page";
import { SetupPromptUI } from "./pages/setup/setup-prompt";
import { ErrorBoundary } from "./components/error-boundary";
import { DocumentMeta } from "./components/document-meta";
import { AuthGate } from "./components/auth/auth-gate";
import { AdminSplash } from "./components/layout/admin-splash";
import { AdminNotFound, AdminNotFoundSkeleton } from "./components/layout/admin-not-found";
import { Toaster } from "./components/ui/sonner";
import { AdminThemeProvider, AdminThemedRoot } from "./hooks/admin-theme-provider";
import type { AdminThemePreference, ResolvedAdminTheme } from "./hooks/admin-theme";
import { cn } from "./lib/utils";
import { createAdminThemeController, type AdminThemeController } from "./controllers/theme";

export type {
  AdminComponents,
  AdminFieldComponentContext,
  AdminFieldComponentProps,
  AdminSchemas,
  CollectionListSlotProps,
  DashboardSlotProps,
} from "./types/admin-components";
export {
  createDyrectedFieldController,
} from "./controllers/field";
export {
  createDyrectedFormController,
  getFieldPathSegments,
  getParentFieldPath,
  getValueAtPath,
  joinFieldPath,
  normalizeFieldPath,
  setValueAtPath,
} from "./controllers/form";
export {
  createAdminThemeController,
} from "./controllers/theme";
export {
  createMediaLibraryController,
  createMediaUploadController,
  createMediaURLController,
} from "./controllers/media";
export type {
  DyrectedFieldController,
} from "./controllers/field";
export type {
  DyrectedFieldState,
  DyrectedFormController,
  DyrectedFormControllerAdapters,
  DyrectedFormControllerOptions,
  DyrectedFieldPathPart,
  DyrectedFormState,
  DyrectedFormValues,
  DyrectedSetValueOptions,
} from "./controllers/form";
export type {
  AdminThemeController,
  AdminThemeControllerOptions,
  AdminThemeControllerState,
} from "./controllers/theme";
export type {
  MediaLibraryController,
  MediaLibraryControllerOptions,
  MediaLibraryControllerState,
  MediaRecord,
  MediaUploadController,
  MediaUploadControllerOptions,
  MediaUploadControllerState,
  MediaUploadQueueItem,
  MediaURLClassification,
  MediaURLController,
  MediaURLControllerOptions,
  MediaURLControllerState,
} from "./controllers/media";
export { compressImage } from "./lib/compress-image";
export {
  getMediaSourceInfo,
  isExternalMedia,
  resolveActiveMediaCollection,
} from "./lib/media-utils";
export {
  DyrectedMedia,
  isMediaValue,
  resolveMediaKind,
  type DyrectedMediaProps,
  type MediaKind,
} from "./components/media/dyrected-media";
export {
  buildDefaultValues,
  buildSchemaShape,
  formatPath,
  getFlatErrors,
  resolveContainerPath,
} from "./components/forms/utils";
export {
  DyrectedFieldPathProvider,
  DyrectedFormProvider,
} from "./providers/dyrected-form-context";
export {
  AdminThemeProvider,
  AdminThemedRoot,
} from "./hooks/admin-theme-provider";
export {
  adminThemeClassName,
  getSystemAdminTheme,
  resolveAdminTheme,
} from "./hooks/admin-theme";
export type {
  AdminThemePreference,
  ResolvedAdminTheme,
} from "./hooks/admin-theme";
export { useAdminTheme } from "./hooks/use-admin-theme";
export { useDyrectedForm } from "./hooks/use-dyrected-form";
export { useField } from "./hooks/use-field";
export { useMediaLibrary } from "./hooks/use-media-library";
export { useMediaUpload } from "./hooks/use-media-upload";
export { useMediaURL } from "./hooks/use-media-url";
export { useAddMediaFromUrl } from "./hooks/use-add-media-from-url";

// ─── Route that resolves collection → list or media page ─────────────────────
// Legacy `list-view-v1` is deprecated — operational views (table layout) are now
// the canonical list view. `resolveSchemas` ensures every collection has at
// least a synthesized `list` view, so this route can render directly without
// redirecting to `/views/:viewSlug`.

function CollectionRoute() {
  const { slug } = useParams();
  const { client, schemas: contextSchemas } = useDyrected();

  const { data: fetchedSchemas, isLoading } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client?.getSchemas() || Promise.resolve({ collections: [], globals: [] }),
    enabled: !!client && !contextSchemas,
  });

  const schemas = contextSchemas ?? fetchedSchemas;

  if (isLoading || !schemas) {
    return <AdminNotFoundSkeleton />;
  }

  const schema = (schemas as any)?.collections.find((c: any) => c.slug === slug);

  if (!schema || schema?.admin?.hidden) {
    return (
      <AdminNotFound
        title="Collection not found"
        description={`We could not find a visible collection called "${slug}". It may have been renamed, hidden, or removed from this admin.`}
      />
    );
  }

  if ((schema as any)?.upload) {
    return <MediaPage collectionSlug={slug!} schema={schema} />;
  }

  // Operational views are specialized sub-views at `/collections/:slug/views/:viewSlug`.
  // When a user navigates to `/collections/:slug`, if a default view is configured
  // (via schema.defaultView, schema.admin.defaultView, or view.default: true),
  // redirect directly to the default view's canonical URL.
  // Otherwise, serve the unfiltered master all-records table view.
  const customViews = (schema as any).views ?? [];
  const configuredDefaultSlug = (schema as any).admin?.defaultView ?? (schema as any).defaultView;
  const configuredDefaultView =
    (configuredDefaultSlug ? customViews.find((v: any) => v.slug === configuredDefaultSlug) : undefined) ??
    customViews.find((v: any) => v.default === true);

  if (configuredDefaultView) {
    return <Navigate to={`/collections/${slug}/views/${configuredDefaultView.slug}`} replace />;
  }

  const defaultMasterView = {
    slug: "default",
    label: (schema as any).labels?.plural ?? slug,
    layout: "table" as const,
    filter: undefined,
    columns: undefined,
    sort: undefined,
    metrics: undefined,
    actions: [],
  };

  const rawView = defaultMasterView;

  // URL compat shim for legacy v1 links (`?where=<json>&search=<term>`)
  let effectiveView: typeof rawView = rawView;
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.hash.split("?")[1] ?? window.location.search);
      const whereParam = params.get("where");
      const searchParam = params.get("search");
      let mergedFilter: Record<string, any> | string | undefined = rawView.filter;

      if (whereParam) {
        try {
          const legacyWhere = JSON.parse(whereParam);
          if (legacyWhere && typeof legacyWhere === "object" && Object.keys(legacyWhere).length) {
            const base = (typeof mergedFilter === "string" ? undefined : (mergedFilter as Record<string, any> | undefined));
            mergedFilter = mergeFilters(base, legacyWhere as Record<string, any>);
          }
        } catch {
          // ignore invalid legacy where param
        }
      }

      if (searchParam?.trim()) {
        // Legacy v1 `search` was a free-text term applied server-side. Map it
        // to a `contains` filter on the first searchable text field so old
        // shared links still return relevant results.
        const searchableField = (schema as any)?.admin?.searchableFields?.[0]
          ?? (schema as any)?.fields?.find((f: any) => f.type === "text" || f.type === "email")?.name;
        if (searchableField) {
          const searchWhere = { [searchableField]: { contains: searchParam.trim() } };
          const base = (typeof mergedFilter === "string" ? undefined : (mergedFilter as Record<string, any> | undefined));
          mergedFilter = mergeFilters(base, searchWhere);
        }
      }

      if (mergedFilter !== rawView.filter) {
        effectiveView = { ...rawView, filter: mergedFilter };
        if (whereParam || searchParam) {
          console.warn("[dyrected/admin] Legacy `?where` / `?search` URL params are deprecated — filters are now managed inside the operational view toolbar.");
        }
      }
    } catch {
      // URL parsing is best-effort
    }
  }

  return (
    <OperationalViewPage
      key={`${slug}:${effectiveView.slug}`}
      slug={slug!}
      schema={schema}
      view={effectiveView}
      schemas={schemas}
    />
  );
}

// ─── Setup page — reads config from context ───────────────────────────────────

function SetupPage() {
  const { config } = useDyrected();
  return <SetupPromptUI config={config} />;
}

// ─── Navigation sync — notifies host on every internal route change ───────────

interface NavigationSyncProps {
  onNavigate?: (path: string) => void;
}

function NavigationSync({ onNavigate }: NavigationSyncProps) {
  const location = useLocation();

  useEffect(() => {
    onNavigate?.(location.pathname + location.search);
  }, [location, onNavigate]);

  return null;
}

function LegacyCollectionEditRedirect() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  return <Navigate to={`/collections/${slug}/${id}/edit`} replace />;
}

// ─── Route tree (shared between embedded and standalone) ──────────────────────

function AdminRoutes({ onNavigate, isEmbedded = false }: { onNavigate?: (path: string) => void, isEmbedded?: boolean }) {
  return (
    <AuthGate>
      <AdminShell isEmbedded={isEmbedded}>
        <NavigationSync onNavigate={onNavigate} />
        <DocumentMeta />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/collections/:slug" element={<CollectionRoute />} />
            <Route path="/collections/:slug/views/:viewSlug" element={<OperationalViewRoute />} />
            <Route path="/collections/:slug/:id" element={<DetailEntryPage />} />
            <Route path="/collections/:slug/new" element={<EditEntryPage />} />
            <Route path="/collections/:slug/edit/:id" element={<LegacyCollectionEditRedirect />} />
            <Route path="/collections/:slug/:id/edit" element={<EditEntryPage />} />
            <Route path="/globals/:slug" element={<GlobalDetailPage />} />
            <Route path="/globals/:slug/edit" element={<GlobalEditorPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="*" element={<AdminNotFound />} />
          </Routes>
        </ErrorBoundary>
      </AdminShell>
    </AuthGate>
  );
}

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * Props for the `<AdminUI />` embedded component.
 *
 * Use this when mounting the admin inside an existing React app or a
 * framework-specific wrapper (Next.js, Nuxt, Astro, etc.).
 */
export interface AdminUIProps {
  /** API key used to authenticate requests to the Dyrected backend. */
  apiKey?: string;
  /**
   * Base URL of the Dyrected backend API (e.g. `"https://example.com/dyrected"`).
   * Defaults to `"/dyrected"` (same-origin).
   */
  baseUrl?: string;
  /** Site ID for multi-tenant deployments. Omit for single-site setups. */
  siteId?: string;
  /**
   * Called whenever the internal admin route changes.
   * Use this to sync the host router (e.g. Next.js router.push / Nuxt navigateTo)
   * so browser history works correctly when embedded.
   *
   * Example (Nuxt):
   *   <AdminUI onNavigate={(path) => navigateTo('/admin' + path)} ... />
   */
  onNavigate?: (path: string) => void;
  /**
   * Set to `true` when the admin is rendered inside a host app shell
   * (e.g. inside a dashboard layout). Adjusts internal spacing and
   * removes the standalone top-bar.
   */
  isEmbedded?: boolean;
  /** Custom component overrides for fields, dashboard slots, and collection list views. */
  components?: DyrectedProviderProps['components'];
  // @internal – not for public docs. Used by Dyrected Cloud to bypass admin-level
  // auth when the user is already authenticated at the cloud level. The token is
  // minted server-side by the cloud backend and is short-lived (1h).
  initialToken?: string;
  defaultTechStack?: string;
  /** Optional externally controlled admin theme controller. */
  themeController?: AdminThemeController;
  /** Optional controlled admin theme preference. */
  theme?: AdminThemePreference;
  /** Optional resolved host system theme when `theme="system"`. */
  systemTheme?: ResolvedAdminTheme;
  /** Called when the admin theme preference changes. */
  onThemeChange?: (theme: AdminThemePreference) => void;
}

// ─── Embedded component (HashRouter — no host-router conflicts) ──────────────

/**
 * The main admin UI component. Mount this inside your React app.
 *
 * Uses a `HashRouter` internally so it can be embedded without conflicting
 * with the host app's router. If you need real URL history, use
 * `renderAdminUI` with a custom router wrapper instead.
 *
 * @example
 * ```tsx
 * <AdminUI baseUrl="/dyrected" apiKey="my-key" isEmbedded />
 * ```
 */
export function AdminUI({
  apiKey,
  baseUrl = "/dyrected",
  siteId,
  onNavigate,
  isEmbedded,
  components,
  initialToken,
  defaultTechStack,
  themeController,
  theme,
  systemTheme,
  onThemeChange,
}: AdminUIProps) {
  const [mounted, setMounted] = useState(false);
  const isThemeControlled =
    theme !== undefined || systemTheme !== undefined || onThemeChange !== undefined;
  const activeThemeController = React.useMemo(() => {
    if (themeController || !isThemeControlled) return themeController
    return createAdminThemeController({
      theme,
      systemTheme,
      onThemeChange,
    })
  }, [isThemeControlled, onThemeChange, systemTheme, theme, themeController])

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted) {
    // Theme context isn't available pre-mount, so best-effort match the system
    // scheme to avoid a light flash for dark-mode users. Wrapping in
    // `.dy-admin-ui` gives the splash its themed tokens (same visual as the
    // auth-loading splash → one continuous screen, not a sequence of flashes).
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return (
      <div className={cn("dy-admin-ui dy-h-full", prefersDark && "dark")}>
        <AdminSplash />
      </div>
    );
  }

  return (
    <div className="dy-admin-ui dy-h-full">
      <ErrorBoundary>
        <QueryProvider>
          <DyrectedProvider apiKey={apiKey} baseUrl={baseUrl} siteId={siteId} components={components} initialToken={initialToken} defaultTechStack={defaultTechStack}>
            <AdminThemeProvider controller={activeThemeController}>
              <AdminThemedRoot>
                <HashRouter>
                  <AdminRoutes onNavigate={onNavigate} isEmbedded={isEmbedded} />
                </HashRouter>
                <Toaster position="top-center" expand={true} richColors />
              </AdminThemedRoot>
            </AdminThemeProvider>
          </DyrectedProvider>
        </QueryProvider>
      </ErrorBoundary>
    </div>
  );
}

/**
 * Imperatively renders the Admin UI into a DOM element.
 * Useful for non-React frameworks (Nuxt, Svelte, Vanilla JS, Web Components).
 *
 * @param container - The DOM element to mount into.
 * @param props - Same props as `<AdminUI />`.
 * @returns A cleanup function that unmounts the React root.
 *
 * @example
 * ```ts
 * const cleanup = renderAdminUI(document.getElementById('admin')!, { baseUrl: '/dyrected' });
 * // Later:
 * cleanup();
 * ```
 */
export function renderAdminUI(container: HTMLElement, props: AdminUIProps) {
  const root = createRoot(container);
  root.render(
    React.createElement(StrictMode, null,
      React.createElement(AdminUI, props)
    )
  );
  return () => root.unmount();
}

// ─── Standalone component (MemoryRouter — for iframe / self-hosted mode) ──────

/** Props for the `<AdminStandalone />` self-contained iframe variant. */
export interface AdminStandaloneProps {
  /** API key for authenticating backend requests. */
  apiKey: string;
  /** Base URL of the Dyrected backend API. */
  baseUrl: string;
  /** Site ID for multi-tenant deployments. */
  siteId?: string;
  /** Optional externally controlled admin theme controller. */
  themeController?: AdminThemeController;
  /** Optional controlled admin theme preference. */
  theme?: AdminThemePreference;
  /** Optional resolved host system theme when `theme="system"`. */
  systemTheme?: ResolvedAdminTheme;
  /** Called when the admin theme preference changes. */
  onThemeChange?: (theme: AdminThemePreference) => void;
}

/**
 * A fully self-contained admin UI that uses a `MemoryRouter`.
 * Intended for iframe or self-hosted deployments where the admin owns
 * the entire page and does not share URL history with a host app.
 */
export function AdminStandalone({
  apiKey,
  baseUrl,
  siteId,
  themeController,
  theme,
  systemTheme,
  onThemeChange,
}: AdminStandaloneProps) {
  const [mounted, setMounted] = useState(false);
  const isThemeControlled =
    theme !== undefined || systemTheme !== undefined || onThemeChange !== undefined;
  const activeThemeController = React.useMemo(() => {
    if (themeController || !isThemeControlled) return themeController
    return createAdminThemeController({
      theme,
      systemTheme,
      onThemeChange,
    })
  }, [isThemeControlled, onThemeChange, systemTheme, theme, themeController])

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted) {
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return (
      <div className={cn("dy-admin-ui dy-h-full", prefersDark && "dark")}>
        <AdminSplash />
      </div>
    );
  }

  return (
    <div className="dy-admin-ui dy-h-full">
      <QueryProvider>
        <DyrectedProvider apiKey={apiKey} baseUrl={baseUrl} siteId={siteId}>
          <AdminThemeProvider controller={activeThemeController}>
            <AdminThemedRoot>
              <MemoryRouter>
                <AdminRoutes />
              </MemoryRouter>
              <Toaster position="top-center" expand={true} richColors />
            </AdminThemedRoot>
          </AdminThemeProvider>
        </DyrectedProvider>
      </QueryProvider>
    </div>
  );
}

// ─── Re-exports for external use ──────────────────────────────────────────────

export { SetupPromptUI } from "./pages/setup/setup-prompt";
export type { SetupPromptProps } from "./pages/setup/setup-prompt";
