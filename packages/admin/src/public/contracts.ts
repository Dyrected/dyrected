import type {
  AdminThemeController,
} from "../controllers/theme"
import type {
  AdminThemePreference,
  ResolvedAdminTheme,
} from "../hooks/admin-theme"
import type {
  DyrectedFieldController,
} from "../controllers/field"
import type {
  DyrectedFieldPathPart,
  DyrectedFieldState,
  DyrectedFormController,
  DyrectedFormState,
  DyrectedFormValues,
  DyrectedSetValueOptions,
} from "../controllers/form"
import type {
  MediaLibraryController,
  MediaRecord,
  MediaUploadController,
  MediaUploadQueueItem,
  MediaURLClassification,
  MediaURLController,
} from "../controllers/media"
import type { AdminSchemas } from "../types/admin-components"

export interface AdminSchemasResult {
  /** Loaded admin schemas for the active Dyrected client. */
  schemas: AdminSchemas | null
  /** `true` while schemas are being fetched or refreshed. */
  isLoading: boolean
  /** The last schema-loading error, if one occurred. */
  error: Error | null
  /** Re-fetch the schema registry from the backend. */
  refresh(): Promise<AdminSchemas>
}

export interface MediaUploadHookOptions {
  /** Target upload collection. Falls back to `"media"` when the collection is not upload-enabled. */
  collectionSlug?: string
  /** Compress image files in the browser before upload. */
  compressImages?: boolean
  /** Maximum image width or height after compression. */
  maxDimension?: number
  /** Output image quality used during client-side compression. */
  quality?: number
  /** Called each time a file completes successfully. */
  onCompletedItem?: (item: MediaRecord) => void | Promise<void>
  /** Called once the full batch completes successfully. */
  onAllCompleted?: (items: MediaRecord[]) => void | Promise<void>
  /** Called when an individual file upload fails. */
  onError?: (error: Error, file: File) => void
}

export interface MediaUploadHookResult {
  /** The current upload queue. */
  queue: MediaUploadQueueItem[]
  /** `true` while any queued file is uploading. */
  isUploading: boolean
  /** The collection currently being uploaded to. */
  activeCollection: string
  /** Add one or more files to the upload queue and process them. */
  uploadFiles(files: File[]): Promise<MediaRecord[]>
  /** Retry a previously failed queue item. */
  retryUpload(id: string): Promise<MediaRecord | null>
  /** Remove one queue item without clearing the full queue. */
  removeQueueItem(id: string): void
  /** Remove completed items from the queue. */
  clearCompleted(): void
  /** Clear the queue contents exposed by this public API. */
  clearQueue(): void
  /** Underlying framework-agnostic controller for advanced integrations. */
  controller: MediaUploadController
}

export interface MediaLibraryHookOptions {
  /** Collection whose media should be browsed. Falls back to `"media"` when needed. */
  collection: string
  /** Number of assets to fetch per page. */
  pageSize?: number
  /** Initial filename search query. */
  initialSearchQuery?: string
  /** Asset ids that should start selected. */
  initialSelectedIds?: string[]
}

export interface MediaLibraryHookResult {
  /** The resolved collection used by the media library. */
  activeCollection: string
  /** Media items loaded for the current page and query. */
  items: MediaRecord[]
  /** Currently selected media ids. */
  selectedIds: string[]
  /** Selected media items derived from `items` and `selectedIds`. */
  selectedItems: MediaRecord[]
  /** Current search query. */
  searchQuery: string
  /** Current page number. */
  page: number
  /** `true` when another page can be loaded. */
  hasNextPage: boolean
  /** `true` while a library request is in flight. */
  isLoading: boolean
  /** The last library error, if any. */
  error: Error | null
  /** Load the first page using the current query. */
  load(): Promise<MediaRecord[]>
  /** Run a filename search and load the first page of results. */
  search(query: string): Promise<MediaRecord[]>
  /** Load the next page and append it to the current results. */
  loadNextPage(): Promise<MediaRecord[]>
  /** Replace the current selection with these ids. */
  setSelectedIds(ids: string[]): void
  /** Add one id to the current selection. */
  select(id: string): void
  /** Remove one id from the current selection. */
  deselect(id: string): void
  /** Toggle one id in the current selection. */
  toggle(id: string): void
  /** Clear all selected ids. */
  clearSelection(): void
  /** Underlying framework-agnostic controller for advanced integrations. */
  controller: MediaLibraryController
}

export interface MediaURLHookOptions {
  /** Collection where imported media records should be created. */
  collection: string
  /** Compress direct image URLs after fetch and before upload. */
  compressImages?: boolean
  /** Maximum image width or height after compression. */
  maxDimension?: number
  /** Output image quality used during client-side compression. */
  quality?: number
  /** Called when a URL import creates a media record successfully. */
  onAdded?: (media: MediaRecord) => void | Promise<void>
  /** Called when URL classification or import fails. */
  onError?: (error: Error) => void
}

export interface MediaURLHookResult {
  /** The current buffered URL. */
  url: string
  /** Replace the buffered URL value. */
  setUrl(nextUrl: string): void
  /** Submit the buffered URL. */
  submit(): Promise<void>
  /** Import a URL directly without using the buffered value. */
  importURL(nextUrl: string): Promise<MediaRecord>
  /** Classify a URL before importing it. */
  classifyURL(nextUrl: string): MediaURLClassification
  /** `true` while a URL import is in flight. */
  isSubmitting: boolean
  /** `true` when `submit()` can run with the current state. */
  canSubmit: boolean
  /** The resolved collection used for the import. */
  activeCollection: string
  /** Underlying framework-agnostic controller for advanced integrations. */
  controller: MediaURLController
}

export interface DyrectedFormHookResult {
  /** Collection currently being edited. */
  collection: string
  /** Field schema list for the form. */
  fields: DyrectedFormState["fields"]
  /** Current form values. */
  values: DyrectedFormValues
  /** Current validation errors keyed by field path. */
  errors: DyrectedFormState["errors"]
  /** Dirty flags keyed by field path. */
  dirtyFields: DyrectedFormState["dirtyFields"]
  /** Touched flags keyed by field path. */
  touchedFields: DyrectedFormState["touchedFields"]
  /** `true` when any field has been marked dirty. */
  isDirty: boolean
  /** `true` while submit is in progress. */
  isSubmitting: boolean
  /** `true` when the form is currently valid. */
  isValid: boolean
  /** Number of submit attempts made through this controller. */
  submitCount: number
  /** `true` when the form is read-only. */
  readOnly: boolean
  /** Current document id, when editing an existing document. */
  documentId?: string
  /** Read one value by dotted field path. */
  getValue(path: string): unknown
  /** Read the full form value object. */
  getValues(): DyrectedFormValues
  /** Write one value by dotted field path. */
  setValue(path: string, value: unknown, options?: DyrectedSetValueOptions): void
  /** Read one field schema by dotted field path. */
  getFieldSchema(path: string): DyrectedFieldState["schema"]
  /** Read one field state by dotted field path. */
  getFieldState(path: string): DyrectedFieldState
  /** Reset the form to supplied values or initial state. */
  reset(values?: DyrectedFormValues): void
  /** Validate the full form or one or more field paths. */
  validate(paths?: string | string[]): Promise<boolean>
  /** Submit the form through its configured adapter. */
  submit(): Promise<unknown>
  /** Underlying framework-agnostic controller for advanced integrations. */
  controller: DyrectedFormController
}

export interface DyrectedFieldHookResult {
  /** Full resolved field path. */
  path: string
  /** Field schema for this path. */
  schema: DyrectedFieldState["schema"]
  /** Current field value. */
  value: unknown
  /** Validation error for this field, if any. */
  error?: string
  /** `true` when this field is dirty. */
  isDirty: boolean
  /** `true` when this field has been touched. */
  isTouched: boolean
  /** `true` when this field is invalid. */
  invalid: boolean
  /** Path split into segments. */
  pathSegments: string[]
  /** Parent path for this field. */
  parentPath: string
  /** Join child path segments onto this field path. */
  getChildPath(...parts: DyrectedFieldPathPart[]): string
  /** Build a child path under a specific array index. */
  getItemPath(index: number, ...parts: DyrectedFieldPathPart[]): string
  /** Read a nested child value relative to this field path. */
  getChildValue(...parts: DyrectedFieldPathPart[]): unknown
  /** Read a nested child schema relative to this field path. */
  getChildSchema(...parts: DyrectedFieldPathPart[]): DyrectedFieldState["schema"]
  /** Read a nested child state relative to this field path. */
  getChildState(...parts: DyrectedFieldPathPart[]): DyrectedFieldState
  /** Write a nested child value relative to this field path. */
  setChildValue(
    parts: DyrectedFieldPathPart | DyrectedFieldPathPart[],
    value: unknown,
    options?: DyrectedSetValueOptions
  ): void
  /** Write this field's value. */
  setValue(value: unknown, options?: DyrectedSetValueOptions): void
  /** Validate this field path. */
  validate(): Promise<boolean>
  /** Underlying framework-agnostic controller for advanced integrations. */
  controller: DyrectedFieldController
}

export interface AdminThemeHookResult {
  /** Stored theme preference. */
  theme: AdminThemePreference
  /** Current detected system theme. */
  systemTheme: ResolvedAdminTheme
  /** Resolved theme after applying the preference. */
  resolvedTheme: ResolvedAdminTheme
  /** CSS class name that should be applied to the themed root. */
  themeClassName: string
  /** Update the stored theme preference. */
  setTheme(theme: AdminThemePreference): void
  /** Underlying controller, or `null` when using fallback state without a provider. */
  controller: AdminThemeController | null
}
