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
      <div className="dy-flex dy-items-center dy-justify-center dy-h-64">
        <div className="dy-animate-spin dy-rounded-full dy-h-8 dy-w-8 dy-border-b-2 dy-border-primary"></div>
      </div>
    );
  }

  // No schema yet — route to /setup
  if (collections.length === 0 && globals.length === 0) {
    return (
      <div className="dy-flex dy-items-center dy-justify-center dy-h-64">
        <div className="dy-text-center dy-space-y-4">
          <p className="dy-text-muted-foreground">No collections configured yet.</p>
          <Button asChild>
            <Link to="/setup">View Integration Guide</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="dy-space-y-8 dy-animate-in dy-fade-in dy-duration-500">
      <div>
        <h2 className="dy-text-2xl dy-font-semibold dy-tracking-tight">Overview</h2>
        <p className="dy-text-muted-foreground">Monitor and manage your site's content and structure.</p>
      </div>

      <div className="dy-grid dy-gap-6 md:dy-grid-cols-2 lg:dy-grid-cols-3">
        <div className="dy-p-1 dy-space-y-2 dy-group dy-border dy-border-card">
          <div className="dy-flex dy-items-center dy-gap-3">
            <div className="dy-rounded-md dy-bg-primary/5 dy-p-1.5 dy-text-primary/60 dy-group-hover:dy-bg-primary/10 dy-group-hover:dy-text-primary dy-transition-colors">
              <Database className="dy-h-4 dy-w-4" />
            </div>
            <h3 className="dy-text-[10px] dy-font-bold dy-text-muted-foreground/40 dy-uppercase dy-tracking-widest">Collections</h3>
          </div>
          <p className="dy-text-3xl dy-font-bold dy-tracking-tight">{collections.length}</p>
        </div>

        <div className="dy-p-1 dy-space-y-2 dy-group dy-border dy-border-card">
          <div className="dy-flex dy-items-center dy-gap-3">
            <div className="dy-rounded-md dy-bg-secondary/5 dy-p-1.5 dy-text-muted-foreground/60 dy-group-hover:dy-bg-accent dy-group-hover:dy-text-foreground dy-transition-colors">
              <Globe className="dy-h-4 dy-w-4" />
            </div>
            <h3 className="dy-text-[10px] dy-font-bold dy-text-muted-foreground/40 dy-uppercase dy-tracking-widest">Global Configs</h3>
          </div>
          <p className="dy-text-3xl dy-font-bold dy-tracking-tight">{globals.length}</p>
        </div>

        <div className="dy-p-1 dy-space-y-2 dy-group dy-border dy-border-card">
          <div className="dy-flex dy-items-center dy-gap-3">
            <div className="dy-rounded-md dy-bg-accent dy-p-1.5 dy-text-muted-foreground/60 dy-group-hover:dy-bg-accent dy-group-hover:dy-text-foreground dy-transition-colors">
              <ImageIcon className="dy-h-4 dy-w-4" />
            </div>
            <h3 className="dy-text-[10px] dy-font-bold dy-text-muted-foreground/40 dy-uppercase dy-tracking-widest">Media Files</h3>
          </div>
          <p className="dy-text-3xl dy-font-bold dy-tracking-tight">-</p>
        </div>
      </div>

      <div className="dy-grid dy-gap-8 md:dy-grid-cols-2">
        <section >
          <div className="dy-flex dy-items-center dy-justify-between dy-mb-4">
            <h3 className="dy-text-lg dy-font-semibold dy-flex dy-items-center dy-gap-2">
              <Database className="dy-h-5 dy-w-5 dy-text-primary" />
              Collections
            </h3>
            {/* <Button variant="ghost" size="sm" asChild className="dy-text-xs">
              <Link to="/collections">View All</Link>
            </Button> */}
          </div>
          <div className="dy-space-y-1 dy-border dy-border-card">
            {collections.map((col: any, idx: number) => (
              <Link
                key={col.slug}
                to={`/collections/${col.slug}`}
                className="dy-group dy-flex dy-items-center dy-justify-between dy-p-3 dy-rounded-md hover:dy-bg-primary/[0.02] dy-transition-colors"
              >
                <div>
                  <p className="dy-font-medium dy-group-hover:dy-text-primary dy-transition-colors">{col.labels?.plural || col.slug}</p>
                  <p className="dy-text-xs dy-text-muted-foreground dy-uppercase">{col.slug}</p>
                </div>
                <div className="dy-flex dy-items-center dy-gap-3">
                  <div className="dy-text-right dy-mr-4">
                    <p className="dy-text-sm dy-font-semibold">{collectionCounts[idx]?.data?.total || 0}</p>
                    <p className="dy-text-[10px] dy-text-muted-foreground dy-uppercase">Entries</p>
                  </div>
                  <ArrowRight className="dy-h-4 dy-w-4 dy-text-muted-foreground dy-group-hover:dy-text-primary dy-transition-transform dy-group-hover:dy-translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="dy-flex dy-items-center dy-justify-between dy-mb-4">
            <h3 className="dy-text-lg dy-font-semibold dy-flex dy-items-center dy-gap-2">
              <Globe className="dy-h-5 dy-w-5 dy-text-secondary-foreground" />
              Global Settings
            </h3>
          </div>
          <div className="dy-space-y-1 dy-border dy-border-card">
            {globals.map((glb: any) => (
              <Link
                key={glb.slug}
                to={`/globals/${glb.slug}`}
                className="dy-group dy-flex dy-items-center dy-justify-between dy-p-3 dy-rounded-md hover:dy-bg-primary/[0.02] dy-transition-colors"
              >
                <div>
                  <p className="dy-font-medium dy-group-hover:dy-text-secondary-foreground dy-transition-colors">{glb.label || glb.slug}</p>
                  <p className="dy-text-xs dy-text-muted-foreground dy-uppercase">{glb.slug}</p>
                </div>
                <div className="dy-bg-secondary/10 dy-px-2 dy-py-1 dy-rounded dy-text-[10px] dy-font-bold dy-text-secondary-foreground dy-uppercase">
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
