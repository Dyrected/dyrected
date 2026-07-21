import * as React from "react"
import { useDyrected } from "../providers/dyrected-context"
import { buildExternalMediaPayload, filenameFromUrl, isEmbeddableVideoUrl, isDirectImageUrl } from "../lib/external-media"
import { resolveActiveMediaCollection } from "../lib/media-utils"
import { compressImage } from "../lib/compress-image"
import type { Media } from "@dyrected/sdk"

export interface UseAddMediaFromUrlOptions {
  /** Collection slug to create/upload the media record in. */
  collection: string
  /** Called with the created media record after a successful add. */
  onAdded: (media: Media & { id: string }) => void | Promise<void>
  /** Called if the create/upload request fails. */
  onError?: (error: Error) => void
}

export function useAddMediaFromUrl({ collection, onAdded, onError }: UseAddMediaFromUrlOptions) {
  const { client, schemas } = useDyrected()
  const [url, setUrl] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const activeCollection = React.useMemo(
    () => resolveActiveMediaCollection(schemas, collection),
    [schemas, collection]
  )

  const submit = React.useCallback(async () => {
    const rawUrl = url.trim()
    if (!rawUrl || !client) return

    const payload = buildExternalMediaPayload(rawUrl)
    if (!payload) return

    setIsSubmitting(true)
    try {
      let result: Media & { id: string }

      // 1. YouTube & Vimeo embeds -> save as lightweight embed reference (0 MB transfer)
      if (isEmbeddableVideoUrl(rawUrl)) {
        result = (await client
          .collection(activeCollection)
          .create(payload as unknown as Record<string, unknown>)) as unknown as Media & { id: string }
      } 
      // 2. Direct Video or Large Media -> save as External CDN Reference Record (0 MB transfer)
      else if (payload.mimeType.startsWith("video/") || payload.mimeType === "application/external") {
        result = (await client
          .collection(activeCollection)
          .create(payload as unknown as Record<string, unknown>)) as unknown as Media & { id: string }
      } 
      // 3. Direct Images -> attempt browser fetch, client-side compression, and upload to storage
      else if (isDirectImageUrl(rawUrl) || payload.mimeType === "image/external") {
        try {
          const response = await fetch(rawUrl)
          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`)
          }
          const blob = await response.blob()
          const filename = filenameFromUrl(rawUrl, "image.jpg")
          const file = new File([blob], filename, { type: blob.type || "image/jpeg" })
          const compressed = await compressImage(file)

          result = (await client
            .collection(activeCollection)
            .upload(compressed, undefined)) as unknown as Media & { id: string }
        } catch (fetchErr) {
          console.warn("Direct image fetch failed (e.g. CORS). Falling back to external CDN reference:", fetchErr)
          // Fall back to creating an External Image record in the collection
          result = (await client
            .collection(activeCollection)
            .create(payload as unknown as Record<string, unknown>)) as unknown as Media & { id: string }
        }
      } 
      // 4. Generic fallback
      else {
        result = (await client
          .collection(activeCollection)
          .create(payload as unknown as Record<string, unknown>)) as unknown as Media & { id: string }
      }

      setUrl("")
      await onAdded(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to add media from URL")
      console.error("Failed to add media from URL", error)
      onError?.(error)
    } finally {
      setIsSubmitting(false)
    }
  }, [url, client, activeCollection, onAdded, onError])

  return { url, setUrl, submit, isSubmitting, canSubmit: !!url.trim() && !isSubmitting, activeCollection }
}
