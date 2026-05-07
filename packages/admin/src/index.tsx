import { MemoryRouter, Routes, Route, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DyrectedProvider } from "./providers/dyrected-provider";
import { QueryProvider } from "./providers/query-provider";
import { AdminShell } from "./components/layout/admin-shell";
import { CollectionListPage } from "./pages/collections/list-page";
import { EditEntryPage } from "./pages/collections/edit-page";
import { MediaPage } from "./pages/media/media-page";
import { GlobalEditorPage } from "./pages/globals/editor-page";

function Dashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="text-sm font-medium text-muted-foreground">Total Collections</h3>
        <p className="mt-2 text-3xl font-bold">-</p>
      </div>
      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="text-sm font-medium text-muted-foreground">Media Assets</h3>
        <p className="mt-2 text-3xl font-bold">-</p>
      </div>
    </div>
  );
}

function CollectionRoute() {
  const { slug } = useParams();
  const { client } = useDyrected();
  
  const { data: schemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client
  });

  const schema = schemas?.collections.find((c: any) => c.slug === slug);

  if (schema?.upload) {
    return <MediaPage collectionSlug={slug!} />;
  }

  return <CollectionListPage slug={slug!} />;
}

export interface AdminUIProps {
  apiKey: string;
  baseUrl: string;
  siteId?: string;
}

export function AdminUI({ apiKey, baseUrl, siteId }: AdminUIProps) {
  return (
    <DyrectedProvider apiKey={apiKey} baseUrl={baseUrl} siteId={siteId}>
      <QueryProvider>
        <MemoryRouter>
          <AdminShell isEmbedded>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/collections/:slug" element={<CollectionRoute />} />
              <Route path="/collections/:slug/new" element={<EditEntryPage />} />
              <Route path="/collections/:slug/edit/:id" element={<EditEntryPage />} />
              <Route path="/globals/:slug" element={<GlobalEditorPage />} />
            </Routes>
          </AdminShell>
        </MemoryRouter>
      </QueryProvider>
    </DyrectedProvider>
  );
}
