import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  RotateCcw,
  Trash2,
  Search,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

import { useDyrected } from "../../providers/dyrected-context"
import { PageHeader } from "../../components/ui/page-header"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { TrashViewTable } from "../trash/trash-view-table"
import { TrashPreviewSheet } from "../trash/trash-preview-sheet"
import { RestoreConflictDialog } from "../trash/restore-conflict-dialog"
import { EmptyTrashDialog } from "../trash/empty-trash-dialog"
import type { TrashConflict, TrashEntrySnapshot } from "../trash/trash-types"
import { AdminNotFound } from "../../components/layout/admin-not-found"

export function CollectionTrashPage() {
  const { slug } = useParams<{ slug: string }>()
  const { client, schemas } = useDyrected()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [previewEntry, setPreviewEntry] = useState<TrashEntrySnapshot | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [conflictEntry, setConflictEntry] = useState<TrashEntrySnapshot | null>(null)
  const [conflicts, setConflicts] = useState<TrashConflict[]>([])
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [isRestoringWithOverrides, setIsRestoringWithOverrides] = useState(false)
  const [isEmptyTrashOpen, setIsEmptyTrashOpen] = useState(false)
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = useState(false)
  const [permanentDeleteEntry, setPermanentDeleteEntry] = useState<TrashEntrySnapshot | null>(null)

  const schema = (schemas as any)?.collections?.find((c: any) => c.slug === slug)

  const isTrashEnabled = schema?.trash?.enabled !== false && !schema?.slug?.startsWith("__")
  const retentionDays = schema?.trash?.retentionDays
  const allowPermanentDelete = schema?.trash?.allowPermanentDelete !== false
  const canDelete = schema?.access?.delete !== false

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["collection-trash", slug, page, search],
    queryFn: async () => {
      if (!client || !slug) return { docs: [], total: 0, totalPages: 1 }
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "25")
      if (search.trim()) params.set("search", search.trim())
      return (client as any).request(`/api/collections/${slug}/trash?${params.toString()}`)
    },
    enabled: !!client && !!slug,
  })

  const entries: TrashEntrySnapshot[] = (data?.docs as TrashEntrySnapshot[]) ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  const refreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["collection-trash", slug] })
    await queryClient.invalidateQueries({ queryKey: ["trash-count", slug] })
  }

  const handleRestore = async (entry: TrashEntrySnapshot) => {
    if (!client || !slug) return
    setRestoringId(entry.id)
    try {
      const colClient = (client as any)?.collection?.(slug)
      if (colClient?.trash?.restore) {
        await colClient.trash.restore(entry.id)
      } else {
        await (client as any).request(`/api/collections/${slug}/trash/${encodeURIComponent(entry.id)}/restore`, {
          method: "POST",
        })
      }
      toast.success(`Restored "${entry.title || entry.docId}"`)
      setSelectedIds((prev) => prev.filter((id) => id !== entry.id))
      await refreshData()
    } catch (err: any) {
      if (err?.code === "restore-conflict" || err?.status === 409) {
        const conflictList: TrashConflict[] =
          err?.conflicts ||
          err?.data?.conflicts ||
          [{ field: "id", value: entry.docId }]
        setConflictEntry(entry)
        setConflicts(conflictList)
        setConflictDialogOpen(true)
      } else {
        toast.error("Failed to restore document", { description: err.message })
      }
    } finally {
      setRestoringId(null)
    }
  }

  const handleRestoreWithOverrides = async (overrides: Record<string, unknown>) => {
    if (!client || !slug || !conflictEntry) return
    setIsRestoringWithOverrides(true)
    try {
      const colClient = (client as any)?.collection?.(slug)
      if (colClient?.trash?.restore) {
        await colClient.trash.restore(conflictEntry.id, { overrides })
      } else {
        await (client as any).request(
          `/api/collections/${slug}/trash/${encodeURIComponent(conflictEntry.id)}/restore`,
          {
            method: "POST",
            body: JSON.stringify({ overrides }),
          },
        )
      }
      toast.success(`Restored "${conflictEntry.title || conflictEntry.docId}" with updated values`)
      setConflictDialogOpen(false)
      setSelectedIds((prev) => prev.filter((id) => id !== conflictEntry.id))
      await refreshData()
    } catch (err: any) {
      toast.error("Restore failed", { description: err.message })
    } finally {
      setIsRestoringWithOverrides(false)
    }
  }

  const handleKeep = async (entry: TrashEntrySnapshot, keep: boolean) => {
    if (!client || !slug) return
    try {
      const colClient = (client as any)?.collection?.(slug)
      if (colClient?.trash?.keep) {
        await colClient.trash.keep(entry.id, keep)
      } else {
        await (client as any).request(`/api/collections/${slug}/trash/${encodeURIComponent(entry.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ keep }),
        })
      }
      toast.success(keep ? "Exempted from automatic purge" : "Resumed retention countdown")
      await refreshData()
    } catch (err: any) {
      toast.error("Failed to update retention status", { description: err.message })
    }
  }

  const handleDeleteForever = (entry: TrashEntrySnapshot) => {
    setPermanentDeleteEntry(entry)
    setIsPermanentDeleteDialogOpen(true)
  }

  const confirmPermanentDelete = async () => {
    if (!client || !slug || !permanentDeleteEntry) return
    try {
      const colClient = (client as any)?.collection?.(slug)
      if (colClient?.trash?.purge) {
        await colClient.trash.purge(permanentDeleteEntry.id)
      } else {
        await (client as any).request(
          `/api/collections/${slug}/trash/${encodeURIComponent(permanentDeleteEntry.id)}`,
          {
            method: "DELETE",
          },
        )
      }
      toast.success("Document permanently deleted")
      setSelectedIds((prev) => prev.filter((id) => id !== permanentDeleteEntry.id))
      setIsPermanentDeleteDialogOpen(false)
      setPermanentDeleteEntry(null)
      await refreshData()
    } catch (err: any) {
      toast.error("Failed to permanently delete", { description: err.message })
    }
  }

  const handleRestoreSelected = async () => {
    if (!client || !slug || selectedIds.length === 0) return
    try {
      const colClient = (client as any)?.collection?.(slug)
      if (colClient?.trash?.restoreMany) {
        await colClient.trash.restoreMany(selectedIds)
      } else {
        await (client as any).request(`/api/collections/${slug}/trash/restore-many`, {
          method: "POST",
          body: JSON.stringify({ trashIds: selectedIds }),
        })
      }
      toast.success(`Restored ${selectedIds.length} document${selectedIds.length === 1 ? "" : "s"}`)
      setSelectedIds([])
      await refreshData()
    } catch (err: any) {
      toast.error("Failed to restore selected documents", { description: err.message })
    }
  }

  const handleDeleteSelectedForever = async () => {
    if (!client || !slug || selectedIds.length === 0) return
    try {
      for (const id of selectedIds) {
        const colClient = (client as any)?.collection?.(slug)
        if (colClient?.trash?.purge) {
          await colClient.trash.purge(id)
        } else {
          await (client as any).request(`/api/collections/${slug}/trash/${encodeURIComponent(id)}`, {
            method: "DELETE",
          })
        }
      }
      toast.success(`Permanently deleted ${selectedIds.length} document${selectedIds.length === 1 ? "" : "s"}`)
      setSelectedIds([])
      await refreshData()
    } catch (err: any) {
      toast.error("Failed to delete selected documents", { description: err.message })
    }
  }

  const handleEmptyTrash = async () => {
    if (!client || !slug) return
    try {
      const colClient = (client as any)?.collection?.(slug)
      if (colClient?.trash?.empty) {
        await colClient.trash.empty(slug)
      } else {
        await (client as any).request(`/api/collections/${slug}/trash?confirm=${encodeURIComponent(slug)}`, {
          method: "DELETE",
        })
      }
      toast.success("Trash emptied successfully")
      setSelectedIds([])
      await refreshData()
    } catch (err: any) {
      toast.error("Failed to empty trash", { description: err.message })
    }
  }

  if (!schema && !isLoading) {
    return <AdminNotFound title="Collection not found" description={`Could not find collection "${slug}"`} />
  }

  const collectionLabel = schema?.labels?.plural || schema?.labels?.singular || slug

  if (schema && !isTrashEnabled) {
    return (
      <AdminNotFound
        title="Trash is disabled"
        description={`Trash and retention are disabled for collection "${collectionLabel}". Deleted items are permanently removed immediately.`}
      />
    )
  }

  return (
    <div className="dy-space-y-6">
      <div className="dy-flex dy-items-center dy-gap-2">
        <Button asChild variant="ghost" size="sm" className="dy-gap-1.5 dy-text-xs -dy-ml-2">
          <Link to={`/collections/${slug}`}>
            <ArrowLeft className="dy-h-3.5 dy-w-3.5" />
            <span>Back to {collectionLabel}</span>
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`${collectionLabel} Trash`}
        icon={Trash2}
        description={
          retentionDays !== undefined && retentionDays !== null
            ? `Items in trash are recoverable for ${retentionDays} days before permanent deletion.`
            : "Items remain in the trash until manually emptied."
        }
      >
        <div className="dy-flex dy-items-center dy-gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="dy-h-8 dy-gap-1.5 dy-text-xs"
            title="Refresh"
          >
            <RefreshCw className={isFetching ? "dy-h-3.5 dy-w-3.5 dy-animate-spin" : "dy-h-3.5 dy-w-3.5"} />
            <span className="dy-hidden sm:dy-inline">Refresh</span>
          </Button>

          {canDelete && total > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEmptyTrashOpen(true)}
              className="dy-h-8 dy-gap-1.5 dy-text-xs dy-text-destructive hover:dy-bg-destructive/10"
            >
              <Trash2 className="dy-h-3.5 dy-w-3.5" />
              <span>Empty trash</span>
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Toolbar / Search & Bulk Actions */}
      <div className="dy-flex dy-flex-col sm:dy-flex-row sm:dy-items-center sm:dy-justify-between dy-gap-3">
        <div className="dy-relative dy-w-full sm:dy-w-72">
          <Search className="dy-absolute dy-left-2.5 dy-top-2.5 dy-h-4 dy-w-4 dy-text-muted-foreground" />
          <Input
            placeholder="Search trash by title or ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="dy-h-9 dy-pl-9 dy-text-xs"
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="dy-flex dy-items-center dy-gap-2 dy-p-1 dy-bg-muted/40 dy-rounded-md dy-border dy-border-border/60">
            <span className="dy-text-xs dy-font-medium dy-px-2 text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRestoreSelected}
              className="dy-h-7 dy-gap-1.5 dy-px-2.5 dy-text-xs"
            >
              <RotateCcw className="dy-h-3.5 dy-w-3.5" />
              <span>Restore selected</span>
            </Button>
            {allowPermanentDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteSelectedForever}
                className="dy-h-7 dy-gap-1.5 dy-px-2.5 dy-text-xs"
              >
                <Trash2 className="dy-h-3.5 dy-w-3.5" />
                <span>Delete forever</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <TrashViewTable
        entries={entries}
        isLoading={isLoading}
        isGlobal={false}
        collections={schemas?.collections}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRestore={handleRestore}
        onKeep={handleKeep}
        onDeleteForever={handleDeleteForever}
        onPreview={(entry) => {
          setPreviewEntry(entry)
          setPreviewOpen(true)
        }}
        allowPermanentDelete={allowPermanentDelete}
        restoringId={restoringId}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="dy-flex dy-items-center dy-justify-between dy-pt-2">
          <span className="dy-text-xs dy-text-muted-foreground">
            Page {page} of {totalPages} ({total} items total)
          </span>
          <div className="dy-flex dy-items-center dy-gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="dy-h-8 dy-text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="dy-h-8 dy-text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals and Sheets */}
      <TrashPreviewSheet
        entry={previewEntry}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onRestore={handleRestore}
        collections={schemas?.collections}
      />

      <RestoreConflictDialog
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
        entry={conflictEntry}
        conflicts={conflicts}
        onConfirmOverrides={handleRestoreWithOverrides}
        isPending={isRestoringWithOverrides}
      />

      <EmptyTrashDialog
        open={isEmptyTrashOpen}
        onOpenChange={setIsEmptyTrashOpen}
        expectedValue={slug || ""}
        title={`Empty ${collectionLabel} Trash?`}
        description={`All ${total} trashed documents in ${collectionLabel} will be permanently destroyed.`}
        onConfirm={handleEmptyTrash}
      />

      {/* Single item permanent delete confirmation */}
      {permanentDeleteEntry && (
        <EmptyTrashDialog
          open={isPermanentDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsPermanentDeleteDialogOpen(open)
            if (!open) setPermanentDeleteEntry(null)
          }}
          expectedValue={permanentDeleteEntry.docId}
          title="Delete document forever?"
          description={`Document "${permanentDeleteEntry.title || permanentDeleteEntry.docId}" will be permanently removed.`}
          onConfirm={confirmPermanentDelete}
        />
      )}
    </div>
  )
}
