/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react"
import { useParams, useNavigate, Navigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-context"
import { DetailRenderer } from "../../components/detail/detail-renderer"
import { generateDefaultDetailSchema } from "@dyrected/core"
import { AdminSectionSkeleton } from "../../components/layout/admin-loading"
import { AdminNotFound } from "../../components/layout/admin-not-found"
import { Button } from "../../components/ui/button"
import { resolveAdminIcon } from "../../lib/admin-icons"
import { Globe, Pencil, RefreshCw } from "lucide-react"

export function GlobalDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { client, user, schemas } = useDyrected()

  const globalSchema = schemas?.globals?.find((g: any) => g.slug === slug)
  const GlobalIcon = React.useMemo(
    () => resolveAdminIcon(globalSchema?.admin?.icon, Globe),
    [globalSchema?.admin?.icon],
  )

  const {
    data: doc,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["global", slug, "detail"],
    queryFn: async () => {
      if (!slug) throw new Error("Missing global slug")
      const result = await client.getGlobal(slug)
      return result || {}
    },
    enabled: Boolean(slug && client),
  })

  if (globalSchema && (globalSchema as any).detail === false) {
    return <Navigate to={`/globals/${slug}/edit`} replace />
  }

  if (isLoading || !schemas) {
    return (
      <div className="dy-p-6 sm:dy-p-8 dy-space-y-6 dy-max-w-7xl dy-mx-auto">
        <div className="dy-h-12 dy-w-1/3 dy-bg-muted/50 dy-rounded-xl dy-animate-pulse" />
        <AdminSectionSkeleton />
        <AdminSectionSkeleton />
      </div>
    )
  }

  if (isError || !globalSchema) {
    return (
      <div className="dy-p-6 sm:dy-p-8 dy-max-w-xl dy-mx-auto dy-text-center dy-space-y-4">
        <AdminNotFound
          title="Global Not Found"
          description={
            (error as Error)?.message ||
            `We could not find a visible global configuration for "${slug}".`
          }
          backTo="/"
        />
        <div className="dy-flex dy-items-center dy-justify-center dy-gap-3">
          <Button variant="default" onClick={() => refetch()} className="dy-gap-1.5">
            <RefreshCw className="dy-h-4 dy-w-4" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    )
  }

  const detailSchema =
    Array.isArray(globalSchema.detail)
      ? globalSchema.detail
      : generateDefaultDetailSchema(globalSchema)

  const label = globalSchema.label || globalSchema.slug

  return (
    <div className="dy-space-y-6 dy-max-w-7xl dy-mx-auto">
      {/* Header bar */}
      <div className="dy-space-y-4 dy-pb-6 dy-border-b dy-border-border/60">
        <div className="dy-flex dy-items-center dy-justify-between">
          <div className="dy-flex dy-items-center dy-gap-2 dy-text-sm dy-text-muted-foreground">
            <span>Globals</span>
            <span>/</span>
            <span className="dy-font-medium dy-text-foreground">{label}</span>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => navigate(`/globals/${slug}/edit`)}
            className="dy-h-8 dy-gap-1.5 dy-font-semibold"
          >
            <Pencil className="dy-h-3.5 dy-w-3.5" />
            <span>Edit</span>
          </Button>
        </div>

        <div className="dy-flex dy-items-center dy-gap-4">
          <div className="dy-p-2.5 dy-bg-primary/10 dy-text-primary dy-rounded-xl dy-shrink-0">
            {React.createElement(GlobalIcon, { className: "dy-h-6 dy-w-6" })}
          </div>
          <div>
            <h1 className="dy-text-2xl sm:dy-text-3xl dy-font-bold dy-tracking-tight dy-text-foreground">
              {label}
            </h1>
            {(globalSchema as any).admin?.description && (
              <p className="dy-text-xs sm:dy-text-sm dy-text-muted-foreground dy-mt-0.5">
                {(globalSchema as any).admin.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Detail Content */}
      <main className="dy-pt-2">
        <DetailRenderer
          items={detailSchema}
          doc={doc}
          collection={globalSchema}
          user={user}
          client={client}
          schemas={schemas}
        />
      </main>
    </div>
  )
}
