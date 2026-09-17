/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, lazy, Suspense } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { normalizeDetailItem, generateDefaultDetailSchema } from "@dyrected/core"
import { resolveAdminIcon } from "../../lib/admin-icons"
import { Layers, Loader2, Maximize2, Pencil, Eye, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../ui/sheet"
import { useIsMobile } from "../../hooks/use-mobile"
import { useAdjacentItems } from "../../hooks/use-adjacent-items"
import {
  saveDrawerDocument,
  updateDrawerField,
  invalidateParentAndJoinQueries,
} from "../../lib/drawer-save-pipeline"
import type { DetailItem, DetailRepeatOptions } from "@dyrected/core"

const FormEngine = lazy(async () => {
  const module = await import("../forms/form-engine")
  return { default: module.FormEngine }
})

const DetailRenderer = lazy(async () => {
  const module = await import("./detail-renderer")
  return { default: module.DetailRenderer }
})

export interface DetailRepeatComponentProps {
  field: string
  fieldDef?: any
  doc?: any
  client?: any
  schemas?: any
  user?: any
  items: DetailItem[]
  options?: DetailRepeatOptions
  data: any[]
  renderItemContent: (item: DetailItem, rowData: any) => React.ReactNode
  parentCollection?: string
  onParentUpdate?: () => Promise<void> | void
}

const cardSpanClasses: Record<number, string> = {
  1: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-1",
  2: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-2",
  3: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-3",
  4: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-4",
  5: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-5",
  6: "dy-col-span-12 sm:dy-col-span-6",
  7: "dy-col-span-12 md:dy-col-span-7",
  8: "dy-col-span-12 md:dy-col-span-8",
  9: "dy-col-span-12 md:dy-col-span-9",
  10: "dy-col-span-12 md:dy-col-span-10",
  11: "dy-col-span-12 md:dy-col-span-11",
  12: "dy-col-span-12",
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined
  if (path in obj) return obj[path]
  const parts = path.split(".")
  let curr = obj
  for (const part of parts) {
    if (curr == null) return undefined
    curr = curr[part]
  }
  return curr
}

export function DetailRepeatComponent({
  field: _field,
  fieldDef,
  doc,
  client,
  schemas,
  user,
  items,
  options,
  data,
  renderItemContent,
  parentCollection,
  onParentUpdate,
}: DetailRepeatComponentProps) {
  const layout = options?.layout || "table"
  const emptyText = options?.emptyText || "No items recorded"
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()

  const isJoinField = Boolean(
    (fieldDef?.type === "join" || fieldDef?.collection) &&
    (fieldDef?.collection || fieldDef?.relationTo) &&
    fieldDef?.on &&
    doc?.id &&
    client
  )

  const targetCol = fieldDef?.collection || fieldDef?.relationTo
  const onField = fieldDef?.on

  const targetSchema = schemas?.collections?.find((c: any) => c.slug === targetCol)
  const singularLabel = targetSchema?.labels?.singular || targetCol

  // Detail-First collections (schema.detail truthy) open the drawer into a read-only
  // summary first, matching how their own full detail page behaves; Edit-First
  // collections (the default) open straight into the form.
  const targetIsDetailFirst = Boolean(targetSchema?.detail)

  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"detail" | "form">("form")
  const isDrawerOpen = Boolean(activeDocId)

  useEffect(() => {
    const next: "detail" | "form" = targetIsDetailFirst ? "detail" : "form"
    setViewMode((prev) => (prev === next ? prev : next))
  }, [activeDocId, targetIsDetailFirst])

  const detailSchemaItems = useMemo(() => {
    if (!targetIsDetailFirst || !targetSchema) return []
    return Array.isArray(targetSchema.detail)
      ? targetSchema.detail
      : generateDefaultDetailSchema(targetSchema)
  }, [targetIsDetailFirst, targetSchema])

  const { data: fallbackJoinData, isLoading: isJoinLoading } = useQuery({
    queryKey: ["join", targetCol, onField, doc?.id],
    queryFn: async () => {
      if (!client || !targetCol || !onField || !doc?.id) return []
      const res = await client.collection(targetCol).find({
        where: { [onField]: { equals: doc.id } },
        depth: 1,
        limit: 50,
      }).exec()
      return Array.isArray(res) ? res : (res?.docs || [])
    },
    enabled: Boolean(isJoinField && (!Array.isArray(data) || data.length === 0)),
  })

  const effectiveData = (Array.isArray(data) && data.length > 0)
    ? data
    : (fallbackJoinData || [])

  const activeFallbackItem = activeDocId
    ? effectiveData.find((row: any) => String(row?.id) === activeDocId)
    : undefined

  const { data: activeDocData, isLoading: isLoadingActiveDoc } = useQuery({
    queryKey: ["collection", targetCol, "detail", activeDocId],
    queryFn: async () => {
      if (!client || !targetCol || !activeDocId) return null
      return client.collection(targetCol).findOne(activeDocId)
    },
    enabled: Boolean(client && targetCol && activeDocId),
    staleTime: 10_000,
  })

  const handleOpenEdit = (row: any) => {
    if (isJoinField && row?.id != null) {
      setActiveDocId(String(row.id))
    }
  }

  // Lets the drawer step through the already-loaded rows without closing and
  // reopening it, mirroring the full edit page's adjacent-document nav.
  const { prevItem, nextItem, hasPrev, hasNext } = useAdjacentItems(effectiveData, activeDocId)

  const handleCloseDrawer = () => setActiveDocId(null)

  const pipelineContext = useMemo(
    () => ({
      client,
      queryClient,
      targetCollection: targetCol || "",
      parentCollection,
      parentDocId: doc?.id != null ? String(doc.id) : undefined,
      parentFieldName: _field,
      onField,
      singularLabel,
      onSuccess: async () => {
        await onParentUpdate?.()
      },
    }),
    [
      client,
      queryClient,
      targetCol,
      parentCollection,
      doc?.id,
      _field,
      onField,
      singularLabel,
      onParentUpdate,
    ],
  )

  const handleDrawerFieldUpdate = async (fieldName: string, value: unknown) => {
    if (!activeDocId) return
    await updateDrawerField(pipelineContext, activeDocId, fieldName, value)
  }

  const handleNavigateFullEdit = () => {
    if (activeDocId) {
      navigate(`/collections/${targetCol}/${activeDocId}/edit`)
    }
  }

  const handleDrawerSubmit = async (formData: Record<string, unknown>) => {
    if (!activeDocId) return
    try {
      await saveDrawerDocument(pipelineContext, formData, {
        isCreating: false,
        activeDocId,
      })
      handleCloseDrawer()
    } catch {
      // Error toast already displayed by pipeline
    }
  }

  const drawerDefaultValues = (activeDocData as Record<string, unknown>) || activeFallbackItem || { id: activeDocId }

  const drawer = (
    <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && handleCloseDrawer()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          isMobile
            ? "dy-h-[85vh] dy-rounded-t-2xl dy-max-h-[90vh]"
            : "sm:dy-max-w-xl md:dy-max-w-2xl lg:dy-max-w-3xl dy-w-full",
          "dy-overflow-y-auto dy-p-6 dy-flex dy-flex-col"
        )}
      >
        <SheetHeader className="dy-space-y-1.5 dy-border-b dy-border-border/40 dy-pb-4 dy-pr-8">
          <div className="dy-flex dy-items-center dy-justify-between">
            <SheetTitle className="dy-text-base dy-font-semibold dy-text-foreground">
              {viewMode === "detail" ? `View ${singularLabel}` : `Edit ${singularLabel}`}
            </SheetTitle>
            <div className="dy-flex dy-items-center dy-gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Previous"
                disabled={!hasPrev}
                onClick={() => prevItem && handleOpenEdit(prevItem)}
                className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-foreground disabled:dy-opacity-30"
              >
                <ChevronLeft className="dy-h-3.5 dy-w-3.5" />
                <span className="dy-sr-only">Previous</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Next"
                disabled={!hasNext}
                onClick={() => nextItem && handleOpenEdit(nextItem)}
                className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-foreground disabled:dy-opacity-30"
              >
                <ChevronRight className="dy-h-3.5 dy-w-3.5" />
                <span className="dy-sr-only">Next</span>
              </Button>
              <div className="dy-w-px dy-h-4 dy-bg-border/60 dy-mx-1" />
              {targetIsDetailFirst && (
                viewMode === "detail" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={`Edit ${singularLabel}`}
                    onClick={() => setViewMode("form")}
                    className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-foreground"
                  >
                    <Pencil className="dy-h-3.5 dy-w-3.5" />
                    <span className="dy-sr-only">Edit</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={`View ${singularLabel}`}
                    onClick={() => setViewMode("detail")}
                    className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-foreground"
                  >
                    <Eye className="dy-h-3.5 dy-w-3.5" />
                    <span className="dy-sr-only">View</span>
                  </Button>
                )
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Open full page"
                onClick={handleNavigateFullEdit}
                className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-foreground"
              >
                <Maximize2 className="dy-h-3.5 dy-w-3.5" />
                <span className="dy-sr-only">Open full page</span>
              </Button>
            </div>
          </div>
          {activeDocId && (
            <SheetDescription className="dy-text-xs dy-text-muted-foreground">
              Document ID: {activeDocId}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="dy-flex-1">
          {isLoadingActiveDoc && !activeFallbackItem ? (
            <div className="dy-flex dy-items-center dy-justify-center dy-py-16">
              <Loader2 className="dy-w-6 dy-h-6 dy-animate-spin dy-text-muted-foreground" />
            </div>
          ) : viewMode === "detail" ? (
            <Suspense
              fallback={
                <div className="dy-flex dy-items-center dy-justify-center dy-py-16">
                  <Loader2 className="dy-w-6 dy-h-6 dy-animate-spin dy-text-muted-foreground" />
                </div>
              }
            >
              <DetailRenderer
                items={detailSchemaItems}
                doc={drawerDefaultValues}
                collection={targetSchema}
                client={client}
                schemas={schemas}
                user={user}
                onUpdate={handleDrawerFieldUpdate}
                onActionSuccess={async () => {
                  await invalidateParentAndJoinQueries({
                    queryClient,
                    parentCollection,
                    parentDocId: doc?.id != null ? String(doc.id) : undefined,
                    targetCollection: targetCol,
                    onField,
                  })
                  await onParentUpdate?.()
                }}
              />
            </Suspense>
          ) : targetSchema?.fields ? (
            <Suspense
              fallback={
                <div className="dy-flex dy-items-center dy-justify-center dy-py-16">
                  <Loader2 className="dy-w-6 dy-h-6 dy-animate-spin dy-text-muted-foreground" />
                </div>
              }
            >
              <FormEngine
                collection={targetCol}
                fields={targetSchema.fields}
                defaultValues={drawerDefaultValues}
                documentId={activeDocId || undefined}
                onSubmit={handleDrawerSubmit}
                submitLabel="Save changes"
              />
            </Suspense>
          ) : (
            <p className="dy-text-sm dy-text-muted-foreground dy-py-8 dy-text-center">
              Schema for {targetCol} not found.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )

  if (isJoinLoading) {
    return (
      <div className="dy-p-6 dy-space-y-3 dy-bg-muted/10 dy-border dy-border-border/40 dy-rounded-xl dy-animate-pulse">
        <div className="dy-h-4 dy-w-1/4 dy-bg-muted/60 dy-rounded" />
        <div className="dy-h-8 dy-w-full dy-bg-muted/40 dy-rounded" />
        <div className="dy-h-8 dy-w-full dy-bg-muted/30 dy-rounded" />
      </div>
    )
  }

  if (!Array.isArray(effectiveData) || effectiveData.length === 0) {
    return (
      <div className="dy-p-6 dy-text-center dy-text-sm dy-text-muted-foreground/70 dy-bg-muted/20 dy-border dy-border-dashed dy-border-border dy-rounded-xl">
        {emptyText}
      </div>
    )
  }

  const normalizedItems = items.map(normalizeDetailItem)
  const Icon = options?.icon ? resolveAdminIcon(options.icon, Layers) : null

  // The table layout already shows each field's label as a column header, so
  // repeating it inside every cell is redundant. Hide it by default there
  // (list/cards have no header row, so their per-item labels still matter),
  // unless the schema author explicitly set hideLabel.
  const tableItems = normalizedItems.map((item) => {
    if (item.type !== "field" || item.options?.hideLabel !== undefined) return item
    return { ...item, options: { ...item.options, hideLabel: true } }
  })

  function resolveRowTitle(row: any, rowIdx: number): string | undefined {
    const titleKey = options?.useAsTitle || options?.titleField
    if (titleKey) {
      const val = getNestedValue(row, titleKey)
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val)
      }
    }
    if (typeof options?.title === "string") {
      if (options.title.includes("{index}")) {
        return options.title.replace("{index}", String(rowIdx + 1))
      }
      return `${options.title} #${rowIdx + 1}`
    }
    return undefined
  }

  if (layout === "cards") {
    const gridCols =
      options?.columns === 1
        ? "dy-grid-cols-1"
        : options?.columns === 2
          ? "dy-grid-cols-1 sm:dy-grid-cols-2"
          : options?.columns === 4
            ? "dy-grid-cols-1 sm:dy-grid-cols-2 lg:dy-grid-cols-4"
            : "dy-grid-cols-1 sm:dy-grid-cols-2 lg:dy-grid-cols-3"

    return (
      <>
      <div className={cn("dy-grid dy-gap-4 dy-w-full", gridCols)}>
        {effectiveData.map((row, rowIdx) => {
          const rowTitle = resolveRowTitle(row, rowIdx)

          return (
            <div
              key={rowIdx}
              onClick={isJoinField ? () => handleOpenEdit(row) : undefined}
              className={cn(
                "dy-p-4 dy-bg-card dy-border dy-border-border/60 dy-rounded-xl dy-shadow-sm dy-flex dy-flex-col dy-justify-between dy-transition-colors",
                isJoinField && "dy-cursor-pointer hover:dy-bg-muted/20"
              )}
            >
              <div>
                {rowTitle && (
                  <div className="dy-flex dy-items-center dy-justify-between dy-border-b dy-border-border/40 dy-pb-2.5 dy-mb-3.5">
                    <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
                      {Icon && <Icon className="dy-h-4 dy-w-4 dy-text-primary dy-shrink-0" />}
                      <span className="dy-font-semibold dy-text-sm dy-text-card-foreground dy-truncate">
                        {rowTitle}
                      </span>
                    </div>
                    <span className="dy-text-xs dy-text-muted-foreground/60 dy-font-mono dy-shrink-0 dy-ml-2">
                      #{rowIdx + 1}
                    </span>
                  </div>
                )}
                <div className="dy-grid dy-grid-cols-12 dy-gap-3">
                  {normalizedItems.map((item, itemIdx) => {
                    const span = (item as any)?.options?.span ?? 12
                    const spanClass = cardSpanClasses[span] || "dy-col-span-12"
                    return (
                      <div key={itemIdx} className={spanClass}>
                        {renderItemContent(item, row)}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {drawer}
      </>
    )
  }

  if (layout === "list") {
    return (
      <>
      <div className="dy-divide-y dy-divide-border/40 dy-border dy-border-border/60 dy-rounded-xl dy-overflow-hidden dy-bg-card dy-w-full">
        {effectiveData.map((row, rowIdx) => {
          const rowTitle = resolveRowTitle(row, rowIdx)

          return (
            <div
              key={rowIdx}
              onClick={isJoinField ? () => handleOpenEdit(row) : undefined}
              className={cn(
                "dy-p-4 hover:dy-bg-muted/20 dy-transition-colors dy-space-y-2.5",
                isJoinField && "dy-cursor-pointer"
              )}
            >
              {rowTitle && (
                <div className="dy-flex dy-items-center dy-justify-between dy-mb-1">
                  <div className="dy-flex dy-items-center dy-gap-2">
                    {Icon && <Icon className="dy-h-3.5 dy-w-3.5 dy-text-primary" />}
                    <span className="dy-font-semibold dy-text-sm dy-text-card-foreground">
                      {rowTitle}
                    </span>
                  </div>
                  <span className="dy-text-xs dy-text-muted-foreground/60 dy-font-mono">
                    #{rowIdx + 1}
                  </span>
                </div>
              )}
              <div className="dy-grid dy-grid-cols-12 dy-gap-2.5">
                {normalizedItems.map((item, itemIdx) => {
                  const span = (item as any)?.options?.span ?? 12
                  const spanClass = cardSpanClasses[span] || "dy-col-span-12"
                  return (
                    <div key={itemIdx} className={spanClass}>
                      {renderItemContent(item, row)}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {drawer}
      </>
    )
  }

  // Default: Table layout
  return (
    <>
    <div className="dy-w-full dy-border dy-border-border/60 dy-rounded-xl dy-overflow-x-auto dy-shadow-sm dy-bg-card">
      <table className="dy-w-full dy-text-sm dy-text-left">
        <thead className="dy-bg-muted/50 dy-text-xs dy-uppercase dy-text-muted-foreground dy-border-b dy-border-border/60">
          <tr>
            {normalizedItems.map((item, idx) => {
              const label =
                typeof item === "object" && "options" in item && (item.options as any)?.label
                  ? (item.options as any).label
                  : typeof item === "object" && "field" in item
                    ? item.field
                    : typeof item === "object" && "label" in item
                      ? item.label
                      : `Col ${idx + 1}`
              return (
                <th key={idx} className="dy-px-4 dy-py-3 dy-font-semibold dy-whitespace-nowrap">
                  {label}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="dy-divide-y dy-divide-border/40">
          {effectiveData.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={isJoinField ? () => handleOpenEdit(row) : undefined}
              className={cn(
                "hover:dy-bg-muted/20 dy-transition-colors",
                isJoinField && "dy-cursor-pointer"
              )}
            >
              {tableItems.map((item, colIdx) => (
                <td key={colIdx} className="dy-px-4 dy-py-3 dy-align-top">
                  {renderItemContent(item, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {drawer}
    </>
  )
}
