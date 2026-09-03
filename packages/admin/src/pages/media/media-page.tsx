import * as React from "react"
import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useDyrected } from "../../providers/dyrected-context"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { cn, getMediaUrl, getDisplayFilename } from "../../lib/utils"
import {
  Card,
  CardContent,
  CardHeader,
} from "../../components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog"
import { AspectRatio } from "../../components/ui/aspect-ratio"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs"
import { Progress } from "../../components/ui/progress"
import {
  Upload,
  FileIcon,
  Trash2,
  Image as ImageIcon,
  Globe,
  Video,
  Download,
  Link as LinkIcon,
  FolderInput,
  MoreVertical,
  Copy,
  Pencil,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { getMediaPreviewUrl } from "../../lib/external-media"
import { getMediaSourceInfo, isStorageNotConfiguredError } from "../../lib/media-utils"
import { StorageNotConfiguredNotice } from "../../components/media/storage-notice"
import { useMediaURL } from "../../hooks/use-media-url"
import { useMediaUpload } from "../../hooks/use-media-upload"
import { useDropzone } from "react-dropzone"
import { Blurhash } from "react-blurhash"
import type { CollectionConfig } from "@dyrected/core"
import type { Media, PaginatedResult } from "@dyrected/sdk"
import { AdminComponentSlot } from "../../components/admin-component-slot"
import type { CollectionListSlotProps } from "../../types/admin-components"
import jexl from "jexl"
import { AdminMediaSkeleton } from "../../components/layout/admin-loading"
import { useDebouncedValue } from "../../hooks/use-debounced-value"
import { FolderTree } from "../../components/media/folder-tree"
import { FolderPillCarousel } from "../../components/media/folder-pill-carousel"
import { MediaFilterBar, type MimeFilterType, type AspectRatioMode } from "../../components/media/media-filter-bar"
import { MediaInspector } from "../../components/media/media-inspector"
import { MoveToFolderDialog } from "../../components/media/move-to-folder-dialog"
import { useMediaFolders } from "../../hooks/use-media-folders"

type ViewMode = "grid" | "list"

/** Sort values map directly to the SDK `sort` string (`-` prefix = descending). */
type SortValue = "-createdAt" | "createdAt" | "filename" | "-filename" | "-filesize" | "filesize"

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "-createdAt", label: "Newest first" },
  { value: "createdAt", label: "Oldest first" },
  { value: "filename", label: "Name (A–Z)" },
  { value: "-filename", label: "Name (Z–A)" },
  { value: "-filesize", label: "Size (largest)" },
  { value: "filesize", label: "Size (smallest)" },
]

export function MediaPage({ collectionSlug, schema }: { collectionSlug: string, schema: CollectionConfig }) {
  const { client, components, user, schemas } = useDyrected()

  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [isUploadOpen, setIsUploadOpen] = React.useState(false)
  const [uploadFiles, setUploadFiles] = React.useState<File[]>([])
  const [selectedItem, setSelectedItem] = React.useState<Media | null>(null)
  const [sortValue, setSortValue] = React.useState<SortValue>("-createdAt")
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid")
  const [mimeFilter, setMimeFilter] = React.useState<MimeFilterType>("all")
  const [aspectRatio, setAspectRatio] = React.useState<AspectRatioMode>("square")
  const [movingItems, setMovingItems] = React.useState<Media[] | null>(null)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const {
    folders,
    activeFolderId,
    setActiveFolderId,
    createFolder,
    renameFolder,
    deleteFolder,
    getBreadcrumbs,
  } = useMediaFolders(collectionSlug)

  const handleMoveItems = async (destFolderId: string | null) => {
    if (!movingItems || movingItems.length === 0 || !client) return
    const toastId = toast.loading(`Moving ${movingItems.length} item(s)...`)
    try {
      await Promise.all(
        movingItems.map((item) =>
          client.collection(collectionSlug).update(item.id as string, {
            folderId: destFolderId,
          })
        )
      )
      queryClient.invalidateQueries({ queryKey: ["media"] })
      queryClient.invalidateQueries({ queryKey: [collectionSlug, "folders"] })
      toast.success(`Moved ${movingItems.length} item(s)`, { id: toastId })
      setMovingItems(null)
    } catch (err: any) {
      toast.error("Failed to move item(s)", { description: err?.message, id: toastId })
    }
  }

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error: queryError
  } = useInfiniteQuery({
    queryKey: ["media", collectionSlug, debouncedSearch, sortValue, activeFolderId, mimeFilter],
    queryFn: ({ pageParam = 1 }) => {
      const where: Record<string, unknown> = {}
      if (debouncedSearch) {
        where.filename = { contains: debouncedSearch }
      }
      if (activeFolderId) {
        where.folderId = { equals: activeFolderId }
      }
      if (mimeFilter !== "all") {
        if (mimeFilter === "image") where.mimeType = { contains: "image" }
        else if (mimeFilter === "video") where.mimeType = { contains: "video" }
        else if (mimeFilter === "audio") where.mimeType = { contains: "audio" }
        else if (mimeFilter === "document") where.mimeType = { in: ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] }
      }

      return client!.listMedia(
        {
          where: Object.keys(where).length > 0 ? where : undefined,
          sort: sortValue,
          limit: 12,
          page: pageParam
        },
        collectionSlug
      )
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.page + 1 : undefined
    },
    enabled: !!client,
    placeholderData: keepPreviousData,
  })

  const mediaResponse = React.useMemo(() => {
    return data?.pages.flatMap((page) => page.docs) || []
  }, [data])

  const readAccess = (schema.access as { read?: unknown })?.read
  const createAccess = (schema.access as { create?: unknown })?.create
  const evaluateAccess = (access: unknown) => {
    if (access === false) return false
    if (typeof access !== "string") return true

    try {
      return Boolean(jexl.evalSync(access, { user }))
    } catch (error) {
      console.warn("Media collection access evaluation failed:", error)
      return false
    }
  }
  const canRead = evaluateAccess(readAccess)
  const canCreate = evaluateAccess(createAccess)

  const lastPage = data?.pages[data.pages.length - 1]
  const slotResponse: PaginatedResult<Record<string, unknown>> | undefined = lastPage
    ? { ...lastPage, docs: mediaResponse as Record<string, unknown>[] }
    : undefined
  const collectionComponentProps: CollectionListSlotProps = {
    client: client!,
    user,
    collection: schema,
    collectionSlug,
    response: slotResponse,
    documents: mediaResponse as Record<string, unknown>[],
    isLoading,
    pagination: {
      page: lastPage?.page ?? 1,
      totalPages: lastPage?.totalPages ?? 1,
      total: lastPage?.total ?? 0,
      hasNextPage: Boolean(hasNextPage),
      hasPrevPage: Boolean(lastPage?.hasPrevPage),
    },
    permissions: { canRead, canCreate },
    urls: {
      collection: `/collections/${collectionSlug}`,
      create: `/collections/${collectionSlug}/new`,
    },
  }
  const collectionSlots = schema.admin?.components

  const observerRef = React.useRef<IntersectionObserver | null>(null)

  const sentinelRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      if (node && hasNextPage && !isFetchingNextPage) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              fetchNextPage()
            }
          },
          { rootMargin: "100px" }
        )
        observerRef.current.observe(node)
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client!.deleteMedia(id, collectionSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] })
      toast.success("Asset deleted successfully")
    },
    onError: (error: Error) => {
      toast.error("Failed to delete asset", {
        description: error.message
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: (args: { id: string, data: Record<string, unknown> }) => client!.update<Media>(collectionSlug || "media", args.id, args.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["media"] })
      setSelectedItem(data)
      toast.success("Asset details updated")
    },
    onError: (error: Error) => {
      toast.error("Failed to update asset", {
        description: error.message
      })
    }
  })

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (canCreate && acceptedFiles.length > 0) {
      setUploadFiles(acceptedFiles)
      setIsUploadOpen(true)
    }
  }, [canCreate])

  const handlePaste = React.useCallback((e: React.ClipboardEvent) => {
    if (!canCreate) return
    const items = e.clipboardData?.items
    if (!items) return
    const filesToUpload: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile()
        if (file) {
          filesToUpload.push(file)
        }
      }
    }
    if (filesToUpload.length > 0) {
      e.preventDefault()
      setUploadFiles(prev => [...prev, ...filesToUpload])
      setIsUploadOpen(true)
    }
  }, [canCreate])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // Only trigger on drop, not on background click
  })

  const handleUploadOpenChange = (open: boolean) => {
    setIsUploadOpen(open)
    if (!open) {
      setUploadFiles([])
    }
  }

  if (!canRead) {
    return (
      <div className="dy-flex dy-h-[calc(100vh-200px)] dy-items-center dy-justify-center">
        <div className="dy-space-y-2 dy-text-center">
          <h3 className="dy-text-lg dy-font-bold">Access Denied</h3>
          <p className="dy-text-sm dy-text-muted-foreground">You do not have permission to view this collection.</p>
        </div>
      </div>
    )
  }

  const hasStorageError = schemas?.hasStorage === false || isStorageNotConfiguredError(queryError)
  const showInitialLoading = isLoading && mediaResponse.length === 0
  const showSearchRefreshing = isFetching && !showInitialLoading


  return (
    <div {...getRootProps()} onPaste={handlePaste} className="dy-min-h-full dy-space-y-6 dy-animate-in dy-relative lg:dy-space-y-8">
      <input {...getInputProps()} />

      {isDragActive && (
        <div className="dy-absolute dy-inset-0 dy-z-50 dy-bg-primary/10 dy-backdrop-blur-[2px] dy-border-4 dy-border-dashed dy-border-primary dy-rounded-2xl dy-flex dy-items-center dy-justify-center dy-pointer-events-none">
          <div className="dy-bg-card dy-p-8 dy-rounded-2xl dy-shadow-2xl dy-flex dy-flex-col dy-items-center dy-gap-4">
            <div className="dy-h-16 dy-w-16 dy-rounded-full dy-bg-primary/10 dy-flex dy-items-center dy-justify-center">
              <Upload className="dy-h-8 dy-w-8 dy-text-primary dy-animate-bounce" />
            </div>
            <p className="dy-text-xl dy-font-bold">Drop to upload assets</p>
          </div>
        </div>
      )}

      {hasStorageError && (
        <StorageNotConfiguredNotice variant="banner" />
      )}

      <AdminComponentSlot
        slot="beforeList"
        componentKeys={collectionSlots?.beforeList}
        registry={components?.collectionList}
        componentProps={collectionComponentProps}
      />
      <div className="dy-flex dy-flex-col dy-gap-4 dy-border-b dy-border-border/50 dy-pb-5 sm:dy-flex-row sm:dy-items-end sm:dy-justify-between sm:dy-pb-6">
        <div className="dy-min-w-0">
          <div className="dy-flex dy-items-center dy-gap-2 dy-mb-1">
            <ImageIcon className="dy-h-5 dy-w-5 dy-flex-shrink-0 dy-text-primary" />
            <h1 className="dy-min-w-0 dy-break-words dy-text-2xl dy-font-bold dy-tracking-tight dy-text-foreground sm:dy-text-3xl">
              {schema.labels?.plural ?? (collectionSlug !== 'media' ? (collectionSlug.charAt(0).toUpperCase() + collectionSlug.slice(1)) : "Media Library")}
            </h1>
          </div>
          <p className="dy-text-sm dy-leading-5 dy-text-muted-foreground">
            Manage your images, documents, and other assets for this site.
          </p>
        </div>
        {canCreate && <Dialog open={isUploadOpen} onOpenChange={handleUploadOpenChange}>
          <DialogTrigger asChild>
            <Button className="dy-h-10 dy-w-full dy-justify-center dy-px-4 dy-rounded-lg dy-bg-primary hover:dy-bg-primary/90 dy-shadow-md dy-transition-all active:dy-scale-95 sm:dy-w-auto">
              <Upload className="dy-mr-2 dy-h-4 dy-w-4" />
              Upload Assets
            </Button>
          </DialogTrigger>
          <DialogContent className="dy-max-h-[90dvh] dy-w-[calc(100vw-1rem)] dy-overflow-y-auto dy-rounded-2xl dy-border-none dy-shadow-2xl sm:dy-max-w-[600px]">
            <DialogHeader className="dy-pb-4 dy-border-b dy-border-border/40">
              <DialogTitle className="dy-text-xl dy-font-bold">Upload Media Assets</DialogTitle>
            </DialogHeader>
            <FileUploader
              collectionSlug={collectionSlug}
              files={uploadFiles}
              setFiles={setUploadFiles}
              onComplete={() => {
                handleUploadOpenChange(false)
                queryClient.invalidateQueries({ queryKey: ["media", collectionSlug] })
              }}
            />
          </DialogContent>
        </Dialog>}
      </div>

      <div className="dy-flex dy-flex-col md:dy-flex-row dy-gap-4 dy-min-h-[calc(100vh-220px)]">
        {/* Desktop Sidebar Folder Tree */}
        <div className="dy-hidden md:dy-block">
          <FolderTree
            folders={folders}
            activeFolderId={activeFolderId}
            onSelectFolder={setActiveFolderId}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            totalAssetCount={slotResponse?.total}
            className="dy-h-full dy-rounded-xl dy-border"
          />
        </div>

        {/* Main Workspace */}
        <div className="dy-flex-1 dy-flex dy-flex-col dy-min-w-0">
          {/* Mobile Horizontal Pill Carousel */}
          <div className="dy-block md:dy-hidden dy-mb-1">
            <FolderPillCarousel
              folders={folders}
              activeFolderId={activeFolderId}
              breadcrumbs={getBreadcrumbs(activeFolderId)}
              onSelectFolder={setActiveFolderId}
              onCreateFolder={(name, parentId) => createFolder(name, parentId)}
              totalAssetCount={slotResponse?.total}
            />
          </div>

          {/* Filter Bar with MIME chips & View Controls */}
          <MediaFilterBar
            search={search}
            onSearchChange={setSearch}
            mimeFilter={mimeFilter}
            onMimeFilterChange={setMimeFilter}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            viewMode={viewMode === "grid" ? "grid" : "table"}
            onViewModeChange={(v) => setViewMode(v === "grid" ? "grid" : "list")}
            sortValue={sortValue}
            onSortChange={(v) => setSortValue(v as SortValue)}
            sortOptions={SORT_OPTIONS}
          />

          <AdminComponentSlot
            slot="beforeListTable"
            componentKeys={collectionSlots?.beforeListTable}
            registry={components?.collectionList}
            componentProps={collectionComponentProps}
          />

          <div className="dy-min-w-0 dy-flex-1">
            {showInitialLoading ? (
              <AdminMediaSkeleton />
            ) : mediaResponse?.length === 0 ? (
              <div className="dy-flex dy-min-h-56 dy-flex-col dy-items-center dy-justify-center dy-rounded-2xl dy-border-2 dy-border-dashed dy-border-border/60 dy-bg-muted/5 dy-p-6 dy-text-center dy-animate-in sm:dy-h-80">
                <div className="dy-h-16 dy-w-16 dy-rounded-2xl dy-bg-muted/40 dy-flex dy-items-center dy-justify-center dy-mb-4">
                  <FileIcon className="dy-h-8 dy-w-8 dy-text-muted-foreground/50" />
                </div>
                <h3 className="dy-text-lg dy-font-bold dy-text-foreground">No assets found</h3>
                <p className="dy-text-sm dy-text-muted-foreground dy-max-w-xs dy-mx-auto">
                  Your media library is empty. Upload some files to start building your content.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="dy-relative">
                {showSearchRefreshing && (
                  <div className="dy-pointer-events-none dy-absolute dy-right-0 dy-top-0 dy-z-10">
                    <div className="dy-inline-flex dy-items-center dy-gap-2 dy-rounded-full dy-border dy-border-border/60 dy-bg-card/95 dy-px-3 dy-py-1.5 dy-text-xs dy-font-medium dy-text-muted-foreground dy-shadow-sm dy-backdrop-blur">
                      <div className="dy-h-3.5 dy-w-3.5 dy-animate-spin dy-rounded-full dy-border-2 dy-border-primary/20 dy-border-t-primary" />
                      Updating results...
                    </div>
                  </div>
                )}
                <div className={cn(
                  "dy-grid dy-grid-cols-2 dy-gap-3 dy-pb-8 sm:dy-grid-cols-3 md:dy-grid-cols-3 lg:dy-grid-cols-4 lg:dy-gap-4 xl:dy-grid-cols-5",
                  showSearchRefreshing && "dy-opacity-80"
                )}>
                  {mediaResponse?.map((item) => (
                    <MediaCard
                      key={item.id as string}
                      item={item}
                      baseUrl={client!.getBaseUrl()}
                      onDelete={() => deleteMutation.mutate(item.id as string)}
                      onMoveToFolder={() => setMovingItems([item])}
                      onClick={() => setSelectedItem(item)}
                      isSelected={selectedItem?.id === item.id}
                      aspectRatio={aspectRatio}
                    />
                  ))}
                  {/* Sentinel for infinite scroll */}
                  <div ref={sentinelRef} className="dy-w-full dy-col-span-full dy-flex dy-justify-center dy-py-4">
                    {isFetchingNextPage && (
                      <div className="dy-animate-spin dy-rounded-full dy-border-2 dy-border-primary/20 dy-border-t-primary dy-h-6 dy-w-6"></div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <MediaListView
                items={mediaResponse}
                baseUrl={client!.getBaseUrl()}
                selectedId={selectedItem?.id as string | undefined}
                sortValue={sortValue}
                onSort={setSortValue}
                onSelect={setSelectedItem}
                onMoveToFolder={(item) => setMovingItems([item])}
                onDelete={(id) => deleteMutation.mutate(id)}
                sentinelRef={sentinelRef}
                isFetchingNextPage={isFetchingNextPage}
                isRefreshing={showSearchRefreshing}
              />
            )}
          </div>

          <AdminComponentSlot
            slot="afterListTable"
            componentKeys={collectionSlots?.afterListTable}
            registry={components?.collectionList}
            componentProps={collectionComponentProps}
          />
        </div>
      </div>

      <AdminComponentSlot
        slot="afterList"
        componentKeys={collectionSlots?.afterList}
        registry={components?.collectionList}
        componentProps={collectionComponentProps}
      />

      <MediaInspector
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        baseUrl={client!.getBaseUrl()}
        folders={folders}
        onUpdate={(id, data) => updateMutation.mutate({ id, data })}
        onDelete={(id) => {
          deleteMutation.mutate(id)
          setSelectedItem(null)
        }}
      />

      <MoveToFolderDialog
        open={!!movingItems}
        onOpenChange={(open) => !open && setMovingItems(null)}
        folders={folders}
        itemCount={movingItems?.length || 0}
        onMove={handleMoveItems}
      />
    </div>
  )
}

/** Human-readable file size (B / KB / MB / GB). */
function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "—"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function MediaListView({ items, baseUrl, selectedId, sortValue, onSort, onSelect, onMoveToFolder, onDelete, sentinelRef, isFetchingNextPage, isRefreshing }: {
  items?: Media[]
  baseUrl: string
  selectedId?: string
  sortValue: SortValue
  onSort: (v: SortValue) => void
  onSelect: (item: Media) => void
  onMoveToFolder?: (item: Media) => void
  onDelete: (id: string) => void
  sentinelRef: (node: HTMLDivElement | null) => void
  isFetchingNextPage: boolean
  isRefreshing?: boolean
}) {
  // Clicking a column header toggles between its ascending/descending sort value.
  const toggleSort = (asc: SortValue, desc: SortValue) => onSort(sortValue === desc ? asc : desc)
  const indicator = (asc: SortValue, desc: SortValue) =>
    sortValue === asc ? "↑" : sortValue === desc ? "↓" : ""

  return (
    <div className="dy-relative dy-pb-8">
      {isRefreshing && (
        <div className="dy-pointer-events-none dy-absolute dy-right-0 dy-top-0 dy-z-10">
          <div className="dy-inline-flex dy-items-center dy-gap-2 dy-rounded-full dy-border dy-border-border/60 dy-bg-card/95 dy-px-3 dy-py-1.5 dy-text-xs dy-font-medium dy-text-muted-foreground dy-shadow-sm dy-backdrop-blur">
            <div className="dy-h-3.5 dy-w-3.5 dy-animate-spin dy-rounded-full dy-border-2 dy-border-primary/20 dy-border-t-primary" />
            Updating results...
          </div>
        </div>
      )}
      <div className="dy-overflow-hidden dy-rounded-2xl dy-border dy-border-border/50 dy-bg-card dy-shadow-sm">
        {/* Header */}
        <div className="dy-flex dy-items-center dy-gap-4 dy-border-b dy-border-border/50 dy-bg-muted/20 dy-px-4 dy-py-3 dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground">
          <div className="dy-w-10 dy-flex-shrink-0" />
          <button type="button" className="dy-flex dy-flex-1 dy-items-center dy-gap-1 dy-text-left hover:dy-text-foreground" onClick={() => toggleSort("filename", "-filename")}>
            Name <span className="dy-text-primary">{indicator("filename", "-filename")}</span>
          </button>
          <div className="dy-hidden dy-w-24 sm:dy-block">Type</div>
          <button type="button" className="dy-hidden dy-w-24 dy-items-center dy-gap-1 dy-text-left hover:dy-text-foreground sm:dy-flex" onClick={() => toggleSort("filesize", "-filesize")}>
            Size <span className="dy-text-primary">{indicator("filesize", "-filesize")}</span>
          </button>
          <button type="button" className="dy-hidden dy-w-32 dy-items-center dy-gap-1 dy-text-left hover:dy-text-foreground md:dy-flex" onClick={() => toggleSort("createdAt", "-createdAt")}>
            Date <span className="dy-text-primary">{indicator("createdAt", "-createdAt")}</span>
          </button>
          <div className="dy-w-24 dy-flex-shrink-0 dy-text-right">Actions</div>
        </div>

        {/* Rows */}
        {items?.map((item) => {
          const isImage = item.mimeType?.startsWith("image/")
          const isExternalVideo = item.mimeType === "video/youtube" || item.mimeType === "video/vimeo"
          const preview = getMediaPreviewUrl(item, baseUrl)
          const hasPreview = (isImage || isExternalVideo) && !!preview
          const fileUrl = getMediaUrl(item, baseUrl)
          const createdAt = (item as { createdAt?: string }).createdAt
          return (
            <div
              key={item.id as string}
              onClick={() => onSelect(item)}
              className={cn(
                "dy-flex dy-items-center dy-gap-4 dy-border-b dy-border-border/30 dy-px-4 dy-py-2.5 dy-cursor-pointer dy-transition-colors hover:dy-bg-muted/30 last:dy-border-b-0",
                selectedId === item.id && "dy-bg-primary/5"
              )}
            >
              <div className="dy-relative dy-flex dy-h-10 dy-w-10 dy-flex-shrink-0 dy-items-center dy-justify-center dy-overflow-hidden dy-rounded-lg dy-bg-muted/40">
                {hasPreview ? (
                  <img src={preview} alt="" className="dy-h-full dy-w-full dy-object-cover" loading="lazy" />
                ) : (
                  <FileIcon className="dy-h-4 dy-w-4 dy-text-muted-foreground/50" />
                )}
                {isExternalVideo && (
                  <div className="dy-absolute dy-inset-0 dy-flex dy-items-center dy-justify-center dy-bg-black/30">
                    <Video className="dy-h-3 dy-w-3 dy-text-white" />
                  </div>
                )}
              </div>
              <div className="dy-min-w-0 dy-flex-1">
                <p className="dy-truncate dy-text-sm dy-font-semibold dy-text-foreground/90" title={item.filename}>{getDisplayFilename(item.filename)}</p>
                <p className="dy-truncate dy-text-[11px] dy-text-muted-foreground sm:dy-hidden">
                  {(item.mimeType?.split("/")[1] || "file")} · {formatBytes(item.filesize)}
                </p>
              </div>
              <div className="dy-hidden dy-w-24 dy-truncate dy-text-xs dy-text-muted-foreground sm:dy-block">{item.mimeType?.split("/")[1] || "file"}</div>
              <div className="dy-hidden dy-w-24 dy-text-xs dy-text-muted-foreground sm:dy-block">{formatBytes(item.filesize)}</div>
              <div className="dy-hidden dy-w-32 dy-text-xs dy-text-muted-foreground md:dy-block">{createdAt ? new Date(createdAt).toLocaleDateString() : "—"}</div>
              <div className="dy-flex dy-w-24 dy-flex-shrink-0 dy-items-center dy-justify-end dy-gap-1" onClick={(e) => e.stopPropagation()}>
                {onMoveToFolder && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="dy-h-8 dy-w-8 dy-text-muted-foreground hover:dy-bg-muted hover:dy-text-foreground"
                    onClick={() => onMoveToFolder(item)}
                    title="Move to Folder"
                  >
                    <FolderInput className="dy-h-4 dy-w-4" />
                  </Button>
                )}
                {fileUrl && (
                  <a
                    href={fileUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    title="Download"
                    className="dy-inline-flex dy-h-8 dy-w-8 dy-items-center dy-justify-center dy-rounded-lg dy-text-muted-foreground hover:dy-bg-muted hover:dy-text-foreground"
                  >
                    <Download className="dy-h-4 dy-w-4" />
                  </a>
                )}
                <Button variant="ghost" size="icon" className="dy-h-8 dy-w-8 dy-text-destructive hover:dy-bg-destructive/10" onClick={() => onDelete(item.id as string)} title="Delete">
                  <Trash2 className="dy-h-4 dy-w-4" />
                </Button>
              </div>
            </div>
          )
        })}

        <div ref={sentinelRef} className="dy-flex dy-justify-center dy-py-4">
          {isFetchingNextPage && (
            <div className="dy-h-6 dy-w-6 dy-animate-spin dy-rounded-full dy-border-2 dy-border-primary/20 dy-border-t-primary" />
          )}
        </div>
      </div>
    </div>
  )
}

function MediaCard({ item, baseUrl, onDelete, onMoveToFolder, onClick, isSelected, aspectRatio = "square" }: {
  item: Media,
  baseUrl: string,
  onDelete: () => void,
  onMoveToFolder?: () => void,
  onClick: () => void,
  isSelected: boolean,
  aspectRatio?: AspectRatioMode,
}) {
  const isImage = item.mimeType?.startsWith("image/")
  const isExternalVideo = item.mimeType === "video/youtube" || item.mimeType === "video/vimeo"
  const previewUrl = getMediaPreviewUrl(item, baseUrl)
  const hasPreview = (isImage || isExternalVideo) && !!previewUrl

  const calculatedRatio = aspectRatio === "16/9" ? 16 / 9 : (aspectRatio === "original" && item.aspectRatio ? (item.aspectRatio as number) : 1)

  return (
    <Card
      className={cn(
        "dy-overflow-hidden dy-group dy-relative dy-border-border/40 dy-bg-card dy-shadow-sm hover:dy-shadow-xl dy-transition-all dy-duration-300 dy-rounded-lg dy-cursor-pointer",
        isSelected && "dy-ring-2 dy-ring-primary dy-ring-offset-2 dy-shadow-lg dy-scale-[0.98]"
      )}
      onClick={onClick}
    >
      <CardHeader className="!dy-p-0 dy-border-b dy-border-border/10">
        <AspectRatio ratio={calculatedRatio} className="dy-bg-muted/30 dy-overflow-hidden dy-relative">
          {(() => {
            const info = getMediaSourceInfo(item)
            if (info.source !== "external") return null
            return (
              <div className="dy-absolute dy-top-2 dy-left-2 dy-z-30 dy-flex dy-items-center dy-gap-1 dy-rounded-md dy-bg-black/60 dy-backdrop-blur-md dy-px-2 dy-py-0.5 dy-text-[9px] dy-font-bold dy-text-white dy-uppercase">
                <Globe className="dy-h-2.5 dy-w-2.5" />
                {info.label}
              </div>
            )
          })()}
          {hasPreview ? (
            <>
              {item.blurhash && (
                <div className="dy-absolute dy-inset-0 dy-z-0">
                  <Blurhash
                    hash={item.blurhash}
                    width="100%"
                    height="100%"
                    resolutionX={32}
                    resolutionY={32}
                    punch={1}
                  />
                </div>
              )}
              <img
                src={previewUrl}
                alt={item.filename}
                className="dy-object-cover dy-w-full dy-h-full dy-transition-transform dy-duration-500 dy-group-hover:dy-scale-110 dy-relative dy-z-10"
                loading="lazy"
              />
              {isExternalVideo && (
                <div className="dy-absolute dy-inset-0 dy-z-20 dy-flex dy-items-center dy-justify-center dy-pointer-events-none">
                  <div className="dy-h-10 dy-w-10 dy-rounded-full dy-bg-black/50 dy-backdrop-blur-sm dy-flex dy-items-center dy-justify-center">
                    <Video className="dy-h-5 dy-w-5 dy-text-white" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="dy-flex dy-items-center dy-justify-center dy-h-full dy-bg-primary/5">
              <FileIcon className="dy-h-10 dy-w-10 dy-text-primary/40" />
            </div>
          )}
        </AspectRatio>
      </CardHeader>
      <CardContent className="!dy-p-3 dy-bg-card">
        <p className="dy-text-[11px] dy-font-bold dy-truncate dy-text-foreground/90 dy-mb-0.5" title={item.filename}>
          {getDisplayFilename(item.filename)}
        </p>
        <div className="dy-flex dy-items-center dy-justify-between">
          <p className="dy-text-[9px] dy-text-muted-foreground dy-font-bold dy-uppercase dy-tracking-wider">
            {item.mimeType?.split("/")[1] || "file"}
          </p>
          <p className="dy-text-[9px] dy-text-muted-foreground dy-font-medium">
            {((item.filesize || (item.size as number) || 0) / 1024).toFixed(1)} KB
          </p>
        </div>
      </CardContent>
      <div className="dy-absolute dy-top-2 dy-right-2 dy-z-30 dy-flex dy-items-center dy-gap-1.5" onClick={(e) => e.stopPropagation()}>
        {onMoveToFolder && (
          <Button
            size="icon"
            variant="secondary"
            className="dy-h-7 dy-w-7 dy-rounded-md dy-bg-background/80 hover:dy-bg-background dy-backdrop-blur-sm dy-shadow-sm dy-text-foreground dy-opacity-90 sm:dy-opacity-0 sm:dy-group-hover:dy-opacity-100 dy-transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onMoveToFolder()
            }}
            title="Move to Folder"
          >
            <FolderInput className="dy-h-3.5 dy-w-3.5" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="secondary"
              className="dy-h-7 dy-w-7 dy-rounded-md dy-bg-background/80 hover:dy-bg-background dy-backdrop-blur-sm dy-shadow-sm dy-text-foreground dy-opacity-90 sm:dy-opacity-0 sm:dy-group-hover:dy-opacity-100 dy-transition-opacity"
            >
              <MoreVertical className="dy-h-3.5 dy-w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dy-w-44" onClick={(e) => e.stopPropagation()}>
            {onMoveToFolder && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveToFolder()
                }}
              >
                <FolderInput className="dy-h-3.5 dy-w-3.5 dy-mr-2 dy-text-primary" />
                Move to Folder...
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
            >
              <Pencil className="dy-h-3.5 dy-w-3.5 dy-mr-2" />
              Inspect Asset
            </DropdownMenuItem>
            {previewUrl && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(previewUrl)
                  toast.success("CDN URL copied")
                }}
              >
                <Copy className="dy-h-3.5 dy-w-3.5 dy-mr-2" />
                Copy URL
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="dy-text-destructive focus:dy-text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm("Are you sure you want to delete this file?")) {
                  onDelete()
                }
              }}
            >
              <Trash2 className="dy-h-3.5 dy-w-3.5 dy-mr-2" />
              Delete Asset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}

function FileUploader({ collectionSlug, files, setFiles, onComplete }: {
  collectionSlug?: string,
  files: File[],
  setFiles: React.Dispatch<React.SetStateAction<File[]>>,
  onComplete: () => void
}) {
  const {
    isUploading: uploading,
    queue,
    uploadFiles,
  } = useMediaUpload({
    collectionSlug: collectionSlug || "media",
    onAllCompleted: (items: any[]) => {
      setFiles([])
      onComplete()
      toast.success(`${items.length} asset(s) uploaded successfully`)
    },
    onError: (error: Error) => toast.error("Failed to upload assets", { description: error.message }),
  })

  const progress = React.useMemo(() => {
    if (queue.length === 0) return 0
    const total = queue.reduce((acc: number, q: { progress: number }) => acc + q.progress, 0)
    return Math.round(total / queue.length)
  }, [queue])

  const {
    url: externalUrl,
    setUrl: setExternalUrl,
    submit: handleAddUrl,
    isSubmitting: addingUrl,
  } = useMediaURL({
    collection: collectionSlug || "media",
    onAdded: () => {
      toast.success("External media added")
      onComplete()
    },
    onError: (error: Error) => toast.error("Failed to add media from URL", { description: error.message }),
  })

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [setFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const handleUpload = async () => {
    if (files.length === 0) return
    await uploadFiles(files)
  }


  return (
    <Tabs defaultValue="files" className="dy-w-full">
      <TabsList className="dy-grid dy-w-full dy-grid-cols-2">
        <TabsTrigger value="files" className="dy-gap-2">
          <Upload className="dy-h-4 dy-w-4" />
          Upload Files
        </TabsTrigger>
        <TabsTrigger value="url" className="dy-gap-2">
          <LinkIcon className="dy-h-4 dy-w-4" />
          From URL
        </TabsTrigger>
      </TabsList>

      <TabsContent value="files" className="dy-mt-0 dy-space-y-6 dy-py-6 dy-px-4">
        <div
          {...getRootProps()}
          className={`dy-border-2 dy-border-dashed dy-rounded-2xl dy-p-12 dy-text-center dy-cursor-pointer dy-transition-all dy-duration-300 ${isDragActive
            ? "dy-border-primary dy-bg-primary/5 dy-scale-[0.98]"
            : "dy-border-muted-foreground/20 hover:dy-border-primary/40 hover:dy-bg-muted/5"
            }`}
        >
          <input {...getInputProps()} />
          <div className="dy-h-16 dy-w-16 dy-rounded-2xl dy-bg-primary/10 dy-flex dy-items-center dy-justify-center dy-mx-auto dy-mb-4">
            <Upload className="dy-h-8 dy-w-8 dy-text-primary" />
          </div>
          <p className="dy-text-xl dy-font-bold dy-text-foreground">Drag & drop assets</p>
          <p className="dy-text-sm dy-text-muted-foreground dy-mt-1">or click to browse your files</p>
        </div>

        {files.length > 0 && (
          <div className="dy-space-y-4 dy-animate-in dy-fade-in dy-slide-in-from-bottom-4">
            <div className="dy-flex dy-items-center dy-justify-between">
              <p className="dy-text-sm dy-font-bold dy-text-foreground">{files.length} assets selected</p>
              <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={uploading} className="dy-text-xs dy-h-8">
                Clear All
              </Button>
            </div>

            <div className="dy-max-h-[240px] dy-overflow-auto dy-space-y-2 dy-pr-2 dy-custom-scrollbar">
              {files.map((file, idx) => (
                <div key={idx} className="dy-flex dy-items-center dy-justify-between dy-p-3 dy-bg-muted/30 dy-border dy-border-border/40 dy-rounded-lg dy-text-sm dy-group dy-transition-colors hover:dy-bg-muted/50">
                  <div className="dy-flex dy-items-center dy-gap-3 dy-truncate">
                    <div className="dy-h-8 dy-w-8 dy-rounded-lg dy-bg-card dy-border dy-border-border/60 dy-flex dy-items-center dy-justify-center dy-flex-shrink-0">
                      <FileIcon className="dy-h-4 dy-w-4 dy-text-muted-foreground" />
                    </div>
                    <span className="dy-truncate dy-font-medium dy-text-foreground/80">{file.name}</span>
                  </div>
                  <span className="dy-text-muted-foreground dy-text-[10px] dy-font-bold dy-bg-card dy-px-2 dy-py-1 dy-rounded dy-border dy-border-border/40 dy-ml-4">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>

            {uploading && (
              <div className="dy-space-y-2 dy-pt-2">
                <div className="dy-flex dy-justify-between dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="dy-h-2 dy-rounded-full" />
              </div>
            )}

            <div className="dy-flex dy-justify-end dy-pt-4 dy-border-t dy-border-border/40">
              <Button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="dy-w-full dy-h-12 dy-rounded-lg dy-bg-primary hover:dy-bg-primary/90 dy-text-card dy-font-bold dy-shadow-lg dy-shadow-primary/20 dy-transition-all active:dy-scale-[0.98]"
              >
                {uploading ? (
                  <span className="dy-flex dy-items-center dy-gap-2">
                    <div className="dy-h-4 dy-w-4 dy-border-2 dy-border-card/30 dy-border-t-card dy-rounded-full dy-animate-spin" />
                    Uploading Assets...
                  </span>
                ) : `Upload ${files.length} Assets`}
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="url" className="dy-mt-0 dy-space-y-5 dy-py-6 dy-px-4">
        <div className="dy-h-16 dy-w-16 dy-rounded-2xl dy-bg-primary/10 dy-flex dy-items-center dy-justify-center dy-mx-auto">
          <Globe className="dy-h-8 dy-w-8 dy-text-primary" />
        </div>
        <div className="dy-text-center">
          <p className="dy-text-xl dy-font-bold dy-text-foreground">Add media from a URL</p>
          <p className="dy-text-sm dy-text-muted-foreground dy-mt-1">
            Paste a YouTube or Vimeo link, or a direct link to an image or file.
          </p>
        </div>
        <div className="dy-flex dy-flex-col dy-gap-3 sm:dy-flex-row">
          <Input
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !addingUrl && externalUrl.trim()) {
                e.preventDefault()
                handleAddUrl()
              }
            }}
            placeholder="https://youtube.com/watch?v=…"
            disabled={addingUrl}
            className="dy-h-12 dy-flex-1"
          />
          <Button
            onClick={handleAddUrl}
            disabled={addingUrl || !externalUrl.trim()}
            className="dy-h-12 dy-rounded-lg dy-bg-primary hover:dy-bg-primary/90 dy-text-card dy-font-bold dy-shadow-lg dy-shadow-primary/20 dy-transition-all active:dy-scale-[0.98] sm:dy-w-auto"
          >
            {addingUrl ? (
              <span className="dy-flex dy-items-center dy-gap-2">
                <div className="dy-h-4 dy-w-4 dy-border-2 dy-border-card/30 dy-border-t-card dy-rounded-full dy-animate-spin" />
                Adding…
              </span>
            ) : "Add Media"}
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  )
}
