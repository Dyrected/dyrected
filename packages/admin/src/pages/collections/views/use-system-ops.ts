import { useCallback, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

import { useDyrected } from "../../../providers/dyrected-context"
import { resolveDocumentTitle } from "../../../lib/document-title"
import { buildCsv, csvColumnsForSchema, downloadCsv } from "../../../lib/csv"
import type { SystemOperation } from "./types"

export interface DeleteDialogState {
  open: boolean
  ids: string[]
  title: string
  description: string
  requiresTypedConfirmation: boolean
  expectedValue: string
  mode: "single" | "bulk"
}

const IDLE_DELETE_STATE: DeleteDialogState = {
  open: false,
  ids: [],
  title: "",
  description: "",
  requiresTypedConfirmation: false,
  expectedValue: "",
  mode: "single",
}

/** Fields stripped when duplicating a document. */
const DUPLICATE_OMIT_FIELDS = new Set(["id", "createdAt", "updatedAt", "_workflow"])

interface UseSystemOpsOptions {
  slug: string
  schema: any
  schemas: any
  /** Documents currently loaded for the view — used for exports/duplication. */
  data: Record<string, any>[]
}

/**
 * Client-side implementation of the built-in view/edit/delete/duplicate/
 * export operations shared by every operational layout.
 *
 * Delete keeps list-view parity: self-deletion is blocked on auth collections
 * and single deletes there require typing the document title.
 */
export function useSystemOps({ slug, schema, schemas, data }: UseSystemOpsOptions) {
  const { client, user } = useDyrected()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(IDLE_DELETE_STATE)
  const [confirmationValue, setConfirmationValue] = useState("")

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
    await queryClient.invalidateQueries({ queryKey: ["operational-view-metrics", slug] })
  }, [queryClient, slug])

  const findDoc = useCallback(
    (id: string) => data.find((doc) => String(doc.id) === id),
    [data],
  )

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!client) throw new Error("Dyrected client unavailable")
      const collection = client.collection(slug)
      if (ids.length === 1) {
        await collection.delete(ids[0])
      } else {
        await collection.deleteMany(ids)
      }
      return ids.length
    },
    onSuccess: async (count) => {
      await invalidate()
      toast.success(count === 1 ? "Entry deleted successfully" : `Deleted ${count} entries`)
    },
    onError: (error: Error) => {
      toast.error("Failed to delete entries", { description: error.message })
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: async ({ sourceId }: { sourceId: string }) => {
      if (!client) throw new Error("Dyrected client unavailable")
      const doc =
        findDoc(sourceId) ??
        (await client.findOne(slug, sourceId, { depth: 1 }))
      const copy: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(doc)) {
        if (!DUPLICATE_OMIT_FIELDS.has(key)) copy[key] = value
      }
      return client.collection(slug).create(copy)
    },
    onSuccess: async () => {
      await invalidate()
      toast.success("Entry duplicated")
    },
    onError: (error: Error) => {
      toast.error("Failed to duplicate entry", { description: error.message })
    },
  })

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog(IDLE_DELETE_STATE)
    setConfirmationValue("")
  }, [])

  const openDeleteDialog = useCallback((ids: string[], mode: "single" | "bulk") => {
    if (!schema) return
    const cleanIds =
      schema.auth && mode === "bulk" && user
        ? ids.filter((id) => id !== String(user.id))
        : ids
    if (cleanIds.length === 0) {
      toast.error("Action not allowed", { description: "You cannot delete your own account." })
      return
    }
    if (mode === "single" && schema.auth && user && cleanIds[0] === String(user.id)) {
      toast.error("Action not allowed", { description: "You cannot delete your own account." })
      return
    }

    const expectedValue =
      schema.auth && cleanIds[0]
        ? resolveDocumentTitle({
          entry: findDoc(cleanIds[0]),
          collection: schema,
          collections: schemas?.collections,
        })
        : ""

    setDeleteDialog({
      open: true,
      ids: cleanIds,
      title:
        mode === "single"
          ? "Delete this entry?"
          : `Delete ${cleanIds.length} entr${cleanIds.length === 1 ? "y" : "ies"}?`,
      description: schema.auth
        ? "This user will be permanently removed. To prevent accidental deletion, confirm by typing the exact name below."
        : mode === "single"
          ? "This entry will be permanently deleted. This action cannot be undone."
          : "These entries will be permanently deleted. This action cannot be undone.",
      requiresTypedConfirmation: !!(schema.auth && expectedValue),
      expectedValue,
      mode,
    })
    setConfirmationValue("")
  }, [schema, schemas, user, findDoc])

  const confirmDelete = useCallback(() => {
    if (deleteDialog.ids.length === 0) return
    deleteMutation.mutate(deleteDialog.ids, { onSuccess: closeDeleteDialog })
  }, [deleteDialog.ids, deleteMutation, closeDeleteDialog])

  const exportDocs = useCallback(
    (docs: Record<string, unknown>[], filenameSuffix = "") => {
      if (!schema || !client) return
      const columns = csvColumnsForSchema(schema)
      const baseUrl = typeof client.getBaseUrl === "function" ? client.getBaseUrl() : ""
      downloadCsv(buildCsv(docs, columns, baseUrl), `${slug}-export${filenameSuffix}.csv`)
      toast.success(`Exported ${docs.length} ${docs.length === 1 ? "entry" : "entries"}`)
    },
    [client, schema, slug],
  )

  /** Entry point wired into the shared action pipeline. */
  const runSystemAction = useCallback(
    (operation: SystemOperation, ids: string[]) => {
      if (ids.length === 0) return
      switch (operation) {
        case "view":
          navigate(`/collections/${slug}/${ids[0]}`)
          break
        case "edit":
          navigate(`/collections/${slug}/${ids[0]}/edit`)
          break
        case "duplicate":
          void duplicateMutation.mutateAsync({ sourceId: ids[0] })
          break
        case "delete":
          openDeleteDialog(ids, ids.length > 1 ? "bulk" : "single")
          break
        case "export-selected": {
          const docs = ids
            .map((id) => findDoc(id))
            .filter((doc): doc is Record<string, any> => !!doc)
          exportDocs(docs, "-selected")
          break
        }
      }
    },
    [navigate, slug, duplicateMutation, openDeleteDialog, exportDocs, findDoc],
  )

  /** Exports a full document set (all records or the current filtered set). */
  const exportAll = useCallback(
    async (docs?: Record<string, any>[], args?: { where?: Record<string, unknown>; sort?: string }) => {
      if (!client) return
      try {
        const allDocs = docs ?? await fetchAll(client, slug, args)
        exportDocs(allDocs)
      } catch (error: unknown) {
        toast.error("Export failed", {
          description: error instanceof Error ? error.message : String(error),
        })
      }
    },
    [client, exportDocs, slug],
  )

  const isDeleting = deleteMutation.isPending

  return useMemo(
    () => ({
      runSystemAction,
      exportAll,
      deleteDialog,
      confirmationValue,
      setConfirmationValue,
      closeDeleteDialog,
      confirmDelete,
      isDeleting,
      isDuplicating: duplicateMutation.isPending,
    }),
    [runSystemAction, exportAll, deleteDialog, confirmationValue, closeDeleteDialog, confirmDelete, isDeleting, duplicateMutation.isPending],
  )
}

async function fetchAll(
  client: any,
  slug: string,
  args?: { where?: Record<string, unknown>; sort?: string },
): Promise<Record<string, unknown>[]> {
  const docs: Record<string, unknown>[] = []
  let page = 1
  let totalPages = 1
  while (page <= totalPages) {
    // `collection().find()` returns a thenable query builder.
    const response = await client.collection(slug).find({ page, limit: 20, depth: 1, ...args })
    docs.push(...(response?.docs ?? []))
    totalPages = response?.totalPages ?? 1
    page += 1
  }
  return docs
}
