import * as React from "react"
import { useDyrected } from "../providers/dyrected-context"
import { buildExternalMediaPayload } from "../lib/external-media"
import type { Media } from "@dyrected/sdk"

export interface UseAddMediaFromUrlOptions {
  /** Collection slug to create the external media record in. */
  collection: string
  /** Called with the created media record after a successful add. */
  onAdded: (media: Media & { id: string }) => void | Promise<void>
  /** Called if the create request fails. */
  onError?: (error: Error) => void
}

/**
 * Shared behavior for the "add media from a URL" flow used by both the media page
 * upload dialog and the media library picker dialog. Owns the URL input state and
 * the detect → create → callback pipeline so every surface behaves identically for
 * YouTube, Vimeo, external images, and generic files.
 */
export function useAddMediaFromUrl({ collection, onAdded, onError }: UseAddMediaFromUrlOptions) {
  const { client } = useDyrected()
  const [url, setUrl] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const submit = React.useCallback(async () => {
    const payload = buildExternalMediaPayload(url)
    if (!payload || !client) return

    setIsSubmitting(true)
    try {
      const result = (await client
        .collection(collection)
        .create(payload as unknown as Record<string, unknown>)) as unknown as Media & { id: string }
      setUrl("")
      await onAdded(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to add media from URL")
      console.error("Failed to add media from URL", error)
      onError?.(error)
    } finally {
      setIsSubmitting(false)
    }
  }, [url, client, collection, onAdded, onError])

  return { url, setUrl, submit, isSubmitting, canSubmit: !!url.trim() && !isSubmitting }
}
