import * as React from "react"
import { useDyrected } from "../providers/dyrected-context"
import { compressImage } from "../lib/compress-image"
import { resolveActiveMediaCollection } from "../lib/media-utils"
import type { Media } from "@dyrected/sdk"

export interface UploadQueueItem {
  id: string
  file: File
  originalSize: number
  compressedSize: number
  progress: number
  status: "queued" | "uploading" | "completed" | "error"
  error?: string
  result?: Media & { id: string }
}

export interface UseMediaUploadOptions {
  collectionSlug?: string
  onCompletedItem?: (item: Media & { id: string }) => void | Promise<void>
  onAllCompleted?: (items: (Media & { id: string })[]) => void | Promise<void>
  onError?: (error: Error, file: File) => void
}

export function useMediaUpload({
  collectionSlug = "media",
  onCompletedItem,
  onAllCompleted,
  onError,
}: UseMediaUploadOptions = {}) {
  const { client, schemas } = useDyrected()
  const [queue, setQueue] = React.useState<UploadQueueItem[]>([])
  const [isUploading, setIsUploading] = React.useState(false)

  const activeCollection = React.useMemo(
    () => resolveActiveMediaCollection(schemas, collectionSlug),
    [schemas, collectionSlug]
  )

  const processFile = React.useCallback(
    async (item: UploadQueueItem): Promise<UploadQueueItem> => {
      if (!client) {
        throw new Error("SDK Client not initialized")
      }

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading", progress: 0 } : q))
      )

      try {
        const compressed = await compressImage(item.file)
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, compressedSize: compressed.size } : q
          )
        )

        const result = (await client.collection(activeCollection).upload(
          compressed,
          undefined,
          {
            onProgress: (percent) => {
              setQueue((prev) =>
                prev.map((q) => (q.id === item.id ? { ...q, progress: percent } : q))
              )
            },
          }
        )) as Media & { id: string }

        const updatedItem: UploadQueueItem = {
          ...item,
          status: "completed",
          progress: 100,
          result,
        }

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? updatedItem : q))
        )

        if (onCompletedItem) {
          await onCompletedItem(result)
        }

        return updatedItem
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed")
        const failedItem: UploadQueueItem = {
          ...item,
          status: "error",
          error: error.message,
        }

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? failedItem : q))
        )

        if (onError) {
          onError(error, item.file)
        }

        return failedItem
      }
    },
    [client, activeCollection, onCompletedItem, onError]
  )

  const uploadFiles = React.useCallback(
    async (files: File[]) => {
      if (files.length === 0) return

      const newItems: UploadQueueItem[] = files.map((file, idx) => ({
        id: `upload_${Date.now()}_${idx}_${Math.random().toString(36).substring(7)}`,
        file,
        originalSize: file.size,
        compressedSize: file.size,
        progress: 0,
        status: "queued",
      }))

      setQueue((prev) => [...prev, ...newItems])
      setIsUploading(true)

      const completedResults: (Media & { id: string })[] = []

      for (const item of newItems) {
        const res = await processFile(item)
        if (res.status === "completed" && res.result) {
          completedResults.push(res.result)
        }
      }

      setIsUploading(false)

      if (onAllCompleted && completedResults.length > 0) {
        await onAllCompleted(completedResults)
      }
    },
    [processFile, onAllCompleted]
  )

  const retryUpload = React.useCallback(
    async (id: string) => {
      const item = queue.find((q) => q.id === id)
      if (!item) return
      setIsUploading(true)
      await processFile(item)
      setIsUploading(false)
    },
    [queue, processFile]
  )

  const removeQueueItem = React.useCallback((id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const clearQueue = React.useCallback(() => {
    setQueue((prev) => prev.filter((q) => q.status === "uploading"))
  }, [])

  return {
    queue,
    isUploading,
    uploadFiles,
    retryUpload,
    removeQueueItem,
    clearQueue,
    activeCollection,
  }
}
