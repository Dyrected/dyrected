/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface DrawerPipelineContext {
  client: any
  queryClient: QueryClient
  targetCollection: string
  parentCollection?: string
  parentDocId?: string
  parentFieldName?: string
  onField?: string
  singularLabel?: string
  onSuccess?: (doc: Record<string, unknown>, mode: "create" | "update") => void | Promise<void>
}

export interface InvalidateParentOptions {
  queryClient: QueryClient
  parentCollection?: string
  parentDocId?: string
  targetCollection?: string
  onField?: string
}

/**
 * Invalidates all parent document queries and join relation queries.
 *
 * Covers:
 * - Parent detail/entry queries (both plural "collections" and singular "collection")
 * - Parent collection-level list/operational-view queries
 * - Specific relation join queries for the parent doc
 * - Generic join query prefixes
 */
export async function invalidateParentAndJoinQueries({
  queryClient,
  parentCollection,
  parentDocId,
  targetCollection,
  onField,
}: InvalidateParentOptions): Promise<void> {
  const promises: Promise<unknown>[] = []

  // 1. Join queries for this relation
  if (targetCollection) {
    if (parentDocId && onField) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: ["collection", targetCollection, "join", onField, parentDocId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["join", targetCollection, onField, parentDocId],
        }),
      )
    }
    promises.push(
      queryClient.invalidateQueries({ queryKey: ["collection", targetCollection, "join"] }),
      queryClient.invalidateQueries({ queryKey: ["join", targetCollection] }),
    )
  }

  // 2. Parent collection & document queries
  if (parentCollection) {
    if (parentDocId) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: ["collections", parentCollection, "detail", parentDocId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["collections", parentCollection, "entry", parentDocId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["collection", parentCollection, "detail", parentDocId],
        }),
      )
    }
    promises.push(
      queryClient.invalidateQueries({ queryKey: ["collections", parentCollection] }),
      queryClient.invalidateQueries({ queryKey: ["collection", parentCollection] }),
      queryClient.invalidateQueries({ queryKey: ["operational-view", parentCollection] }),
    )
  }

  await Promise.all(promises)
}

/**
 * Optimistically updates the parent cached join lists so UI renders instantly
 * before background network revalidation completes.
 */
function updateParentJoinCachesOptimistically({
  queryClient,
  targetCollection,
  parentCollection,
  parentDocId,
  parentFieldName,
  onField,
  doc,
  docId,
  mode,
}: {
  queryClient: QueryClient
  targetCollection: string
  parentCollection?: string
  parentDocId?: string
  parentFieldName?: string
  onField?: string
  doc?: Record<string, unknown>
  docId?: string
  mode: "create" | "update" | "delete"
}) {
  if (!docId && !doc) return
  const targetId = String(docId ?? doc?.id ?? "")

  // 1. Array-based join cache: ["join", targetCollection, onField, parentDocId]
  if (parentDocId && onField) {
    queryClient.setQueryData(
      ["join", targetCollection, onField, parentDocId],
      (old: unknown) => {
        if (!Array.isArray(old)) return old
        if (mode === "create" && doc) {
          const exists = old.some((item) => String(item?.id) === targetId)
          return exists ? old : [doc, ...old]
        }
        if (mode === "update" && doc) {
          return old.map((item) => (String(item?.id) === targetId ? { ...item, ...doc } : item))
        }
        if (mode === "delete") {
          return old.filter((item) => String(item?.id) !== targetId)
        }
        return old
      },
    )

    // 2. InfiniteQuery join cache: ["collection", targetCollection, "join", onField, parentDocId]
    queryClient.setQueryData(
      ["collection", targetCollection, "join", onField, parentDocId],
      (old: any) => {
        if (!old?.pages || !Array.isArray(old.pages)) return old
        const pages = old.pages.map((page: any, pageIdx: number) => {
          if (!Array.isArray(page?.docs)) return page
          let docs = page.docs
          if (mode === "create" && doc) {
            if (pageIdx === 0) {
              const exists = docs.some((item: any) => String(item?.id) === targetId)
              docs = exists ? docs : [doc, ...docs]
            }
          } else if (mode === "update" && doc) {
            docs = docs.map((item: any) => (String(item?.id) === targetId ? { ...item, ...doc } : item))
          } else if (mode === "delete") {
            docs = docs.filter((item: any) => String(item?.id) !== targetId)
          }
          return { ...page, docs }
        })
        return { ...old, pages }
      },
    )
  }

  // 3. Parent document queries containing populated relationship field:
  if (parentCollection && parentDocId && parentFieldName) {
    const updater = (old: unknown) => {
      if (!old || typeof old !== "object") return old
      const record = { ...(old as Record<string, unknown>) }
      const currentList = record[parentFieldName]
      if (Array.isArray(currentList)) {
        let nextList = currentList
        if (mode === "create" && doc) {
          const exists = currentList.some((item) => String(item?.id) === targetId)
          nextList = exists ? currentList : [doc, ...currentList]
        } else if (mode === "update" && doc) {
          nextList = currentList.map((item) =>
            String(item?.id) === targetId ? { ...item, ...doc } : item,
          )
        } else if (mode === "delete") {
          nextList = currentList.filter((item) => String(item?.id) !== targetId)
        }
        record[parentFieldName] = nextList
      }
      return record
    }

    queryClient.setQueryData(["collections", parentCollection, "detail", parentDocId], updater)
    queryClient.setQueryData(["collections", parentCollection, "entry", parentDocId], updater)
    queryClient.setQueryData(["collection", parentCollection, "detail", parentDocId], updater)
  }
}

/**
 * Executes a drawer form save matching the full edit-page pipeline:
 * 1. Sanitizes inputs (strips password fields for separate changePassword handling).
 * 2. Runs create or update mutation via client.
 * 3. Handles password change if newPassword was supplied.
 * 4. Seeds child document query caches (entry, detail, singular collection detail) with response.
 * 5. Optimistically updates parent join arrays.
 * 6. Invalidates target collection (plural, singular, operational-view).
 * 7. Invalidates parent document queries and relation join queries.
 * 8. Dispatches formatted success / error toasts matching edit-page conventions.
 */
export async function saveDrawerDocument(
  context: DrawerPipelineContext,
  formData: Record<string, unknown>,
  options: {
    isCreating: boolean
    activeDocId?: string | null
  },
): Promise<{ doc: Record<string, unknown>; passwordChanged: boolean }> {
  const {
    client,
    queryClient,
    targetCollection,
    parentCollection,
    parentDocId,
    parentFieldName,
    onField,
    singularLabel = targetCollection,
    onSuccess,
  } = context

  const { isCreating, activeDocId } = options
  const label = singularLabel || targetCollection

  if (!client) {
    throw new Error("Dyrected client unavailable.")
  }

  const { oldPassword, newPassword, confirmPassword, ...rest } = formData as {
    oldPassword?: string
    newPassword?: string
    confirmPassword?: string
    [key: string]: unknown
  }

  let savedDoc: Record<string, unknown>
  let passwordChanged = false

  try {
    if (isCreating) {
      const createPayload = {
        ...rest,
        ...(onField && parentDocId ? { [onField]: parentDocId } : {}),
      }
      savedDoc = await client.collection(targetCollection).create(createPayload)
    } else {
      if (!activeDocId) {
        throw new Error(`Missing document ID for updating ${label}`)
      }
      savedDoc = await client.collection(targetCollection).update(activeDocId, rest)

      if (newPassword) {
        await client.collection(targetCollection).changePassword(activeDocId, {
          oldPassword,
          newPassword,
          confirmPassword: confirmPassword ?? "",
        })
        passwordChanged = true
      }
    }

    const docId = (savedDoc as { id?: string })?.id ?? (activeDocId || undefined)

    // Seed child entry and detail query caches for instant rendering
    if (savedDoc && docId) {
      queryClient.setQueryData(["collections", targetCollection, "entry", docId], savedDoc)
      queryClient.setQueryData(["collections", targetCollection, "detail", docId], (old: unknown) =>
        old && typeof old === "object" ? { ...(old as object), ...savedDoc } : savedDoc,
      )
      queryClient.setQueryData(["collection", targetCollection, "detail", docId], (old: unknown) =>
        old && typeof old === "object" ? { ...(old as object), ...savedDoc } : savedDoc,
      )
    }

    // Optimistically update parent join lists
    updateParentJoinCachesOptimistically({
      queryClient,
      targetCollection,
      parentCollection,
      parentDocId,
      parentFieldName,
      onField,
      doc: savedDoc,
      docId: docId ? String(docId) : undefined,
      mode: isCreating ? "create" : "update",
    })

    // Invalidate target collection queries
    await queryClient.invalidateQueries({ queryKey: ["collections", targetCollection] })
    await queryClient.invalidateQueries({ queryKey: ["collection", targetCollection] })
    await queryClient.invalidateQueries({ queryKey: ["operational-view", targetCollection] })

    // Invalidate parent collection, document, and join queries
    await invalidateParentAndJoinQueries({
      queryClient,
      parentCollection,
      parentDocId,
      targetCollection,
      onField,
    })

    toast.success(isCreating ? `${label} created successfully` : `${label} updated successfully`, {
      description: `${label} has been saved.`,
    })

    if (passwordChanged) {
      toast.success("Password changed successfully")
    }

    await onSuccess?.(savedDoc, isCreating ? "create" : "update")

    return { doc: savedDoc, passwordChanged }
  } catch (err: unknown) {
    const error = err as Error
    toast.error(isCreating ? `Failed to create ${label}` : `Failed to save ${label}`, {
      description: error?.message || "An unexpected error occurred.",
    })
    throw err
  }
}

/**
 * Executes an inline field update in the drawer (when in detail view mode).
 * Matches cache seeding, parent updates, and parent invalidations.
 */
export async function updateDrawerField(
  context: DrawerPipelineContext,
  activeDocId: string,
  fieldName: string,
  value: unknown,
): Promise<Record<string, unknown>> {
  const {
    client,
    queryClient,
    targetCollection,
    parentCollection,
    parentDocId,
    parentFieldName,
    onField,
    singularLabel = targetCollection,
    onSuccess,
  } = context

  const label = singularLabel || targetCollection

  if (!client || !activeDocId) {
    throw new Error(`Missing client or document ID for updating ${label}`)
  }

  try {
    const updatedDoc = await client
      .collection(targetCollection)
      .update(activeDocId, { [fieldName]: value })

    const docId = (updatedDoc as { id?: string })?.id ?? activeDocId

    if (updatedDoc && docId) {
      queryClient.setQueryData(["collections", targetCollection, "entry", docId], updatedDoc)
      queryClient.setQueryData(["collections", targetCollection, "detail", docId], (old: unknown) =>
        old && typeof old === "object" ? { ...(old as object), ...updatedDoc } : updatedDoc,
      )
      queryClient.setQueryData(["collection", targetCollection, "detail", docId], (old: unknown) =>
        old && typeof old === "object" ? { ...(old as object), ...updatedDoc } : updatedDoc,
      )
    }

    updateParentJoinCachesOptimistically({
      queryClient,
      targetCollection,
      parentCollection,
      parentDocId,
      parentFieldName,
      onField,
      doc: updatedDoc,
      docId: String(docId),
      mode: "update",
    })

    await queryClient.invalidateQueries({ queryKey: ["collections", targetCollection] })
    await queryClient.invalidateQueries({ queryKey: ["collection", targetCollection] })
    await queryClient.invalidateQueries({ queryKey: ["operational-view", targetCollection] })

    await invalidateParentAndJoinQueries({
      queryClient,
      parentCollection,
      parentDocId,
      targetCollection,
      onField,
    })

    await onSuccess?.(updatedDoc, "update")

    return updatedDoc
  } catch (err: unknown) {
    const error = err as Error
    toast.error(`Failed to update ${fieldName}`, {
      description: error?.message || "An unexpected error occurred.",
    })
    throw err
  }
}

/**
 * Executes child document deletion in the drawer / join field.
 * Removes child cache entries and executes full parent & relation invalidation.
 */
export async function deleteDrawerDocument(
  context: DrawerPipelineContext,
  id: string,
): Promise<void> {
  const {
    client,
    queryClient,
    targetCollection,
    parentCollection,
    parentDocId,
    parentFieldName,
    onField,
    singularLabel = targetCollection,
  } = context

  const label = singularLabel || targetCollection

  if (!client || !id) {
    throw new Error(`Missing client or document ID for deleting ${label}`)
  }

  try {
    await client.collection(targetCollection).delete(id)

    // Remove child doc query cache
    queryClient.removeQueries({ queryKey: ["collections", targetCollection, "entry", id] })
    queryClient.removeQueries({ queryKey: ["collections", targetCollection, "detail", id] })
    queryClient.removeQueries({ queryKey: ["collection", targetCollection, "detail", id] })

    // Optimistically remove from parent join arrays
    updateParentJoinCachesOptimistically({
      queryClient,
      targetCollection,
      parentCollection,
      parentDocId,
      parentFieldName,
      onField,
      docId: id,
      mode: "delete",
    })

    // Invalidate target queries
    await queryClient.invalidateQueries({ queryKey: ["collections", targetCollection] })
    await queryClient.invalidateQueries({ queryKey: ["collection", targetCollection] })
    await queryClient.invalidateQueries({ queryKey: ["operational-view", targetCollection] })

    // Invalidate parent & relation queries
    await invalidateParentAndJoinQueries({
      queryClient,
      parentCollection,
      parentDocId,
      targetCollection,
      onField,
    })

    toast.success(`${label} deleted`, {
      description: `${label} has been removed.`,
    })
  } catch (err: unknown) {
    const error = err as Error
    toast.error(`Failed to delete ${label}`, {
      description: error?.message || "An unexpected error occurred.",
    })
    throw err
  }
}
