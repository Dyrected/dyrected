/** @jsxImportSource react */
import "./index.css";
import React, { useEffect, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  MemoryRouter,
  Routes,
  Route,
  useParams,
  useLocation,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DyrectedProvider, type DyrectedProviderProps } from "./providers/dyrected-provider";
import { useDyrected } from "./providers/dyrected-context";
import { QueryProvider } from "./providers/query-provider";
import { AdminShell } from "./components/layout/admin-shell";
import { Dashboard } from "./pages/dashboard/dashboard";
import { CollectionListPage } from "./pages/collections/list-page";
import { EditEntryPage } from "./pages/collections/edit-page";
import { MediaPage } from "./pages/media/media-page";
import { GlobalEditorPage } from "./pages/globals/editor-page";
import { SetupPromptUI } from "./pages/setup/setup-prompt";
import { ErrorBoundary } from "./components/error-boundary";
import { DocumentMeta } from "./components/document-meta";
import { AuthGate } from "./components/auth/auth-gate";
import { AdminSplash } from "./components/layout/admin-splash";
import { Toaster } from "./components/ui/sonner";
import { AdminThemeProvider, AdminThemedRoot } from "./hooks/admin-theme-provider";
import { cn } from "./lib/utils";

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
  getValueAtPath,
  setValueAtPath,
} from "./controllers/form";
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
  DyrectedFormState,
  DyrectedFormValues,
  DyrectedSetValueOptions,
} from "./controllers/form";
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
export { useDyrectedForm } from "./hooks/use-dyrected-form";
export { useField } from "./hooks/use-field";
export { useMediaLibrary } from "./hooks/use-media-library";
export { useMediaUpload } from "./hooks/use-media-upload";
export { useMediaURL } from "./hooks/use-media-url";
export { useAddMediaFromUrl } from "./hooks/use-add-media-from-url";

// ─── Route that resolves collection → list or media page ─────────────────────

function CollectionRoute() {
  const { slug } = useParams();
  const { client } = useDyrected();

  const { data: schemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client?.getSchemas() || Promise.resolve({ collections: [], globals: [] }),
    enabled: !!client,
  });

  const schema = schemas?.collections.find((c: any) => c.slug === slug);

  if (schema?.admin?.hidden) {
    return <div>404: Not Found</div>;
  }

  if (schema?.upload) {
    return <MediaPage collectionSlug={slug!} schema={schema} />;
  }

  return <CollectionListPage slug={slug!} />;
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
            <Route path="/collections/:slug/new" element={<EditEntryPage />} />
            <Route path="/collections/:slug/edit/:id" element={<EditEntryPage />} />
            <Route path="/globals/:slug" element={<GlobalEditorPage />} />
            <Route path="/setup" element={<SetupPage />} />
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
}: AdminUIProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
        <DyrectedProvider apiKey={apiKey} baseUrl={baseUrl} siteId={siteId} components={components} initialToken={initialToken} defaultTechStack={defaultTechStack}>
          <AdminThemeProvider>
            <AdminThemedRoot>
              <QueryProvider>
                <HashRouter>
                  <AdminRoutes onNavigate={onNavigate} isEmbedded={isEmbedded} />
                </HashRouter>
              </QueryProvider>
              <Toaster position="top-center" expand={true} richColors />
            </AdminThemedRoot>
          </AdminThemeProvider>
        </DyrectedProvider>
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
}

/**
 * A fully self-contained admin UI that uses a `MemoryRouter`.
 * Intended for iframe or self-hosted deployments where the admin owns
 * the entire page and does not share URL history with a host app.
 */
export function AdminStandalone({ apiKey, baseUrl, siteId }: AdminStandaloneProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      <DyrectedProvider apiKey={apiKey} baseUrl={baseUrl} siteId={siteId}>
        <AdminThemeProvider>
          <AdminThemedRoot>
            <QueryProvider>
              <MemoryRouter>
                <AdminRoutes />
              </MemoryRouter>
            </QueryProvider>
            <Toaster position="top-center" expand={true} richColors />
          </AdminThemedRoot>
        </AdminThemeProvider>
      </DyrectedProvider>
    </div>
  );
}

// ─── Re-exports for external use ──────────────────────────────────────────────

export { SetupPromptUI } from "./pages/setup/setup-prompt";
export type { SetupPromptProps } from "./pages/setup/setup-prompt";
