/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate, Navigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-context"
import { DetailHeader } from "../../components/detail/detail-header"
import { DetailRenderer } from "../../components/detail/detail-renderer"
import { generateDefaultDetailSchema } from "@dyrected/core"
import { AdminSectionSkeleton } from "../../components/layout/admin-loading"
import { AdminNotFound } from "../../components/layout/admin-not-found"
import { Button } from "../../components/ui/button"
import { ArrowLeft, RefreshCw } from "lucide-react"

export function DetailEntryPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const navigate = useNavigate()
  const { client, user, schemas } = useDyrected()

  const collection = schemas?.collections?.find((c: any) => c.slug === slug)

  const {
    data: doc,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["collections", slug, "detail", id],
    queryFn: async () => {
      if (!slug || !id) throw new Error("Missing slug or ID")
      const result = await client.collection(slug).findOne(id, { depth: 1 })
      return result
    },
    enabled: Boolean(slug && id && client),
  })

  if (collection && collection.detail === false) {
    return <Navigate to={`/collections/${slug}/${id}/edit`} replace />
  }

  if (isLoading) {
    return (
      <div className="dy-p-6 sm:dy-p-8 dy-space-y-6 dy-max-w-7xl dy-mx-auto">
        <div className="dy-h-12 dy-w-1/3 dy-bg-muted/50 dy-rounded-xl dy-animate-pulse" />
        <AdminSectionSkeleton />
        <AdminSectionSkeleton />
      </div>
    )
  }

  if (isError || !doc || !collection) {
    return (
      <div className="dy-p-6 sm:dy-p-8 dy-max-w-xl dy-mx-auto dy-text-center dy-space-y-4">
        <AdminNotFound
          title="Record Not Found"
          description={
            (error as Error)?.message ||
            `The requested record in "${slug}" could not be loaded.`
          }
        />
        <div className="dy-flex dy-items-center dy-justify-center dy-gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/collections/${slug}`)}
            className="dy-gap-1.5"
          >
            <ArrowLeft className="dy-h-4 dy-w-4" />
            <span>Back to List</span>
          </Button>
          <Button variant="default" onClick={() => refetch()} className="dy-gap-1.5">
            <RefreshCw className="dy-h-4 dy-w-4" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    )
  }

  const detailSchema =
    Array.isArray(collection.detail)
      ? collection.detail
      : generateDefaultDetailSchema(collection)

  return (
    <div className="dy-space-y-6 dy-max-w-7xl dy-mx-auto">
      <DetailHeader collection={collection} doc={doc} user={user} schemas={schemas} />
      <main className="dy-pt-2">
        <DetailRenderer
          items={detailSchema}
          doc={doc}
          collection={collection}
          user={user}
          client={client}
          schemas={schemas}
        />
      </main>
    </div>
  )
}
