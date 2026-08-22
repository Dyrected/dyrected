import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useDyrected } from "../../providers/dyrected-context";
import { AdminNotFound, AdminNotFoundSkeleton } from "../../components/layout/admin-not-found";
import { OperationalViewPage } from "./operational-view-page";

export function OperationalViewRoute() {
  const { slug, viewSlug } = useParams();
  const { client } = useDyrected();

  const { data: schemas, isLoading } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client?.getSchemas() || Promise.resolve({ collections: [], globals: [] }),
    enabled: !!client,
  });

  if (isLoading || !schemas) {
    return <AdminNotFoundSkeleton />;
  }

  const schema = schemas?.collections.find((c: any) => c.slug === slug);

  if (!schema || schema?.admin?.hidden) {
    return (
      <AdminNotFound
        title="Collection not found"
        description={`We could not find a visible collection called "${slug}". It may have been renamed, hidden, or removed from this admin.`}
      />
    );
  }

  const view = schema.views?.find((v: any) => v.slug === viewSlug);

  if (!view) {
    return (
      <AdminNotFound
        title="View not found"
        description={`We could not find a view called "${viewSlug}" for collection "${slug}".`}
      />
    );
  }

  return <OperationalViewPage slug={slug!} viewSlug={viewSlug!} view={view} schema={schema} />;
}