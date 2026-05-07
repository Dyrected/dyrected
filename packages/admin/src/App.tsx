import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { DyrectedProvider } from "./providers/dyrected-provider";
import { QueryProvider } from "./providers/query-provider";
import { AuthGate } from "./components/auth/auth-gate";
import { AdminShell } from "./components/layout/admin-shell";
import { CollectionListPage } from "./pages/collections/list-page";
import { EditEntryPage } from "./pages/collections/edit-page";
import { MediaPage } from "./pages/media/media-page";

function Dashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="text-sm font-medium text-muted-foreground">Total Collections</h3>
        <p className="mt-2 text-3xl font-bold">12</p>
      </div>
      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="text-sm font-medium text-muted-foreground">Media Assets</h3>
        <p className="mt-2 text-3xl font-bold">482</p>
      </div>
      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="text-sm font-medium text-muted-foreground">Storage Usage</h3>
        <p className="mt-2 text-3xl font-bold">1.2 GB</p>
      </div>
      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="text-sm font-medium text-muted-foreground">Active Webhooks</h3>
        <p className="mt-2 text-3xl font-bold">3</p>
      </div>
    </div>
  );
}

function CollectionRoute() {
  const { slug } = useParams();
  return <CollectionListPage slug={slug!} />;
}

function App() {
  return (
    <DyrectedProvider>
      <QueryProvider>
        <AuthGate>
          <BrowserRouter>
            <AdminShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/collections/:slug" element={<CollectionRoute />} />
                <Route path="/collections/:slug/new" element={<EditEntryPage />} />
                <Route path="/collections/:slug/edit/:id" element={<EditEntryPage />} />
                <Route path="/globals/:slug" element={<div>Global Editor (Coming Soon)</div>} />
                <Route path="/media" element={<MediaPage />} />
              </Routes>
            </AdminShell>
          </BrowserRouter>
        </AuthGate>
      </QueryProvider>
    </DyrectedProvider>
  );
}

export default App;
