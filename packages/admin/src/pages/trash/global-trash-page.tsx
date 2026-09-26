import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Trash2,
  Search,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { useDyrected } from "../../providers/dyrected-context"
import { PageHeader } from "../../components/ui/page-header"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { TrashViewTable } from "./trash-view-table"
import { TrashPreviewSheet } from "./trash-preview-sheet"
import { RestoreConflictDialog } from "./restore-conflict-dialog"
import { EmptyTrashDialog } from "./empty-trash-dialog"
import type { TrashConflict, TrashEntrySnapshot } from "./trash-types"

export function GlobalTrashPage() {
  const { client, schemas } = useDyrected()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const [collectionFilter, setCollectionFilter] = useState<string>("all")
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
  const [warningDismissed, setWarningDismissed] = useState(false)

  const collections = schemas?.collections || []
  const purgeOverdue = Boolean(schemas?.adminHealth?.trashPurgeOverdue && !warningDismissed)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["global-trash", page, search, collectionFilter],
    queryFn: async () => {
      if (!client) return { docs: [], total: 0, totalPages: 1 }
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "25")
      if (search.trim()) params.set("search", search.trim())
      if (collectionFilter !== "all") params.set("collection", collectionFilter)
      return (client as any).request(`/api/trash?${params.toString()}`)
    },
    enabled: !!client,
  })

  const entries: TrashEntrySnapshot[] = (data?.docs as TrashEntrySnapshot[]) ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  const refreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["global-trash"] })
    await queryClient.invalidateQueries({ queryKey: ["trash-count"] })
  }

  const handleRestore = async (entry: TrashEntrySnapshot) => {
    if (!client) return
    setRestoringId(entry.id)
    try {
      if ((client as any)?.trash?.restore) {
        await (client as any).trash.restore(entry.id)
      } else {
        await (client as any).request(`/api/trash/${encodeURIComponent(entry.id)}/restore`, {
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
    if (!client || !conflictEntry) return
    setIsRestoringWithOverrides(true)
    try {
      if ((client as any)?.trash?.restore) {
        await (client as any).trash.restore(conflictEntry.id, { overrides })
      } else {
        await (client as any).request(
          `/api/trash/${encodeURIComponent(conflictEntry.id)}/restore`,
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
    if (!client) return
    try {
      if ((client as any)?.trash?.keep) {
        await (client as any).trash.keep(entry.id, keep)
      } else {
        await (client as any).request(`/api/trash/${encodeURIComponent(entry.id)}`, {
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
    if (!client || !permanentDeleteEntry) return
    try {
      if ((client as any)?.trash?.purge) {
        await (client as any).trash.purge(permanentDeleteEntry.id)
      } else {
        await (client as any).request(
          `/api/trash/${encodeURIComponent(permanentDeleteEntry.id)}`,
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
    if (!client || selectedIds.length === 0) return
    try {
      if ((client as any)?.trash?.restoreMany) {
        await (client as any).trash.restoreMany(selectedIds)
      } else {
        await (client as any).request(`/api/trash/restore-many`, {
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
    if (!client || selectedIds.length === 0) return
    try {
      for (const id of selectedIds) {
        if ((client as any)?.trash?.purge) {
          await (client as any).trash.purge(id)
        } else {
          await (client as any).request(`/api/trash/${encodeURIComponent(id)}`, {
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
    if (!client) return
    try {
      if (collectionFilter !== "all") {
        await (client as any).request(`/api/collections/${collectionFilter}/trash?confirm=${encodeURIComponent(collectionFilter)}`, {
          method: "DELETE",
        })
      } else {
        // Empty per collection
        for (const c of collections) {
          try {
            await (client as any).request(`/api/collections/${c.slug}/trash?confirm=${encodeURIComponent(c.slug)}`, {
              method: "DELETE",
            })
          } catch {
            // Ignore individual collection empty failure during global empty
          }
        }
      }
      toast.success("Trash emptied")
      setSelectedIds([])
      await refreshData()
    } catch (err: any) {
      toast.error("Failed to empty trash", { description: err.message })
    }
  }

  return (
    <div className="dy-space-y-6">
      <PageHeader
        title="Trash"
        icon={Trash2}
        description="Cross-collection view of all soft-deleted documents. Items can be restored or kept indefinitely."
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

          {total > 0 && (
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

      {/* Overdue purge health alert */}
      {purgeOverdue && (
        <div className="dy-flex dy-items-start dy-justify-between dy-rounded-md dy-border dy-border-amber-500/30 dy-bg-amber-500/10 dy-p-3.5 dy-text-amber-800 dark:dy-text-amber-300">
          <div className="dy-flex dy-items-start dy-gap-2.5">
            <AlertTriangle className="dy-h-5 dy-w-5 dy-text-amber-600 dark:dy-text-amber-400 dy-shrink-0 dy-mt-0.5" />
            <div className="dy-space-y-0.5">
              <h4 className="dy-text-xs dy-font-semibold">Trash purge task is overdue</h4>
              <p className="dy-text-xs dy-text-amber-700 dark:dy-text-amber-400">
                Documents scheduled for permanent purge have not been deleted. Ensure your background
                task runner or cron schedule is running.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWarningDismissed(true)}
            className="dy-text-muted-foreground hover:dy-text-foreground dy-p-1"
            title="Dismiss warning"
          >
            <X className="dy-h-4 dy-w-4" />
          </button>
        </div>
      )}

      {/* Filter and search bar */}
      <div className="dy-flex dy-flex-col sm:dy-flex-row sm:dy-items-center sm:dy-justify-between dy-gap-3">
        <div className="dy-flex dy-flex-col sm:dy-flex-row sm:dy-items-center dy-gap-2.5 dy-w-full sm:dy-w-auto">
          <div className="dy-relative dy-w-full sm:dy-w-64">
            <Search className="dy-absolute dy-left-2.5 dy-top-2.5 dy-h-4 dy-w-4 dy-text-muted-foreground" />
            <Input
              placeholder="Search all trashed items…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="dy-h-9 dy-pl-9 dy-text-xs"
            />
          </div>

          <div className="dy-w-full sm:dy-w-48">
            <Select
              value={collectionFilter}
              onValueChange={(val) => {
                setCollectionFilter(val)
                setPage(1)
              }}
            >
              <SelectTrigger className="dy-h-9 dy-text-xs">
                <SelectValue placeholder="All collections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All collections</SelectItem>
                {collections.map((col) => (
                  <SelectItem key={col.slug} value={col.slug}>
                    {col.labels?.plural || col.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteSelectedForever}
              className="dy-h-7 dy-gap-1.5 dy-px-2.5 dy-text-xs"
            >
              <Trash2 className="dy-h-3.5 dy-w-3.5" />
              <span>Delete forever</span>
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <TrashViewTable
        entries={entries}
        isLoading={isLoading}
        isGlobal={true}
        collections={collections}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRestore={handleRestore}
        onKeep={handleKeep}
        onDeleteForever={handleDeleteForever}
        onPreview={(entry) => {
          setPreviewEntry(entry)
          setPreviewOpen(true)
        }}
        allowPermanentDelete={true}
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
        expectedValue={collectionFilter !== "all" ? collectionFilter : "trash"}
        title={collectionFilter !== "all" ? `Empty ${collectionFilter} Trash?` : "Empty Entire Trash?"}
        description={
          collectionFilter !== "all"
            ? `All trashed documents in ${collectionFilter} will be permanently destroyed.`
            : `All ${total} trashed documents across all collections will be permanently destroyed.`
        }
        onConfirm={handleEmptyTrash}
      />

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
