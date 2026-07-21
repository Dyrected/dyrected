import * as React from "react"
import { useDyrected } from "../providers/dyrected-context"
import {
  createMediaURLController,
  type MediaRecord,
  type MediaURLClassification,
  type MediaURLController,
} from "../controllers/media"

export interface UseMediaURLOptions {
  collection: string
  compressImages?: boolean
  maxDimension?: number
  quality?: number
  onAdded?: (media: MediaRecord) => void | Promise<void>
  onError?: (error: Error) => void
}

export function useMediaURL({
  collection,
  compressImages = true,
  maxDimension = 2048,
  quality = 0.85,
  onAdded,
  onError,
}: UseMediaURLOptions) {
  const { client, schemas } = useDyrected()
  const [url, setUrl] = React.useState("")
  const handlersRef = React.useRef({ onAdded, onError })

  handlersRef.current = { onAdded, onError }

  const controller = React.useMemo<MediaURLController>(() => {
    return createMediaURLController({
      client,
      schemas,
      collection,
      compressImages,
      maxDimension,
      quality,
      onAdded: async (item) => {
        await handlersRef.current.onAdded?.(item)
      },
      onError: (error) => {
        handlersRef.current.onError?.(error)
      },
    })
  }, [client, schemas, collection, compressImages, maxDimension, quality])

  const state = React.useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState
  )

  const submit = React.useCallback(async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    await controller.importURL(trimmed)
    setUrl("")
  }, [controller, url])

  const classifyURL = React.useCallback(
    (nextUrl: string): MediaURLClassification => controller.classifyURL(nextUrl),
    [controller]
  )

  return {
    url,
    setUrl,
    submit,
    importURL: controller.importURL,
    classifyURL,
    isSubmitting: state.isSubmitting,
    canSubmit: !!url.trim() && !state.isSubmitting,
    activeCollection: state.activeCollection,
  }
}
