import { PageHeader } from "../../components/ui/page-header";

interface OperationalViewPageProps {
  slug: string;
  viewSlug: string;
  view: any;
  schema: any;
}

export function OperationalViewPage({ slug, view, schema }: OperationalViewPageProps) {
  return (
    <div className="dy-space-y-6">
      <PageHeader title={view.label} description={`Operational workspace for ${schema.labels?.singular || slug}`} />
      <div className="dy-rounded-lg dy-border dy-border-dashed dy-p-8 dy-text-center dy-text-sm dy-text-muted-foreground">
        Layout "{view.layout}" is not wired up yet.
      </div>
    </div>
  );
}
