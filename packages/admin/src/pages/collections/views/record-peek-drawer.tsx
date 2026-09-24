import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Database, ExternalLink, Loader2, RefreshCw } from "lucide-react"
import { Link } from "react-router-dom"
import { generateDefaultDetailSchema } from "@dyrected/core"

import { useDyrected } from "../../../providers/dyrected-context"
import { DetailRenderer } from "../../../components/detail/detail-renderer"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet"
import { Button } from "../../../components/ui/button"
import { resolveAdminIcon } from "../../../lib/admin-icons"

export interface RecordPeekDrawerProps {
  collectionSlug: string
  recordId: string | null
  schema: any
  schemas: any
  isOpen: boolean
  onClose: () => void
}

/**
 * Slide-over peek drawer for in-place record inspections and inline editing
 * triggered by `?record=:id` query parameter on operational views.
 */
export function RecordPeekDrawer({
  collectionSlug,
  recordId,
  schema,
  schemas,
  isOpen,
  onClose,
}: RecordPeekDrawerProps): React.JSX.Element {
  const { client, user } = useDyrected()
  const queryClient = useQueryClient()

  const queryKey = React.useMemo(
    () => ["collections", collectionSlug, "detail", recordId],
    [collectionSlug, recordId]
  )

  const {
    data: doc,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!collectionSlug || !recordId || !client) throw new Error("Missing parameters")
      return client.collection(collectionSlug).findOne(recordId, { depth: 1 })
    },
    enabled: Boolean(isOpen && collectionSlug && recordId && client),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ fieldName, value }: { fieldName: string; value: any }) => {
      if (!collectionSlug || !recordId || !client) throw new Error("Missing parameters")
      return client.collection(collectionSlug).update(recordId, { [fieldName]: value })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey })
      await queryClient.invalidateQueries({ queryKey: ["operational-view", collectionSlug] })
      await queryClient.invalidateQueries({ queryKey: ["admin-navigation-badges"] })
    },
  })

  const handleUpdate = React.useCallback(
    async (fieldName: string, draftValue: any) => {
      await updateMutation.mutateAsync({ fieldName, value: draftValue })
    },
    [updateMutation]
  )

  const detailItems = React.useMemo(() => {
    if (!schema) return []
    if (schema.detail && Array.isArray(schema.detail.items)) {
      return schema.detail.items
    }
    return generateDefaultDetailSchema(schema)
  }, [schema])

  const recordTitle: string = React.useMemo(() => {
    if (!doc) return recordId || ""
    const titleField = schema?.admin?.useAsTitle
    if (titleField && doc[titleField]) {
      const val = doc[titleField]
      return typeof val === "string" ? val : JSON.stringify(val)
    }
    const candidate = doc.title ?? doc.name ?? doc.label ?? doc.email ?? recordId ?? ""
    return typeof candidate === "string" ? candidate : JSON.stringify(candidate)
  }, [doc, recordId, schema])

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="dy-w-full sm:dy-max-w-xl md:dy-max-w-2xl lg:dy-max-w-3xl dy-p-0 dy-flex dy-flex-col dy-h-full dy-overflow-hidden dy-bg-background dy-border-l dy-border-border dy-shadow-2xl"
      >
        {/* Header */}
        <SheetHeader className="dy-p-4 dy-border-b dy-border-border dy-bg-muted/30 dy-flex-shrink-0">
          <div className="dy-flex dy-items-center dy-justify-between dy-gap-3 dy-pr-8">
            <div className="dy-flex dy-items-center dy-gap-2.5 dy-min-w-0">
              <div className="dy-flex dy-h-8 dy-w-8 dy-shrink-0 dy-items-center dy-justify-center dy-rounded-md dy-bg-primary/10 dy-text-primary">
                {React.createElement(resolveAdminIcon(schema?.admin?.icon, Database), { className: "dy-h-4 dy-w-4" })}
              </div>
              <div className="dy-min-w-0">
                <SheetTitle className="dy-truncate dy-text-base dy-font-semibold">
                  {recordTitle || "Record Details"}
                </SheetTitle>
                <SheetDescription className="dy-truncate dy-text-xs dy-text-muted-foreground">
                  {schema?.labels?.singular || schema?.label || collectionSlug} • {recordId}
                </SheetDescription>
              </div>
            </div>

            <div className="dy-flex dy-items-center dy-gap-1.5 dy-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="dy-h-8 dy-w-8 dy-p-0"
                title="Refresh"
              >
                <RefreshCw className="dy-h-3.5 dy-w-3.5" />
              </Button>
              {recordId && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="dy-h-8 dy-gap-1.5 dy-text-xs"
                >
                  <Link to={`/collections/${collectionSlug}/${recordId}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="dy-h-3.5 dy-w-3.5" />
                    <span>Open Full Page</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="dy-flex-1 dy-overflow-y-auto dy-p-6">
          {isLoading ? (
            <div className="dy-flex dy-h-64 dy-items-center dy-justify-center dy-gap-2 dy-text-muted-foreground">
              <Loader2 className="dy-h-5 dy-w-5 dy-animate-spin" />
              <span className="dy-text-sm">Loading record details...</span>
            </div>
          ) : isError ? (
            <div className="dy-rounded-lg dy-border dy-border-destructive/30 dy-bg-destructive/5 dy-p-6 dy-text-center">
              <p className="dy-text-sm dy-font-medium dy-text-destructive">
                {(error as Error)?.message || "Failed to load record."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="dy-mt-3 dy-gap-1.5"
              >
                <RefreshCw className="dy-h-3.5 dy-w-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          ) : doc ? (
            <DetailRenderer
              items={detailItems}
              doc={doc}
              collection={schema}
              schemas={schemas}
              user={user}
              client={client}
              onUpdate={handleUpdate}
              onActionSuccess={async () => {
                await refetch()
                await queryClient.invalidateQueries({ queryKey: ["operational-view", collectionSlug] })
                await queryClient.invalidateQueries({ queryKey: ["admin-navigation-badges"] })
              }}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
