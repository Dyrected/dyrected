import { useState, useMemo, lazy, Suspense } from "react"
import { useWatch } from "react-hook-form"
import { useDyrected } from "../../../providers/dyrected-context"
import { useNavigate, useParams } from "react-router-dom"
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ExternalLink,
  FileText,
  Plus,
  Loader2,
  LayoutList,
  Table as TableIcon,
  Maximize2,
  Trash2,
} from "lucide-react"
import { Button } from "../../ui/button"
import { cn } from "../../../lib/utils"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../ui/table"
import { RenderCell } from "../../ui/render-cell"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog"
import { useIsMobile } from "../../../hooks/use-mobile"
import { toast } from "sonner"
import type { FieldSchema } from "../form-engine"

const FormEngine = lazy(async () => {
  const module = await import("../form-engine")
  return { default: module.FormEngine }
})

const PAGE_SIZE = 10

interface JoinFieldProps {
  schema: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
}

export function JoinField({ schema, control }: JoinFieldProps) {
  const { client, schemas } = useDyrected()
  const { id: docId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()

  const targetCollection: string = schema.collection
  const onField: string = schema.on

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targetSchema = schemas?.collections?.find((c: any) => c.slug === targetCollection)
  const displayField: string = targetSchema?.admin?.useAsTitle || "title"
  const singularLabel = targetSchema?.labels?.singular || targetCollection
  const pluralLabel = targetSchema?.labels?.plural || targetCollection

  const defaultLayout = (schema.admin?.layout === "table" ? "table" : "list") as "list" | "table"
  const [layout, setLayout] = useState<"list" | "table">(defaultLayout)

  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Use the data already populated by the backend if present
  const joinData = useWatch({ control, name: schema.name })

  const {
    data: infiniteData,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["collection", targetCollection, "join", onField, docId ?? ""],
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === "number" ? pageParam : 1
      if (!client) {
        return {
          docs: joinData?.docs || [],
          total: joinData?.total || joinData?.docs?.length || 0,
          totalPages: 1,
          page: 1,
          hasNextPage: false,
        }
      }
      return client
        .collection(targetCollection)
        .find({
          where: { [onField]: { equals: docId } },
          limit: PAGE_SIZE,
          page,
        })
        .exec()
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: { docs?: unknown[]; totalPages?: number; page?: number; hasNextPage?: boolean }) => {
      if (lastPage?.hasNextPage) return (lastPage.page ?? 1) + 1
      if (
        lastPage?.docs?.length === PAGE_SIZE &&
        lastPage?.totalPages &&
        (lastPage.page ?? 1) < lastPage.totalPages
      ) {
        return (lastPage.page ?? 1) + 1
      }
      return undefined
    },
    enabled: Boolean(client && docId && targetCollection),
    staleTime: 10_000,
  })

  // Fetch full document data when editing an active document in the drawer
  const { data: activeDocData, isLoading: isLoadingActiveDoc } = useQuery({
    queryKey: ["collection", targetCollection, "detail", activeDocId],
    queryFn: async () => {
      if (!client || !activeDocId) return null
      return client.collection(targetCollection).findOne(activeDocId)
    },
    enabled: Boolean(client && activeDocId && !isCreatingNew),
    staleTime: 10_000,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queriedDocs = infiniteData?.pages?.flatMap((page: any) => page?.docs || [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: Array<Record<string, any>> =
    queriedDocs && queriedDocs.length > 0
      ? queriedDocs
      : (joinData?.docs || [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstPage: any = infiniteData?.pages?.[0]
  const totalCount =
    firstPage?.totalDocs ??
    firstPage?.total ??
    joinData?.totalDocs ??
    joinData?.total ??
    items.length

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getLabel = (item: any) =>
    item[displayField] || item.name || item.slug || item.id

  const showCreateButton = schema.admin?.showCreateButton !== false
  const showViewButton = schema.admin?.showViewButton !== false

  const handleOpenCreate = () => {
    setIsCreatingNew(true)
    setActiveDocId(null)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleOpenEdit = (item: Record<string, any>) => {
    if (item.id != null) {
      setActiveDocId(String(item.id))
      setIsCreatingNew(false)
    }
  }

  const handleCloseDrawer = () => {
    setActiveDocId(null)
    setIsCreatingNew(false)
  }

  const handleViewAll = () => {
    const params = new URLSearchParams({
      where: JSON.stringify({
        [onField]: { equals: docId },
      }),
    })
    navigate(`/collections/${targetCollection}?${params.toString()}`)
  }

  const handleNavigateFullEdit = () => {
    if (isCreatingNew) {
      const params = new URLSearchParams({ [onField]: docId! })
      navigate(`/collections/${targetCollection}/new?${params.toString()}`)
    } else if (activeDocId) {
      navigate(`/collections/${targetCollection}/${activeDocId}/edit`)
    }
  }

  const handleDrawerSubmit = async (formData: Record<string, unknown>) => {
    if (!client) return
    try {
      if (isCreatingNew) {
        await client.collection(targetCollection).create({
          ...formData,
          [onField]: docId,
        })
        toast.success(`${singularLabel} created`)
      } else if (activeDocId) {
        await client.collection(targetCollection).update(activeDocId, formData)
        toast.success(`${singularLabel} updated`)
      }
      handleCloseDrawer()
      queryClient.invalidateQueries({ queryKey: ["collection", targetCollection] })
    } catch (err: unknown) {
      console.error(`Failed to save ${singularLabel}:`, err)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((err as any)?.message || `Failed to save ${singularLabel}`)
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!client) return
    setIsDeleting(true)
    try {
      await client.collection(targetCollection).delete(id)
      toast.success(`${singularLabel} deleted`)
      if (activeDocId === id) {
        handleCloseDrawer()
      }
      setDeleteTargetId(null)
      queryClient.invalidateQueries({ queryKey: ["collection", targetCollection] })
    } catch (err: unknown) {
      console.error(`Failed to delete ${singularLabel}:`, err)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((err as any)?.message || `Failed to delete ${singularLabel}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const adminColumns = schema.admin?.columns ?? targetSchema?.admin?.defaultColumns
  const targetFields = targetSchema?.fields

  // Derive columns for Table layout
  const tableColumns = useMemo<FieldSchema[]>(() => {
    if (Array.isArray(adminColumns) && adminColumns.length > 0) {
      return adminColumns
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((colName: string) => targetFields?.find((f: any) => f.name === colName))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((col: any): col is FieldSchema => Boolean(col))
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allFields = targetFields || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visible = allFields.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) =>
        !f.admin?.hidden &&
        f.type !== "password" &&
        f.type !== "blocks" &&
        f.type !== "join" &&
        f.type !== "json"
    )
    return visible.slice(0, 4)
  }, [adminColumns, targetFields])

  // Derive secondary preview columns for List layout (e.g. status, date)
  const secondaryListColumns = useMemo<FieldSchema[]>(() => {
    return tableColumns.filter((col) => col.name !== displayField).slice(0, 2)
  }, [tableColumns, displayField])

  if (!docId) {
    return (
      <p className="dy-text-xs dy-text-muted-foreground/60 dy-italic dy-py-2">
        Save this document first to view related {targetCollection}.
      </p>
    )
  }

  const isDrawerOpen = Boolean(activeDocId || isCreatingNew)
  const activeFallbackItem = activeDocId ? items.find((i) => String(i.id) === activeDocId) : undefined
  const drawerDefaultValues = isCreatingNew
    ? { [onField]: docId }
    : ((activeDocData as Record<string, unknown>) || activeFallbackItem || { id: activeDocId })

  return (
    <div className="dy-space-y-3">
      {/* Header toolbar with count and Layout Switcher */}
      {items.length > 0 && (
        <div className="dy-flex dy-items-center dy-justify-between dy-px-1">
          <span className="dy-text-xs dy-font-semibold dy-text-muted-foreground">
            {totalCount} {totalCount === 1 ? singularLabel : pluralLabel}
          </span>
          <div className="dy-flex dy-items-center dy-gap-1 dy-bg-muted/40 dy-p-0.5 dy-rounded-lg dy-border dy-border-border/40">
            <button
              type="button"
              aria-label="List view"
              onClick={() => setLayout("list")}
              className={cn(
                "dy-p-1.5 dy-rounded-md dy-text-xs dy-transition-all",
                layout === "list"
                  ? "dy-bg-background dy-text-foreground dy-shadow-xs"
                  : "dy-text-muted-foreground hover:dy-text-foreground"
              )}
            >
              <LayoutList className="dy-w-3.5 dy-h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Table view"
              onClick={() => setLayout("table")}
              className={cn(
                "dy-p-1.5 dy-rounded-md dy-text-xs dy-transition-all",
                layout === "table"
                  ? "dy-bg-background dy-text-foreground dy-shadow-xs"
                  : "dy-text-muted-foreground hover:dy-text-foreground"
              )}
            >
              <TableIcon className="dy-w-3.5 dy-h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Content Rendering: List vs Table */}
      {items.length > 0 ? (
        layout === "table" ? (
          <div className="dy-rounded-lg dy-border dy-border-border/40 dy-overflow-hidden dy-bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:dy-bg-transparent">
                  {tableColumns.map((col: FieldSchema) => (
                    <TableHead key={col.name} className="dy-text-xs dy-h-9 dy-font-semibold">
                      {col.label || col.name}
                    </TableHead>
                  ))}
                  <TableHead className="dy-w-20 dy-text-right dy-pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={() => handleOpenEdit(item)}
                    className="dy-cursor-pointer hover:dy-bg-muted/40 dy-transition-colors group"
                  >
                    {tableColumns.map((col: FieldSchema) => (
                      <TableCell key={col.name} className="dy-py-2.5 dy-text-xs">
                        <RenderCell
                          value={item[col.name || ""]}
                          field={col}
                          client={client}
                          schemas={schemas}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="dy-py-2.5 dy-text-right dy-pr-4" onClick={(e) => e.stopPropagation()}>
                      <div className="dy-flex dy-items-center dy-justify-end dy-gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title={`Delete ${singularLabel}`}
                          onClick={() => setDeleteTargetId(String(item.id))}
                          className="dy-h-7 dy-w-7 dy-text-muted-foreground/50 hover:dy-text-destructive hover:dy-bg-destructive/10 dy-transition-colors"
                        >
                          <Trash2 className="dy-h-3.5 dy-w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title={`Edit ${singularLabel}`}
                          onClick={() => handleOpenEdit(item)}
                          className="dy-h-7 dy-w-7 dy-text-muted-foreground/50 hover:dy-text-foreground hover:dy-bg-muted dy-transition-colors"
                        >
                          <ExternalLink className="dy-h-3.5 dy-w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="dy-divide-y dy-divide-border/30 dy-rounded-lg dy-border dy-border-border/40 dy-overflow-hidden dy-bg-card">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenEdit(item)}
                className="dy-flex dy-items-center dy-justify-between dy-w-full dy-px-4 dy-py-2.5 dy-text-sm hover:dy-bg-muted/30 dy-transition-colors dy-text-left dy-cursor-pointer group"
              >
                <div className="dy-flex dy-items-center dy-gap-3 dy-min-w-0 dy-flex-1">
                  <FileText className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground/40 dy-shrink-0" />
                  <span className="dy-text-foreground/90 dy-font-medium dy-truncate">{getLabel(item)}</span>
                </div>

                {/* Secondary RenderCell previews (e.g. status badge, date) */}
                {secondaryListColumns.length > 0 && (
                  <div className="dy-flex dy-items-center dy-gap-2 dy-mr-3 dy-shrink-0">
                    {secondaryListColumns.map((col) => (
                      <div key={col.name} className="dy-text-xs">
                        <RenderCell
                          value={item[col.name || ""]}
                          field={col}
                          client={client}
                          schemas={schemas}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="dy-flex dy-items-center dy-gap-1 dy-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={`Delete ${singularLabel}`}
                    onClick={() => setDeleteTargetId(String(item.id))}
                    className="dy-h-7 dy-w-7 dy-text-muted-foreground/40 hover:dy-text-destructive hover:dy-bg-destructive/10 dy-transition-colors"
                  >
                    <Trash2 className="dy-h-3.5 dy-w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={`Edit ${singularLabel}`}
                    onClick={() => handleOpenEdit(item)}
                    className="dy-h-7 dy-w-7 dy-text-muted-foreground/40 hover:dy-text-foreground hover:dy-bg-muted dy-transition-colors"
                  >
                    <ExternalLink className="dy-h-3 dy-w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="dy-rounded-lg dy-border dy-border-dashed dy-border-border/40 dy-bg-muted/5 dy-px-4 dy-py-6 dy-text-center">
          <p className="dy-text-xs dy-text-muted-foreground/60 dy-italic">
            No related {pluralLabel} found.
          </p>
        </div>
      )}

      {/* Infinite Scroll Trigger: Load More */}
      {hasNextPage && (
        <div className="dy-flex dy-justify-center dy-pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            className="dy-h-8 dy-text-xs dy-text-muted-foreground hover:dy-text-foreground"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="dy-w-3 dy-h-3 dy-mr-1.5 dy-animate-spin" />
                Loading more...
              </>
            ) : (
              `Load more (${items.length} of ${totalCount})`
            )}
          </Button>
        </div>
      )}

      {/* Action Buttons: View all / Create new */}
      {(showCreateButton || showViewButton) && (
        <div
          className={cn(
            "dy-flex dy-items-center dy-gap-3",
            showCreateButton && showViewButton
              ? "dy-justify-between"
              : showCreateButton
                ? "dy-justify-end"
                : "dy-justify-start"
          )}
        >
          {showViewButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="dy-h-8 dy-text-[11px] dy-font-semibold dy-rounded-lg dy-text-muted-foreground hover:dy-text-foreground hover:dy-bg-muted/60 dy-transition-all"
              onClick={handleViewAll}
            >
              <ExternalLink className="dy-w-3 dy-h-3 dy-mr-1.5" />
              View all
            </Button>
          )}

          {showCreateButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="dy-h-8 dy-text-[11px] dy-font-bold dy-rounded-lg dy-border-primary/20 hover:dy-bg-primary/5 hover:dy-text-primary dy-transition-all dy-shadow-xs"
              onClick={handleOpenCreate}
            >
              <Plus className="dy-w-3 dy-h-3 dy-mr-1.5" />
              Create new {singularLabel}
            </Button>
          )}
        </div>
      )}

      {/* Responsive In-Place Slideover (Right on Desktop, Bottom Sheet on Mobile) */}
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
                {isCreatingNew ? `Create new ${singularLabel}` : `Edit ${singularLabel}`}
              </SheetTitle>
              <div className="dy-flex dy-items-center dy-gap-1">
                {activeDocId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={`Delete ${singularLabel}`}
                    onClick={() => setDeleteTargetId(activeDocId)}
                    className="dy-h-7 dy-w-7 dy-text-muted-foreground/60 hover:dy-text-destructive hover:dy-bg-destructive/10"
                  >
                    <Trash2 className="dy-h-3.5 dy-w-3.5" />
                    <span className="dy-sr-only">Delete</span>
                  </Button>
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
            ) : targetSchema?.fields ? (
              <Suspense
                fallback={
                  <div className="dy-flex dy-items-center dy-justify-center dy-py-16">
                    <Loader2 className="dy-w-6 dy-h-6 dy-animate-spin dy-text-muted-foreground" />
                  </div>
                }
              >
                <FormEngine
                  collection={targetCollection}
                  fields={targetSchema.fields}
                  defaultValues={drawerDefaultValues}
                  documentId={activeDocId || undefined}
                  onSubmit={handleDrawerSubmit}
                  submitLabel={isCreatingNew ? "Create" : "Save changes"}
                />
              </Suspense>
            ) : (
              <p className="dy-text-sm dy-text-muted-foreground dy-py-8 dy-text-center">
                Schema for {targetCollection} not found.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:dy-max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {singularLabel}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {singularLabel.toLowerCase()}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="dy-flex dy-justify-end dy-gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTargetId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => deleteTargetId && handleDeleteItem(deleteTargetId)}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="dy-w-3.5 dy-h-3.5 dy-mr-1.5 dy-animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
