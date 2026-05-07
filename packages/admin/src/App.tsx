import { DyrectedProvider } from "./providers/dyrected-provider";
import { QueryProvider } from "./providers/query-provider";
import { AuthGate } from "./components/auth/auth-gate";
import { AdminShell } from "./components/layout/admin-shell";

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

function App() {
  return (
    <DyrectedProvider>
      <QueryProvider>
        <AuthGate>
          <AdminShell>
            <Dashboard />
          </AdminShell>
        </AuthGate>
      </QueryProvider>
    </DyrectedProvider>
  );
}

export default App;
