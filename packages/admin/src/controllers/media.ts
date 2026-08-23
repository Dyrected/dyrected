import { compressImage } from "../lib/compress-image"
import {
  buildExternalMediaPayload,
  filenameFromUrl,
  isDirectImageUrl,
  isEmbeddableVideoUrl,
} from "../lib/external-media"
import { resolveActiveMediaCollection, formatMediaErrorMessage } from "../lib/media-utils"
import type { DyrectedClient, Media } from "@dyrected/sdk"


type Listener = () => void
type MaybePromise<T> = T | Promise<T>

export interface MediaControllerSchemas {
  collections?: Array<{ slug: string; upload?: unknown }>
}

export interface MediaRecord extends Media {
  id: string
}

export interface MediaUploadQueueItem {
  id: string
  file: File
  originalSize: number
  compressedSize: number
  progress: number
  status: "queued" | "uploading" | "completed" | "error"
  error?: string
  result?: MediaRecord
}

export interface MediaUploadControllerState {
  activeCollection: string
  isUploading: boolean
  queue: MediaUploadQueueItem[]
}

export interface MediaUploadControllerOptions {
  client: DyrectedClient | null
  schemas?: MediaControllerSchemas | null
  collection: string
  compressImages?: boolean
  maxDimension?: number
  quality?: number
  onCompletedItem?: (item: MediaRecord) => MaybePromise<void>
  onAllCompleted?: (items: MediaRecord[]) => MaybePromise<void>
  onError?: (error: Error, file: File) => void
}

/**
 * Creates a framework-agnostic media upload controller.
 *
 * This is the low-level engine behind the React and Vue media upload APIs. Use
 * it directly only when you need to build your own adapter layer outside the
 * shipped framework packages.
 */
export interface MediaUploadController {
  getState(): MediaUploadControllerState
  subscribe(listener: Listener): () => void
  uploadFiles(files: File[]): Promise<MediaRecord[]>
  retryUpload(id: string): Promise<MediaRecord | null>
  removeQueueItem(id: string): void
  clearCompleted(): void
}

export interface MediaURLClassification {
  kind:
    | "youtube"
    | "vimeo"
    | "direct-image"
    | "direct-video"
    | "generic-file"
    | "unknown"
  payload: ReturnType<typeof buildExternalMediaPayload>
}

export interface MediaURLControllerState {
  activeCollection: string
  isSubmitting: boolean
}

export interface MediaURLControllerOptions {
  client: DyrectedClient | null
  schemas?: MediaControllerSchemas | null
  collection: string
  compressImages?: boolean
  maxDimension?: number
  quality?: number
  onAdded?: (item: MediaRecord) => MaybePromise<void>
  onError?: (error: Error) => void
}

/**
 * Creates a framework-agnostic media URL ingestion controller.
 */
export interface MediaURLController {
  getState(): MediaURLControllerState
  subscribe(listener: Listener): () => void
  classifyURL(url: string): MediaURLClassification
  importURL(url: string): Promise<MediaRecord>
}

export interface MediaLibraryControllerState {
  activeCollection: string
  items: MediaRecord[]
  selectedIds: string[]
  searchQuery: string
  page: number
  hasNextPage: boolean
  isLoading: boolean
  error: Error | null
}

export interface MediaLibraryControllerOptions {
  client: DyrectedClient | null
  schemas?: MediaControllerSchemas | null
  collection: string
  pageSize?: number
  initialSearchQuery?: string
  initialSelectedIds?: string[]
}

/**
 * Creates a framework-agnostic media library controller for search, pagination,
 * and selection state.
 */
export interface MediaLibraryController {
  getState(): MediaLibraryControllerState
  subscribe(listener: Listener): () => void
  load(): Promise<MediaRecord[]>
  search(query: string): Promise<MediaRecord[]>
  loadNextPage(): Promise<MediaRecord[]>
  setSelectedIds(ids: string[]): void
  select(id: string): void
  deselect(id: string): void
  toggle(id: string): void
  clearSelection(): void
}

function createStore<T>(initialState: T) {
  let state = initialState
  const listeners = new Set<Listener>()

  return {
    getState: () => state,
    setState: (updater: T | ((currentState: T) => T)) => {
      state = typeof updater === "function"
        ? (updater as (currentState: T) => T)(state)
        : updater
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function ensureClient(client: DyrectedClient | null): DyrectedClient {
  if (!client) {
    throw new Error("SDK Client not initialized")
  }
  return client
}

function randomId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

async function maybeCompressImage(
  file: File,
  compressImages: boolean,
  maxDimension?: number,
  quality?: number
): Promise<File> {
  if (!compressImages) return file
  return compressImage(file, maxDimension, quality)
}

export function createMediaUploadController({
  client,
  schemas,
  collection,
  compressImages = true,
  maxDimension = 2048,
  quality = 0.85,
  onCompletedItem,
  onAllCompleted,
  onError,
}: MediaUploadControllerOptions): MediaUploadController {
  const activeCollection = resolveActiveMediaCollection(schemas, collection)
  const store = createStore<MediaUploadControllerState>({
    activeCollection,
    isUploading: false,
    queue: [],
  })

  const processFile = async (item: MediaUploadQueueItem): Promise<MediaUploadQueueItem> => {
    const sdkClient = ensureClient(client)

    store.setState((state) => ({
      ...state,
      queue: state.queue.map((queuedItem) =>
        queuedItem.id === item.id
          ? { ...queuedItem, status: "uploading", progress: 0, error: undefined }
          : queuedItem
      ),
    }))

    try {
      const processedFile = await maybeCompressImage(item.file, compressImages, maxDimension, quality)
      store.setState((state) => ({
        ...state,
        queue: state.queue.map((queuedItem) =>
          queuedItem.id === item.id
            ? { ...queuedItem, compressedSize: processedFile.size }
            : queuedItem
        ),
      }))

      const result = (await sdkClient.collection(activeCollection).upload(
        processedFile,
        undefined,
        {
          onProgress: (progress) => {
            store.setState((state) => ({
              ...state,
              queue: state.queue.map((queuedItem) =>
                queuedItem.id === item.id
                  ? { ...queuedItem, progress }
                  : queuedItem
              ),
            }))
          },
        }
      )) as unknown as MediaRecord

      const completedItem: MediaUploadQueueItem = {
        ...item,
        compressedSize: processedFile.size,
        progress: 100,
        status: "completed",
        result,
      }

      store.setState((state) => ({
        ...state,
        queue: state.queue.map((queuedItem) =>
          queuedItem.id === item.id ? completedItem : queuedItem
        ),
      }))

      await onCompletedItem?.(result)
      return completedItem
    } catch (error) {
      const message = formatMediaErrorMessage(error)
      const normalizedError = new Error(message)
      const failedItem: MediaUploadQueueItem = {
        ...item,
        status: "error",
        error: message,
      }

      store.setState((state) => ({
        ...state,
        queue: state.queue.map((queuedItem) =>
          queuedItem.id === item.id ? failedItem : queuedItem
        ),
      }))

      onError?.(normalizedError, item.file)
      return failedItem
    }
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    async uploadFiles(files) {
      if (files.length === 0) return []

      const queueItems: MediaUploadQueueItem[] = files.map((file, index) => ({
        id: randomId(`upload_${index}`),
        file,
        originalSize: file.size,
        compressedSize: file.size,
        progress: 0,
        status: "queued",
      }))

      store.setState((state) => ({
        ...state,
        isUploading: true,
        queue: [...state.queue, ...queueItems],
      }))

      const completedItems: MediaRecord[] = []
      for (const queueItem of queueItems) {
        const result = await processFile(queueItem)
        if (result.status === "completed" && result.result) {
          completedItems.push(result.result)
        }
      }

      store.setState((state) => ({
        ...state,
        isUploading: false,
      }))

      if (completedItems.length > 0) {
        await onAllCompleted?.(completedItems)
      }

      return completedItems
    },
    async retryUpload(id) {
      const queueItem = store.getState().queue.find((item) => item.id === id)
      if (!queueItem) return null

      store.setState((state) => ({ ...state, isUploading: true }))
      const result = await processFile(queueItem)
      store.setState((state) => ({ ...state, isUploading: false }))
      return result.result ?? null
    },
    removeQueueItem(id) {
      store.setState((state) => ({
        ...state,
        queue: state.queue.filter((item) => item.id !== id),
      }))
    },
    clearCompleted() {
      store.setState((state) => ({
        ...state,
        queue: state.queue.filter((item) => item.status !== "completed"),
      }))
    },
  }
}

export function createMediaURLController({
  client,
  schemas,
  collection,
  compressImages = true,
  maxDimension = 2048,
  quality = 0.85,
  onAdded,
  onError,
}: MediaURLControllerOptions): MediaURLController {
  const activeCollection = resolveActiveMediaCollection(schemas, collection)
  const store = createStore<MediaURLControllerState>({
    activeCollection,
    isSubmitting: false,
  })

  const classifyURL = (url: string): MediaURLClassification => {
    const trimmed = url.trim()
    const payload = buildExternalMediaPayload(trimmed)

    if (!payload) {
      return { kind: "unknown", payload: null }
    }
    if (payload.mimeType === "video/youtube") {
      return { kind: "youtube", payload }
    }
    if (payload.mimeType === "video/vimeo") {
      return { kind: "vimeo", payload }
    }
    if (payload.mimeType === "image/external" || isDirectImageUrl(trimmed)) {
      return { kind: "direct-image", payload }
    }
    if (payload.mimeType.startsWith("video/")) {
      return { kind: "direct-video", payload }
    }
    if (payload.mimeType === "application/external") {
      return { kind: "generic-file", payload }
    }
    return { kind: "unknown", payload }
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    classifyURL,
    async importURL(url) {
      const sdkClient = ensureClient(client)
      const trimmed = url.trim()
      const { payload } = classifyURL(trimmed)

      if (!trimmed || !payload) {
        throw new Error("A valid media URL is required")
      }

      store.setState((state) => ({ ...state, isSubmitting: true }))

      try {
        let result: MediaRecord
        if (isEmbeddableVideoUrl(trimmed)) {
          result = (await sdkClient
            .collection(activeCollection)
            .create(payload as unknown as Record<string, unknown>)) as unknown as MediaRecord
        } else if (payload.mimeType.startsWith("video/") || payload.mimeType === "application/external") {
          result = (await sdkClient
            .collection(activeCollection)
            .create(payload as unknown as Record<string, unknown>)) as unknown as MediaRecord
        } else if (isDirectImageUrl(trimmed) || payload.mimeType === "image/external") {
          try {
            const response = await fetch(trimmed)
            if (!response.ok) {
              throw new Error(`HTTP error ${response.status}`)
            }
            const blob = await response.blob()
            const file = new File(
              [blob],
              filenameFromUrl(trimmed, "image.jpg"),
              { type: blob.type || "image/jpeg" }
            )
            const processedFile = await maybeCompressImage(file, compressImages, maxDimension, quality)

            result = (await sdkClient
              .collection(activeCollection)
              .upload(processedFile, undefined)) as unknown as MediaRecord
          } catch (fetchError) {
            console.warn("Direct image fetch failed (e.g. CORS). Falling back to external CDN reference:", fetchError)
            result = (await sdkClient
              .collection(activeCollection)
              .create(payload as unknown as Record<string, unknown>)) as unknown as MediaRecord
          }
        } else {
          result = (await sdkClient
            .collection(activeCollection)
            .create(payload as unknown as Record<string, unknown>)) as unknown as MediaRecord
        }

        await onAdded?.(result)
        return result
      } catch (error) {
        const message = formatMediaErrorMessage(error)
        const normalizedError = new Error(message)
        console.error("Failed to add media from URL", normalizedError)
        onError?.(normalizedError)
        throw normalizedError
      } finally {
        store.setState((state) => ({ ...state, isSubmitting: false }))
      }
    },
  }
}

export function createMediaLibraryController({
  client,
  schemas,
  collection,
  pageSize = 12,
  initialSearchQuery = "",
  initialSelectedIds = [],
}: MediaLibraryControllerOptions): MediaLibraryController {
  const activeCollection = resolveActiveMediaCollection(schemas, collection)
  const store = createStore<MediaLibraryControllerState>({
    activeCollection,
    items: [],
    selectedIds: initialSelectedIds,
    searchQuery: initialSearchQuery,
    page: 1,
    hasNextPage: false,
    isLoading: false,
    error: null,
  })

  const loadPage = async (page: number, append: boolean): Promise<MediaRecord[]> => {
    const sdkClient = ensureClient(client)
    const currentState = store.getState()

    store.setState({
      ...currentState,
      isLoading: true,
      error: null,
      page,
    })

    try {
      const response = await sdkClient.listMedia(
        {
          where: currentState.searchQuery
            ? { filename: { contains: currentState.searchQuery } }
            : undefined,
          limit: pageSize,
          page,
        },
        activeCollection
      )

      const docs = response.docs as MediaRecord[]
      store.setState((state) => ({
        ...state,
        items: append ? [...state.items, ...docs] : docs,
        hasNextPage: Boolean(response.hasNextPage),
        isLoading: false,
        error: null,
      }))

      return docs
    } catch (error) {
      const message = formatMediaErrorMessage(error)
      const normalizedError = new Error(message)
      store.setState((state) => ({
        ...state,
        isLoading: false,
        error: normalizedError,
      }))
      throw normalizedError
    }
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    load() {
      return loadPage(1, false)
    },
    search(query) {
      store.setState((state) => ({
        ...state,
        searchQuery: query,
        page: 1,
      }))
      return loadPage(1, false)
    },
    loadNextPage() {
      const state = store.getState()
      if (state.isLoading || !state.hasNextPage) {
        return Promise.resolve([])
      }
      return loadPage(state.page + 1, true)
    },
    setSelectedIds(ids) {
      store.setState((state) => ({ ...state, selectedIds: ids }))
    },
    select(id) {
      store.setState((state) => ({
        ...state,
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds
          : [...state.selectedIds, id],
      }))
    },
    deselect(id) {
      store.setState((state) => ({
        ...state,
        selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
      }))
    },
    toggle(id) {
      store.setState((state) => ({
        ...state,
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter((selectedId) => selectedId !== id)
          : [...state.selectedIds, id],
      }))
    },
    clearSelection() {
      store.setState((state) => ({ ...state, selectedIds: [] }))
    },
  }
}
