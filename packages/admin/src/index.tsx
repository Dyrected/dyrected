import { useEffect } from "react";
import {
  BrowserRouter,
  MemoryRouter,
  Routes,
  Route,
  useParams,
  useLocation,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DyrectedProvider, useDyrected } from "./providers/dyrected-provider";
import { QueryProvider } from "./providers/query-provider";
import { AdminShell } from "./components/layout/admin-shell";
import { Dashboard } from "./pages/dashboard/dashboard";
import { CollectionListPage } from "./pages/collections/list-page";
import { EditEntryPage } from "./pages/collections/edit-page";
import { MediaPage } from "./pages/media/media-page";
import { GlobalEditorPage } from "./pages/globals/editor-page";
import { SetupPromptUI } from "./pages/setup/setup-prompt";

// ─── Route that resolves collection → list or media page ─────────────────────

function CollectionRoute() {
  const { slug } = useParams();
  const { client } = useDyrected();

  const { data: schemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client,
  });

  const schema = schemas?.collections.find((c: any) => c.slug === slug);

  if (schema?.upload) {
    return <MediaPage collectionSlug={slug!} />;
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

function AdminRoutes({ onNavigate }: { onNavigate?: (path: string) => void }) {
  return (
    <AdminShell>
      <NavigationSync onNavigate={onNavigate} />
      <Routes>
        <Route path="/"                              element={<Dashboard />} />
        <Route path="/collections/:slug"             element={<CollectionRoute />} />
        <Route path="/collections/:slug/new"         element={<EditEntryPage />} />
        <Route path="/collections/:slug/edit/:id"    element={<EditEntryPage />} />
        <Route path="/globals/:slug"                 element={<GlobalEditorPage />} />
        <Route path="/setup"                         element={<SetupPage />} />
      </Routes>
    </AdminShell>
  );
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AdminUIProps {
  apiKey: string;
  baseUrl: string;
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
}

// ─── Embedded component (BrowserRouter — real URL + history) ─────────────────

export function AdminUI({
  apiKey,
  baseUrl,
  siteId,
  basename = "/admin",
  onNavigate,
}: AdminUIProps) {
  return (
    <DyrectedProvider apiKey={apiKey} baseUrl={baseUrl} siteId={siteId}>
      <QueryProvider>
        <BrowserRouter basename={basename}>
          <AdminRoutes onNavigate={onNavigate} />
        </BrowserRouter>
      </QueryProvider>
    </DyrectedProvider>
  );
}

// ─── Standalone component (MemoryRouter — for iframe / self-hosted mode) ──────

export interface AdminStandaloneProps {
  apiKey: string;
  baseUrl: string;
  siteId?: string;
}

export function AdminStandalone({ apiKey, baseUrl, siteId }: AdminStandaloneProps) {
  return (
    <DyrectedProvider apiKey={apiKey} baseUrl={baseUrl} siteId={siteId}>
      <QueryProvider>
        <MemoryRouter>
          <AdminRoutes />
        </MemoryRouter>
      </QueryProvider>
    </DyrectedProvider>
  );
}

// ─── Re-exports for external use ──────────────────────────────────────────────

export { SetupPromptUI } from "./pages/setup/setup-prompt";
export type { SetupPromptProps, SetupPromptConfig } from "./pages/setup/setup-prompt";
