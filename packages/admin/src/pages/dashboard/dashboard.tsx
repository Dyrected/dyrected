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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-1 space-y-2 group">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/5 p-1.5 text-primary/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Database className="h-4 w-4" />
            </div>
            <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Collections</h3>
          </div>
          <p className="text-3xl font-bold tracking-tight">{collections.length}</p>
        </div>

        <div className="p-1 space-y-2 group">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-secondary/5 p-1.5 text-muted-foreground/60 group-hover:bg-accent group-hover:text-foreground transition-colors">
              <Globe className="h-4 w-4" />
            </div>
            <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Global Configs</h3>
          </div>
          <p className="text-3xl font-bold tracking-tight">{globals.length}</p>
        </div>

        <div className="p-1 space-y-2 group">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-accent p-1.5 text-muted-foreground/60 group-hover:bg-accent group-hover:text-foreground transition-colors">
              <ImageIcon className="h-4 w-4" />
            </div>
            <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Media Files</h3>
          </div>
          <p className="text-3xl font-bold tracking-tight">-</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Collections
            </h3>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/collections">View All</Link>
            </Button>
          </div>
          <div className="space-y-1">
            {collections.slice(0, 5).map((col: any, idx: number) => (
              <Link
                key={col.slug}
                to={`/collections/${col.slug}`}
                className="group flex items-center justify-between p-3 rounded-md hover:bg-primary/[0.02] transition-colors"
              >
                <div>
                  <p className="font-medium group-hover:text-primary transition-colors">{col.labels?.plural || col.slug}</p>
                  <p className="text-xs text-muted-foreground uppercase">{col.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <p className="text-sm font-semibold">{collectionCounts[idx]?.data?.total || 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Entries</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5 text-secondary-foreground" />
              Global Settings
            </h3>
          </div>
          <div className="space-y-1">
            {globals.slice(0, 5).map((glb: any) => (
              <Link
                key={glb.slug}
                to={`/globals/${glb.slug}`}
                className="group flex items-center justify-between p-3 rounded-md hover:bg-primary/[0.02] transition-colors"
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
