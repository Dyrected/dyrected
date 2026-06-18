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
import { DyrectedProvider, useDyrected, type DyrectedProviderProps } from "./providers/dyrected-provider";
import { QueryProvider } from "./providers/query-provider";
import { AdminShell } from "./components/layout/admin-shell";
import { Dashboard } from "./pages/dashboard/dashboard";
import { CollectionListPage } from "./pages/collections/list-page";
import { EditEntryPage } from "./pages/collections/edit-page";
import { MediaPage } from "./pages/media/media-page";
import { GlobalEditorPage } from "./pages/globals/editor-page";
import { SetupPromptUI } from "./pages/setup/setup-prompt";
import { ErrorBoundary } from "./components/error-boundary";
import { AuthGate } from "./components/auth/auth-gate";
import { Toaster } from "./components/ui/sonner";

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

export interface AdminUIProps {
  apiKey?: string;
  baseUrl?: string;
  siteId?: string;
  /**
   * The base path where the admin is mounted in the host app.
   * Defaults to "/admin". Used by BrowserRouter so internal links
   * are relative to this prefix.
   *
   * Example — Next.js catch-all page at `app/admin/[[...path]]/page.tsx`:
   *   <AdminUI basename="/admin" ... />
   */
  basename?: string;
  /**
   * Called whenever the internal admin route changes.
   * Use this to sync the host router (e.g. Next.js router.push / Nuxt navigateTo)
   * so browser history works correctly when embedded.
   *
   * Example (Nuxt):
   *   <AdminUI onNavigate={(path) => navigateTo('/admin' + path)} ... />
   */
  onNavigate?: (path: string) => void;
  isEmbedded?: boolean;
  components?: DyrectedProviderProps['components'];
  // @internal – not for public docs. Used by Dyrected Cloud to bypass admin-level
  // auth when the user is already authenticated at the cloud level. The token is
  // minted server-side by the cloud backend and is short-lived (1h).
  initialToken?: string;
  defaultTechStack?: string;
}

// ─── Embedded component (BrowserRouter — real URL + history) ─────────────────

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
    return (
      <div className="dy-flex-1 dy-flex dy-items-center dy-justify-center dy-p-12 dy-bg-muted/5 dy-animate-pulse">
        <div className="dy-text-muted-foreground/40 dy-text-sm dy-font-medium">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dy-admin-ui dy-h-full">
      <ErrorBoundary>
        <DyrectedProvider apiKey={apiKey} baseUrl={baseUrl} siteId={siteId} components={components} initialToken={initialToken} defaultTechStack={defaultTechStack}>
          <QueryProvider>
            <HashRouter>
              <AdminRoutes onNavigate={onNavigate} isEmbedded={isEmbedded} />
            </HashRouter>
          </QueryProvider>
          <Toaster position="top-right" expand={true} richColors />
        </DyrectedProvider>
      </ErrorBoundary>
    </div>
  );
}

/**
 * Renders the Admin UI into a DOM element. 
 * Useful for non-React frameworks like Nuxt, Svelte, or Vanilla JS.
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

export interface AdminStandaloneProps {
  apiKey: string;
  baseUrl: string;
  siteId?: string;
}

export function AdminStandalone({ apiKey, baseUrl, siteId }: AdminStandaloneProps) {
  return (
    <div className="dy-admin-ui dy-h-full">
      <DyrectedProvider apiKey={apiKey} baseUrl={baseUrl} siteId={siteId}>
        <QueryProvider>
          <MemoryRouter>
            <AdminRoutes />
          </MemoryRouter>
        </QueryProvider>
        <Toaster position="top-right" expand={true} richColors />
      </DyrectedProvider>
    </div>
  );
}

// ─── Re-exports for external use ──────────────────────────────────────────────

export { SetupPromptUI } from "./pages/setup/setup-prompt";
export type { SetupPromptProps } from "./pages/setup/setup-prompt";
