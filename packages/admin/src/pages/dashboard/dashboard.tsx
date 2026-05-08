import { Database, Globe, ImageIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useDyrected } from "../../providers/dyrected-provider";
import { Button } from "../../components/ui/button";

export function Dashboard() {
  const { client } = useDyrected();

  const { data: schemas, isLoading: isLoadingSchemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client,
  });

  const collections = (schemas?.collections || []).filter((c: any) => !c.admin?.hidden && !c.slug.startsWith('platform_'));
  const globals = (schemas?.globals || []).filter((g: any) => !g.admin?.hidden && !g.slug.startsWith('platform_'));

  const collectionCounts = useQueries({
    queries: collections.map((col: any) => ({
      queryKey: ["collection-count", col.slug],
      queryFn: () => client!.find(col.slug, { limit: 1 }),
      enabled: !!client && !!col.slug,
    })),
  });

  if (isLoadingSchemas) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No schema yet — route to /setup
  if (collections.length === 0 && globals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No collections configured yet.</p>
          <Button asChild>
            <Link to="/setup">View Integration Guide</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">Monitor and manage your site's content and structure.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Collections</h3>
              <p className="text-3xl font-semibold">{collections.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-secondary/10 p-2 text-secondary-foreground">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Global Configs</h3>
              <p className="text-3xl font-semibold">{globals.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-accent/10 p-2 text-accent-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Media Files</h3>
              <p className="text-3xl font-bold">-</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5 text-secondary-foreground" />
              Global Settings
            </h3>
          </div>
          <div className="grid gap-3">
            {globals.slice(0, 5).map((glb: any) => (
              <Link
                key={glb.slug}
                to={`/globals/${glb.slug}`}
                className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div>
                  <p className="font-medium group-hover:text-secondary-foreground transition-colors">{glb.label || glb.slug}</p>
                  <p className="text-xs text-muted-foreground uppercase">{glb.slug}</p>
                </div>
                <div className="bg-secondary/10 px-2 py-1 rounded text-[10px] font-bold text-secondary-foreground uppercase">
                  Global
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
