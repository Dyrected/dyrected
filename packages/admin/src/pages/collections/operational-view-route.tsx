import { useDyrected } from "../../providers/dyrected-context"
import { AdminNotFound, AdminNotFoundSkeleton } from "../../components/layout/admin-not-found"
import { useParams } from "react-router-dom"

import { OperationalViewPage } from "./views/operational-view-page"

export function OperationalViewRoute() {
  const { slug, viewSlug } = useParams()
  const { schemas } = useDyrected()

  if (!schemas) {
    return <AdminNotFoundSkeleton />
  }

  const schema = schemas?.collections.find((c: any) => c.slug === slug)

  if (!schema) {
    return (
      <AdminNotFound
        title="Collection not found"
        description={`We could not find a collection called "${slug}". It may have been renamed or removed from this admin.`}
      />
    )
  }

  const view = schema.views?.find((v: any) => v.slug === viewSlug)

  if (!view) {
    return (
      <AdminNotFound
        title="View not found"
        description={`We could not find a view called "${viewSlug}" for collection "${slug}".`}
      />
    )
  }

  return (
    <OperationalViewPage
      key={`${slug}:${viewSlug}`}
      slug={slug!}
      schema={schema}
      view={view}
      schemas={schemas}
    />
  )
}
