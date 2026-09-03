import * as React from "react"
import { useDyrected } from "../../providers/dyrected-context"
import { type MediaRecord } from "../../controllers/media"

/** Dynamic media-collection documents carry arbitrary fields alongside the typed core. */
type LooseMediaRecord = MediaRecord & Record<string, unknown>
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "../ui/tabs"
import {
  Image as ImageIcon,
  Video,
  Search,
  Upload,
  Library,
  Check,
  Globe,
  Sparkles,
  FileIcon,
  Copy,
  Music,
  FileText,
  HardDrive,
  AlertCircle,
  RotateCw,
  X,
  Link as LinkIcon,
  Info
} from "lucide-react"
import { Input } from "../ui/input"
import { cn, getDisplayFilename, getTransformedMediaUrl } from "../../lib/utils"
import { getMediaPreviewUrl } from "../../lib/external-media"
import { getMediaSourceInfo, resolveActiveMediaCollection, isStorageNotConfiguredError } from "../../lib/media-utils"
import { StorageNotConfiguredNotice } from "./storage-notice"
import { useMediaLibrary } from "../../hooks/use-media-library"
import { useMediaURL } from "../../hooks/use-media-url"
import { useMediaUpload } from "../../hooks/use-media-upload"
import { useMediaFolders } from "../../hooks/use-media-folders"
import { FolderPillCarousel } from "./folder-pill-carousel"
import { type MimeFilterType } from "./media-filter-bar"
import { useDropzone } from "react-dropzone"
import { Progress } from "../ui/progress"
import { Blurhash } from "react-blurhash"
import { toast } from "sonner"
import type { Media } from "@dyrected/sdk"

interface MediaLibraryDialogProps {
  collection: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedValues: (string | Media)[]
  onSelect: (id: string, item?: Media) => void
  multiple?: boolean
  onConfirm?: (selectedIds: string[], selectedItems?: Media[]) => void
}

const MIME_CHIPS: Array<{ key: MimeFilterType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "all", label: "All", icon: Library },
  { key: "image", label: "Images", icon: ImageIcon },
  { key: "video", label: "Videos", icon: Video },
  { key: "audio", label: "Audio", icon: Music },
  { key: "document", label: "Docs", icon: FileText },
]

export function MediaLibraryDialog({
  collection,
  isOpen,
  onOpenChange,
  selectedValues,
  onSelect,
  multiple,
  onConfirm
}: MediaLibraryDialogProps) {
  const { client, schemas } = useDyrected()
  const activeMediaCollection = React.useMemo(
    () => resolveActiveMediaCollection(schemas, collection),
    [schemas, collection]
  )
  const schema = React.useMemo(
    () => schemas?.collections?.find((c: { slug: string }) => c.slug === activeMediaCollection),
    [schemas, activeMediaCollection]
  )
  const collectionLabel = React.useMemo(
    () => schema?.labels?.plural ?? schema?.labels?.singular ?? (activeMediaCollection && activeMediaCollection !== "media" ? (activeMediaCollection.charAt(0).toUpperCase() + activeMediaCollection.slice(1)) : "Media Library"),
    [schema, activeMediaCollection]
  )
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("library")
  const [mimeFilter, setMimeFilter] = React.useState<MimeFilterType>("all")
  const [selectedItem, setSelectedItem] = React.useState<(Media & { id?: string }) | null>(null)

  const {
    folders,
    activeFolderId,
    setActiveFolderId,
    createFolder,
    getBreadcrumbs,
  } = useMediaFolders(activeMediaCollection)

  const getIdentifier = React.useCallback((v: unknown): string => {
    if (!v) return ""
    if (typeof v === "object" && v !== null) {
      const obj = v as Record<string, unknown>
      return String(obj.id || obj._id || obj.filename || "")
    }
    const strVal = String(v)
    if (strVal.includes("/")) {
      return strVal.split("/").pop() || strVal
    }
    return strVal
  }, [])

  const sVals = React.useMemo(() => {
    return (selectedValues || []).map(getIdentifier).filter(Boolean)
  }, [selectedValues, getIdentifier])

  const {
    items: media,
    load,
    search,
    setFolder,
    setMimeFilter: setControllerMimeFilter,
    loadNextPage,
    hasNextPage,
    isLoading: isFetchingMedia,
    error: mediaQueryError,
    selectedItems,
    setSelectedIds,
    select,
    deselect,
    clearSelection,
  } = useMediaLibrary({
    collection: activeMediaCollection,
    initialFolderId: activeFolderId,
    initialMimeFilter: mimeFilter,
  })

  React.useEffect(() => {
    if (!isOpen) return
    void (searchQuery ? search(searchQuery) : load())
  }, [isOpen, load, search, searchQuery])

  React.useEffect(() => {
    if (!isOpen) return
    void setFolder(activeFolderId)
  }, [isOpen, activeFolderId, setFolder])

  React.useEffect(() => {
    if (!isOpen) return
    void setControllerMimeFilter(mimeFilter)
  }, [isOpen, mimeFilter, setControllerMimeFilter])

  React.useEffect(() => {
    setSelectedIds(sVals)
  }, [sVals, setSelectedIds])

  const observerRef = React.useRef<IntersectionObserver | null>(null)

  const sentinelRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      if (node && hasNextPage && !isFetchingMedia) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              void loadNextPage()
            }
          },
          { rootMargin: "100px" }
        )
        observerRef.current.observe(node)
      }
    },
    [hasNextPage, isFetchingMedia, loadNextPage]
  )

  const uploadConfig = typeof schema?.upload === "object" ? (schema.upload as { mimeTypes?: string[] }) : undefined
  const allowedMimeTypes = uploadConfig?.mimeTypes

  const dropzoneAccept = React.useMemo(() => {
    if (allowedMimeTypes && allowedMimeTypes.length > 0) {
      const acceptMap: Record<string, string[]> = {}
      for (const mime of allowedMimeTypes) {
        acceptMap[mime] = []
      }
      return acceptMap
    }
    return {
      "image/*": [],
      "video/*": [],
      "audio/*": [],
      "application/pdf": [],
    }
  }, [allowedMimeTypes])

  const {
    queue,
    uploadFiles,
    retryUpload,
    removeQueueItem,
    clearQueue,
  } = useMediaUpload({
    collectionSlug: activeMediaCollection,
    onCompletedItem: async (_result) => {
      await (searchQuery ? search(searchQuery) : load())
    },
    onAllCompleted: async (results) => {
      await (searchQuery ? search(searchQuery) : load())
      if (results.length > 0) {
        setSelectedItem(results[results.length - 1])
      }
      setActiveTab("library")
      toast.success(`Uploaded ${results.length} asset${results.length > 1 ? "s" : ""} to library! Select any to insert.`)
    },
  })

  const hasStorageError = React.useMemo(() => {
    return isStorageNotConfiguredError(mediaQueryError) || queue.some(item => isStorageNotConfiguredError(item.error))
  }, [mediaQueryError, queue])

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        uploadFiles(acceptedFiles)
        setActiveTab("upload")
      }
    },
    [uploadFiles]
  )

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent | ClipboardEvent) => {
      const items = (e as React.ClipboardEvent).clipboardData?.items || (e as ClipboardEvent).clipboardData?.items
      if (!items) return

      const filesToUpload: File[] = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const file = items[i].getAsFile()
          if (file) {
            filesToUpload.push(file)
          }
        }
      }

      if (filesToUpload.length > 0) {
        e.preventDefault()
        uploadFiles(filesToUpload)
        setActiveTab("upload")
        toast.info(
          `Uploading ${filesToUpload.length} file${filesToUpload.length > 1 ? "s" : ""} from clipboard...`
        )
      }
    },
    [uploadFiles]
  )

  React.useEffect(() => {
    if (!isOpen) return

    const onWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      let hasFile = false
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          hasFile = true
          break
        }
      }
      if (hasFile) {
        handlePaste(e)
      }
    }

    window.addEventListener("paste", onWindowPaste)
    return () => window.removeEventListener("paste", onWindowPaste)
  }, [isOpen, handlePaste])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: dropzoneAccept,
  })

  const {
    url: externalUrl,
    setUrl: setExternalUrl,
    submit: handleExternalUrlSubmit,
    isSubmitting: isAddingUrl,
  } = useMediaURL({
    collection: activeMediaCollection,
    onAdded: async (result) => {
      await (searchQuery ? search(searchQuery) : load())
      onSelect(result.id, result)
      setSelectedItem(result)
      setActiveTab("library")
    },
    onError: () => alert("Failed to add URL. Please make sure it is valid."),
  })

  const getPreviewUrl = (item: { url?: string; mimeType?: string;[key: string]: unknown }) =>
    getMediaPreviewUrl(item, client?.getBaseUrl() || "")

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(sVals, selectedItems)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onPaste={handlePaste} className="dy-h-[94dvh] dy-w-[calc(100vw)] !dy-max-w-[calc(100vw)] sm:dy-w-[96vw] sm:!dy-max-w-[96vw] md:dy-w-[96vw] md:!dy-max-w-[96vw] lg:dy-w-[96vw] lg:!dy-max-w-[1600px] dy-gap-0 dy-overflow-hidden dy-border-none dy-bg-background dy-p-0 dy-shadow-2xl dy-rounded-xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="dy-flex dy-h-full dy-flex-col">
          <div className="dy-flex dy-flex-col dy-gap-4 dy-border-b dy-border-border dy-bg-muted/20 dy-px-4 dy-py-4 sm:dy-flex-row sm:dy-items-center sm:dy-justify-between sm:dy-px-6">
            <div className="dy-flex dy-min-w-0 dy-items-center dy-gap-3 sm:dy-gap-4">
              <DialogTitle className="dy-min-w-0 dy-truncate dy-text-lg dy-font-serif dy-font-bold dy-tracking-tight sm:dy-text-xl">{collectionLabel}</DialogTitle>
              {multiple && sVals.length > 0 && (
                <div className="dy-flex dy-items-center dy-gap-2 dy-px-3 dy-py-1 dy-bg-primary/10 dy-rounded-full dy-border dy-border-primary/20 dy-animate-in dy-fade-in dy-slide-in-from-left-2">
                  <span className="dy-text-xs dy-font-bold dy-text-primary">{sVals.length} Selected</span>
                  <Button variant="ghost" size="icon" className="dy-h-4 dy-w-4 dy-text-primary hover:dy-bg-transparent" onClick={handleConfirm}>
                    <Check className="dy-h-3 dy-w-3" />
                  </Button>
                </div>
              )}
            </div>
            <TabsList className="dy-grid dy-h-auto dy-grid-cols-3 dy-bg-muted/50 dy-p-1 dy-rounded-lg sm:dy-flex">
              <TabsTrigger value="library" className="dy-gap-1.5 dy-rounded-lg dy-px-2 dy-font-bold dy-text-[10px] dy-uppercase dy-tracking-wider dy-transition-all data-[state=active]:dy-bg-background data-[state=active]:dy-shadow-sm sm:dy-gap-2 sm:dy-px-4 sm:dy-text-xs">
                <Library className="dy-h-3.5 dy-w-3.5" /> Library
              </TabsTrigger>
              <TabsTrigger value="upload" className="dy-gap-1.5 dy-rounded-lg dy-px-2 dy-font-bold dy-text-[10px] dy-uppercase dy-tracking-wider dy-transition-all data-[state=active]:dy-bg-background data-[state=active]:dy-shadow-sm sm:dy-gap-2 sm:dy-px-4 sm:dy-text-xs">
                <Upload className="dy-h-3.5 dy-w-3.5" /> Upload
                {queue.filter(q => q.status === "uploading" || q.status === "queued").length > 0 && (
                  <span className="dy-ml-1 dy-px-1.5 dy-py-0.5 dy-text-[9px] dy-bg-primary dy-text-white dy-rounded-full dy-animate-pulse">
                    {queue.filter(q => q.status === "uploading" || q.status === "queued").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="external" className="dy-gap-1.5 dy-rounded-lg dy-px-2 dy-font-bold dy-text-[10px] dy-uppercase dy-tracking-wider dy-transition-all data-[state=active]:dy-bg-background data-[state=active]:dy-shadow-sm sm:dy-gap-2 sm:dy-px-4 sm:dy-text-xs">
                <Globe className="dy-h-3.5 dy-w-3.5" /> External
              </TabsTrigger>
            </TabsList>
          </div>

          {hasStorageError && (
            <div className="dy-px-4 dy-pt-4 sm:dy-px-6">
              <StorageNotConfiguredNotice variant="banner" />
            </div>
          )}

          <div className="dy-min-h-0 dy-flex-1 dy-overflow-hidden dy-relative">
            <TabsContent value="library" className="data-[state=active]:dy-flex dy-h-full dy-m-0 dy-p-0 focus-visible:dy-ring-0 dy-overflow-hidden">
              <div className="dy-flex dy-h-full dy-w-full dy-flex-col lg:dy-flex-row dy-overflow-hidden">
                <div className="dy-flex dy-min-h-0 dy-flex-1 dy-flex-col dy-space-y-3 dy-border-b dy-p-3 sm:dy-p-4 lg:dy-border-b-0 lg:dy-border-r dy-border-border dy-overflow-hidden">
                  {/* Folders Navigation Pill Carousel */}
                  <FolderPillCarousel
                    folders={folders}
                    activeFolderId={activeFolderId}
                    breadcrumbs={getBreadcrumbs(activeFolderId)}
                    onSelectFolder={setActiveFolderId}
                    onCreateFolder={(name, parentId) => createFolder(name, parentId)}
                  />

                  {/* Search and MIME Chips */}
                  <div className="dy-flex dy-flex-col dy-gap-2 sm:dy-flex-row sm:dy-items-center">
                    <div className="dy-relative dy-flex-1 dy-group">
                      <Search className="dy-absolute dy-left-3 dy-top-1/2 dy--translate-y-1/2 dy-h-3.5 dy-w-3.5 dy-text-muted-foreground dy-group-focus-within:dy-text-primary dy-transition-colors" />
                      <Input
                        placeholder="Search assets..."
                        className="dy-pl-9 dy-h-9 dy-text-xs dy-rounded-lg dy-border-muted dy-bg-muted/10 focus:dy-bg-background dy-transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* MIME Filter Chips */}
                    <div className="dy-flex dy-items-center dy-gap-1 dy-overflow-x-auto dy-pb-1 sm:dy-pb-0">
                      {MIME_CHIPS.map((chip) => {
                        const Icon = chip.icon
                        const isActive = mimeFilter === chip.key
                        return (
                          <button
                            key={chip.key}
                            type="button"
                            onClick={() => setMimeFilter(chip.key)}
                            className={cn(
                              "dy-flex dy-items-center dy-gap-1 dy-px-2.5 dy-py-1 dy-rounded-full dy-text-[11px] dy-font-medium dy-transition-all dy-shrink-0",
                              isActive
                                ? "dy-bg-primary dy-text-primary-foreground dy-shadow-xs"
                                : "dy-bg-muted/40 dy-text-muted-foreground hover:dy-bg-muted hover:dy-text-foreground"
                            )}
                          >
                            <Icon className="dy-h-3 dy-w-3" />
                            <span>{chip.label}</span>
                          </button>
                        )
                      })}
                    </div>

                    {multiple && (
                      <div className="dy-flex dy-items-center dy-gap-1 dy-rounded-lg dy-bg-muted/30 dy-p-0.5 sm:dy-ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="dy-h-7 dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-px-2 hover:dy-bg-background dy-rounded-md"
                          onClick={() => {
                            media?.forEach((item: LooseMediaRecord) => {
                              if (!sVals.some(v => v === item.id || v === item.filename || v === item.url)) {
                                select(item.id!)
                                onSelect(item.id!, item as unknown as Media)
                              }
                            })
                          }}
                        >
                          All
                        </Button>
                        <div className="dy-w-px dy-h-3 dy-bg-border/50" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="dy-h-7 dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-px-2 dy-text-destructive hover:dy-text-destructive hover:dy-bg-destructive/10 dy-rounded-md"
                          onClick={() => {
                            clearSelection()
                            sVals.forEach(val => {
                              const item = media?.find((m: LooseMediaRecord) => m.id === val || m.filename === val || m.url === val)
                              onSelect(val, item as unknown as Media)
                            })
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="dy-min-h-0 dy-flex-1 dy-overflow-y-auto dy-overscroll-contain dy--mx-1 dy-px-1">
                    <div className="dy-grid dy-grid-cols-2 dy-gap-3 dy-pb-4 sm:dy-grid-cols-3 md:dy-grid-cols-4 lg:dy-grid-cols-5 xl:dy-grid-cols-6 2xl:dy-grid-cols-7">
                      {media?.map((item: LooseMediaRecord) => {
                        const sourceInfo = getMediaSourceInfo(item)
                        const previewUrl = getPreviewUrl(item)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (multiple) {
                                if (sVals.some(v => v === item.id || v === item.filename || v === item.url)) {
                                  deselect(item.id!)
                                } else {
                                  select(item.id!)
                                }
                                onSelect(item.id!, item as unknown as Media)
                                setSelectedItem(item as Media & { id?: string })
                              } else {
                                if (selectedItem?.id === item.id) {
                                  onSelect(item.id!, item as unknown as Media)
                                  onOpenChange(false)
                                } else {
                                  setSelectedItem(item as Media & { id?: string })
                                }
                              }
                            }}
                            className={cn(
                              "dy-relative dy-group dy-rounded-lg dy-overflow-hidden dy-border-2 dy-aspect-square dy-transition-all hover:dy-scale-[1.02] active:dy-scale-95 dy-shadow-sm dy-bg-muted/5",
                              selectedItem?.id === item.id
                                ? "dy-border-primary dy-ring-4 dy-ring-primary/10 dy-shadow-lg dy-shadow-primary/5"
                                : "dy-border-border/40 hover:dy-border-border"
                            )}
                          >
                            {item.blurhash ? (
                              <div className="dy-absolute dy-inset-0 dy-z-0">
                                <Blurhash
                                  hash={item.blurhash as string}
                                  width="100%"
                                  height="100%"
                                  resolutionX={32}
                                  resolutionY={32}
                                  punch={1}
                                />
                              </div>
                            ) : null}
                            <img
                              src={previewUrl}
                              alt={String(item.filename ?? "")}
                              className="dy-object-cover dy-w-full dy-h-full dy-relative dy-z-10"
                              loading="lazy"
                            />
                            {/* External vs Storage Source Badge */}
                            <div className="dy-absolute dy-top-1.5 dy-left-1.5 dy-z-20">
                              {sourceInfo.source === "external" ? (
                                <span className="dy-inline-flex dy-items-center dy-gap-1 dy-px-1.5 dy-py-0.5 dy-rounded-md dy-bg-sky-950/80 dy-backdrop-blur-md dy-text-sky-300 dy-text-[8px] dy-font-black dy-uppercase dy-tracking-wider dy-border dy-border-sky-400/30 dy-shadow-md">
                                  <Globe className="dy-h-2.5 dy-w-2.5" />
                                  {sourceInfo.type === "youtube" ? "YT" : sourceInfo.type === "vimeo" ? "VIM" : "EXT"}
                                </span>
                              ) : (
                                <span className="dy-inline-flex dy-items-center dy-gap-1 dy-px-1.5 dy-py-0.5 dy-rounded-md dy-bg-black/60 dy-backdrop-blur-md dy-text-white/90 dy-text-[8px] dy-font-bold dy-uppercase dy-tracking-wider dy-border dy-border-white/20">
                                  <HardDrive className="dy-h-2.5 dy-w-2.5" />
                                </span>
                              )}
                            </div>

                            {sVals.some(v => v === item.id || v === item.filename || v === item.url) && (
                              <div className="dy-absolute dy-top-2 dy-right-2 dy-z-30 dy-h-6 dy-w-6 dy-bg-primary dy-rounded-full dy-flex dy-items-center dy-justify-center dy-text-white dy-shadow-xl dy-animate-in dy-zoom-in dy-border-2 dy-border-white">
                                <Check className="dy-h-3.5 dy-w-3.5" />
                              </div>
                            )}
                            {(typeof item.mimeType === 'string' && item.mimeType.startsWith('video/') || item.mimeType === 'video/youtube' || item.mimeType === 'video/vimeo' || item.mimeType === 'video/external') && (
                              <div className="dy-absolute dy-inset-0 dy-z-20 dy-flex dy-items-center dy-justify-center dy-bg-black/20 dy-group-hover:dy-bg-black/40 dy-transition-colors">
                                <div className="dy-h-9 dy-w-9 dy-bg-background/30 dy-backdrop-blur-md dy-rounded-full dy-flex dy-items-center dy-justify-center dy-border dy-border-white/30 dy-shadow-2xl">
                                  <Video className="dy-h-4 dy-w-4 dy-text-white" />
                                </div>
                              </div>
                            )}
                            <div className="dy-absolute dy-inset-x-0 dy-bottom-0 dy-z-20 dy-p-2 dy-bg-gradient-to-t dy-from-black/80 dy-via-black/40 dy-to-transparent dy-opacity-100 dy-transition-opacity sm:dy-opacity-0 sm:dy-group-hover:dy-opacity-100">
                              <p className="dy-text-[9px] dy-text-white dy-truncate dy-font-bold dy-uppercase dy-tracking-wider">{getDisplayFilename(String(item.filename ?? ""))}</p>
                            </div>
                          </button>
                        )
                      })}
                      {media?.length === 0 && !isFetchingMedia && (
                        <div className="dy-col-span-full dy-flex dy-flex-col dy-items-center dy-justify-center dy-text-center dy-py-16 dy-text-muted-foreground/40 dy-space-y-4">
                          <div className="dy-p-4 dy-bg-muted/10 dy-rounded-full dy-border dy-border-muted/20">
                            <ImageIcon className="dy-h-8 dy-w-8" />
                          </div>
                          <div className="dy-space-y-1">
                            <p className="dy-text-sm dy-font-bold dy-text-muted-foreground/70">No media found</p>
                            <p className="dy-text-xs dy-text-muted-foreground/50">
                              Drop files or press <kbd className="dy-font-sans dy-font-bold dy-bg-muted/40 dy-px-1 dy-py-0.5 dy-rounded">⌘V</kbd> anywhere to paste and upload
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Sentinel for infinite scroll */}
                      <div ref={sentinelRef} className="dy-w-full dy-col-span-full dy-flex dy-justify-center dy-py-4">
                        {isFetchingMedia && (
                          <div className="dy-animate-spin dy-rounded-full dy-border-2 dy-border-primary/20 dy-border-t-primary dy-h-6 dy-w-6"></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile / Tablet Sticky Selection Footer */}
                  {multiple && sVals.length > 0 && (
                    <div className="lg:dy-hidden dy-flex dy-items-center dy-justify-between dy-p-3 dy-bg-background/95 dy-backdrop-blur-md dy-border dy-border-border dy-rounded-xl dy-shadow-xl dy-sticky dy-bottom-2 dy-z-30">
                      <span className="dy-text-xs dy-font-bold dy-text-foreground">{sVals.length} {sVals.length === 1 ? 'asset' : 'assets'} selected</span>
                      <Button size="sm" className="dy-h-8 dy-font-bold dy-text-xs dy-bg-primary" onClick={handleConfirm}>
                        Confirm {sVals.length} {sVals.length === 1 ? 'Asset' : 'Assets'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Right Inspector Column - Visible on lg screens */}
                <div className="dy-hidden lg:dy-flex lg:dy-w-80 xl:dy-w-96 dy-flex-col dy-gap-4 dy-overflow-y-auto dy-border-muted/20 dy-bg-muted/5 dy-p-4 xl:dy-p-5 lg:dy-border-l">
                  {selectedItem ? (
                    <>
                      <div className="dy-grid dy-grid-cols-[88px_minmax(0,1fr)] dy-gap-3 lg:dy-block lg:dy-space-y-4">
                        <div className="dy-aspect-square dy-rounded-lg dy-overflow-hidden dy-border dy-bg-background dy-shadow-md dy-group dy-relative dy-ring-1 dy-ring-border/50">
                          {getPreviewUrl(selectedItem) ? (
                            <img
                              src={getPreviewUrl(selectedItem)}
                              className="dy-w-full dy-h-full dy-object-contain dy-p-1"
                              alt=""
                            />
                          ) : (
                            <div className="dy-w-full dy-h-full dy-flex dy-items-center dy-justify-center dy-bg-muted/20">
                              <ImageIcon className="dy-h-8 dy-w-8 dy-text-muted-foreground/30" />
                            </div>
                          )}
                          {/* Focal Point Indicator */}
                          {selectedItem.focalPoint && (
                            <div
                              className="dy-absolute dy-w-3 dy-h-3 dy-rounded-full dy-border-2 dy-border-white dy-bg-primary dy-shadow-sm dy-pointer-events-none"
                              style={{
                                left: `${(selectedItem.focalPoint as { x: number; y: number }).x * 100}%`,
                                top: `${(selectedItem.focalPoint as { x: number; y: number }).y * 100}%`,
                                transform: "translate(-50%, -50%)",
                              }}
                            />
                          )}
                        </div>
                        <div className="dy-space-y-1.5">
                          <h4 className="dy-font-bold dy-text-xs dy-truncate dy-leading-tight" title={selectedItem.filename}>
                            {getDisplayFilename(selectedItem.filename)}
                          </h4>
                          <div className="dy-flex dy-flex-wrap dy-items-center dy-gap-1.5">
                            {(() => {
                              const sInfo = getMediaSourceInfo(selectedItem)
                              return (
                                <span className={cn(
                                  "dy-text-[9px] dy-font-black dy-uppercase dy-tracking-widest dy-px-1.5 dy-py-0.5 dy-rounded-md dy-border",
                                  sInfo.source === "external"
                                    ? "dy-bg-sky-500/10 dy-text-sky-600 dy-border-sky-500/20"
                                    : "dy-bg-primary/10 dy-text-primary dy-border-primary/10"
                                )}>
                                  {sInfo.label}
                                </span>
                              )
                            })()}
                            <span className="dy-text-[10px] dy-font-medium dy-text-muted-foreground">
                              {selectedItem.filesize ? `${(selectedItem.filesize / 1024).toFixed(1)} KB` : 'External'}
                            </span>
                            {selectedItem.width && selectedItem.height && (
                              <span className="dy-text-[10px] dy-font-mono dy-text-muted-foreground">
                                {selectedItem.width}×{selectedItem.height}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Transform Copy Actions */}
                      {client && selectedItem.filename && (
                        <div className="dy-space-y-1.5 dy-border-t dy-border-muted/20 dy-pt-3">
                          <span className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/70">Transform URLs</span>
                          <div className="dy-grid dy-grid-cols-3 dy-gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="dy-h-7 dy-px-1 dy-text-[10px]"
                              onClick={() => {
                                const url = getTransformedMediaUrl(selectedItem, { key: "thumbnail" }, client.getBaseUrl())
                                navigator.clipboard.writeText(url)
                                toast.success("Thumbnail URL copied!")
                              }}
                            >
                              <Copy className="dy-h-2.5 dy-w-2.5 dy-mr-1" /> Thumb
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="dy-h-7 dy-px-1 dy-text-[10px]"
                              onClick={() => {
                                const url = getTransformedMediaUrl(selectedItem, { key: "banner" }, client.getBaseUrl())
                                navigator.clipboard.writeText(url)
                                toast.success("Banner URL copied!")
                              }}
                            >
                              <Copy className="dy-h-2.5 dy-w-2.5 dy-mr-1" /> Banner
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="dy-h-7 dy-px-1 dy-text-[10px]"
                              onClick={() => {
                                const url = getTransformedMediaUrl(selectedItem, { format: "webp" }, client.getBaseUrl())
                                navigator.clipboard.writeText(url)
                                toast.success("WebP URL copied!")
                              }}
                            >
                              <Copy className="dy-h-2.5 dy-w-2.5 dy-mr-1" /> WebP
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="dy-space-y-2.5 dy-border-t dy-border-muted/20 dy-pt-3 lg:dy-pt-4">
                        {multiple ? (
                          <>
                            <Button
                              className="dy-w-full dy-h-10 dy-rounded-lg dy-shadow-xs dy-font-bold dy-text-xs dy-tracking-tight dy-transition-all"
                              variant={sVals.some(v => v === selectedItem.id || v === selectedItem.filename || v === selectedItem.url) ? "outline" : "default"}
                              onClick={() => {
                                if (selectedItem.id) {
                                  if (sVals.some(v => v === selectedItem.id || v === selectedItem.filename || v === selectedItem.url)) {
                                    deselect(selectedItem.id)
                                  } else {
                                    select(selectedItem.id)
                                  }
                                  onSelect(selectedItem.id, selectedItem)
                                }
                              }}
                            >
                              {sVals.some(v => v === selectedItem.id || v === selectedItem.filename || v === selectedItem.url) ? "Deselect Item" : "Add to Selection"}
                            </Button>
                            {sVals.length > 0 && (
                              <Button
                                className="dy-w-full dy-h-10 dy-rounded-lg dy-shadow-lg dy-bg-primary hover:dy-bg-primary/90 dy-font-bold dy-text-xs dy-tracking-tight dy-transition-all dy-group"
                                onClick={handleConfirm}
                              >
                                <span>Confirm {sVals.length} {sVals.length === 1 ? 'Asset' : 'Assets'}</span>
                                <Sparkles className="dy-ml-1.5 dy-h-3.5 dy-w-3.5 dy-opacity-50 dy-group-hover:dy-opacity-100 dy-group-hover:dy-scale-110 dy-transition-all" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            className="dy-w-full dy-h-10 dy-rounded-lg dy-shadow-md dy-font-bold dy-text-xs dy-tracking-tight dy-bg-primary hover:dy-bg-primary/90 dy-transition-all"
                            onClick={() => {
                              if (selectedItem.id) {
                                onSelect(selectedItem.id, selectedItem)
                                onOpenChange(false)
                              }
                            }}
                          >
                            Select Media
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="dy-flex-1 dy-flex dy-flex-col dy-items-center dy-justify-center dy-text-center dy-space-y-3 dy-text-muted-foreground/30">
                      <div className="dy-p-4 dy-bg-muted/10 dy-rounded-full dy-border dy-border-muted/20">
                        <ImageIcon className="dy-h-7 dy-w-7" />
                      </div>
                      <div className="dy-space-y-0.5">
                        <p className="dy-text-xs dy-font-bold dy-uppercase dy-tracking-widest">No Selection</p>
                        <p className="dy-text-[10px] dy-font-medium dy-max-w-[140px] dy-leading-relaxed">Select an item from the library to view details and metadata</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="data-[state=active]:dy-flex data-[state=active]:dy-flex-col dy-h-full dy-m-0 dy-p-4 focus-visible:dy-ring-0 sm:dy-p-6 dy-overflow-y-auto dy-overscroll-contain">
              <div className="dy-max-w-2xl dy-w-full dy-mx-auto dy-space-y-6 dy-pb-16">
                {/* Drag & Drop Zone */}
                <div
                  {...getRootProps()}
                  className={cn(
                    "dy-flex dy-flex-col dy-items-center dy-justify-center dy-border-2 dy-border-dashed dy-rounded-3xl dy-p-8 dy-text-center dy-cursor-pointer dy-transition-all dy-relative dy-overflow-hidden sm:dy-p-10",
                    isDragActive
                      ? "dy-border-primary dy-bg-primary/10 dy-scale-[0.99]"
                      : "dy-border-primary/20 dy-bg-primary/5 hover:dy-bg-primary/10"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="dy-h-16 dy-w-16 dy-bg-background dy-rounded-full dy-flex dy-items-center dy-justify-center dy-text-primary dy-shadow-xl dy-border dy-border-primary/10 dy-mb-4">
                    <Upload className="dy-h-8 dy-w-8" />
                  </div>
                  <div className="dy-space-y-1.5">
                    <p className="dy-font-serif dy-font-bold dy-text-xl sm:dy-text-2xl">Upload media assets</p>
                    <p className="dy-text-xs dy-text-muted-foreground/70 dy-font-medium sm:dy-text-sm">
                      Drag & drop files here, browse, or <span className="dy-text-foreground dy-font-semibold">paste from clipboard (<kbd className="dy-font-sans dy-text-[10px] dy-font-bold dy-bg-muted/60 dy-px-1 dy-py-0.5 dy-rounded">⌘V</kbd> / <kbd className="dy-font-sans dy-text-[10px] dy-font-bold dy-bg-muted/60 dy-px-1 dy-py-0.5 dy-rounded">Ctrl+V</kbd>)</span>
                    </p>
                    <p className="dy-text-[10px] dy-text-muted-foreground/50">
                      {allowedMimeTypes && allowedMimeTypes.length > 0
                        ? `Allowed types: ${allowedMimeTypes.join(", ")}. Images are automatically compressed.`
                        : "Supports JPEG, PNG, WebP, GIF, MP4, WebM, PDF. Images are automatically compressed."}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" className="dy-mt-4 dy-rounded-full dy-px-6 dy-font-bold dy-pointer-events-none">
                    Choose Files
                  </Button>
                </div>

                {/* Upload Queue List */}
                {queue.length > 0 && (
                  <div className="dy-space-y-3 dy-animate-in dy-fade-in dy-slide-in-from-bottom-2">
                    <div className="dy-flex dy-items-center dy-justify-between">
                      <h4 className="dy-text-xs dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground">
                        Upload Queue ({queue.length})
                      </h4>
                      {queue.some(q => q.status === "completed") && (
                        <Button variant="ghost" size="sm" className="dy-h-7 dy-text-[11px]" onClick={clearQueue}>
                          Clear Completed
                        </Button>
                      )}
                    </div>

                    <div className="dy-space-y-2">
                      {queue.map((item) => (
                        <div
                          key={item.id}
                          className="dy-flex dy-items-center dy-gap-3 dy-p-3 dy-rounded-xl dy-border dy-border-border/40 dy-bg-card dy-shadow-sm"
                        >
                          <div className="dy-h-9 dy-w-9 dy-rounded-lg dy-bg-muted/40 dy-flex dy-items-center dy-justify-center dy-flex-shrink-0">
                            {item.file.type.startsWith("image/") ? (
                              <ImageIcon className="dy-h-4 dy-w-4 dy-text-primary" />
                            ) : item.file.type.startsWith("video/") ? (
                              <Video className="dy-h-4 dy-w-4 dy-text-purple-500" />
                            ) : (
                              <FileIcon className="dy-h-4 dy-w-4 dy-text-muted-foreground" />
                            )}
                          </div>

                          <div className="dy-min-w-0 dy-flex-1 dy-space-y-1">
                            <div className="dy-flex dy-items-center dy-justify-between">
                              <p className="dy-text-xs dy-font-semibold dy-truncate dy-max-w-[200px] sm:dy-max-w-[300px]" title={item.file.name}>
                                {item.file.name}
                              </p>
                              <span className="dy-text-[10px] dy-font-mono dy-text-muted-foreground">
                                {(item.compressedSize / 1024).toFixed(1)} KB
                              </span>
                            </div>

                            {item.status === "uploading" && (
                              <div className="dy-space-y-1">
                                <Progress value={item.progress} className="dy-h-1.5" />
                                <div className="dy-flex dy-justify-between dy-text-[9px] dy-text-muted-foreground">
                                  <span>Uploading & processing...</span>
                                  <span>{item.progress}%</span>
                                </div>
                              </div>
                            )}

                            {item.status === "completed" && (
                              <p className="dy-text-[10px] dy-text-emerald-600 dy-font-bold dy-flex dy-items-center dy-gap-1">
                                <Check className="dy-h-3 dy-w-3" /> Uploaded & added to selection
                              </p>
                            )}

                            {item.status === "error" && (
                              <p className="dy-text-[10px] dy-text-destructive dy-font-bold dy-flex dy-items-center dy-gap-1">
                                <AlertCircle className="dy-h-3 dy-w-3" /> {item.error || "Upload failed"}
                              </p>
                            )}

                            {item.status === "queued" && (
                              <p className="dy-text-[10px] dy-text-muted-foreground">Waiting in queue...</p>
                            )}
                          </div>

                          <div className="dy-flex dy-items-center dy-gap-1">
                            {item.status === "error" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-primary"
                                onClick={() => retryUpload(item.id)}
                                title="Retry upload"
                              >
                                <RotateCw className="dy-h-3.5 dy-w-3.5" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-destructive"
                              onClick={() => removeQueueItem(item.id)}
                              title="Remove"
                            >
                              <X className="dy-h-3.5 dy-w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="external" className="data-[state=active]:dy-flex data-[state=active]:dy-flex-col dy-h-full dy-m-0 dy-overflow-y-auto dy-overscroll-contain dy-p-4 focus-visible:dy-ring-0 sm:dy-p-12">
              <div className="dy-mx-auto dy-max-w-2xl dy-w-full dy-space-y-6 dy-pt-2 sm:dy-space-y-10 sm:dy-pt-4 dy-pb-16">
                <div className="dy-text-center dy-space-y-3 sm:dy-space-y-4">
                  <div className="dy-h-16 dy-w-16 dy-bg-primary/10 dy-text-primary dy-rounded-lg dy-flex dy-items-center dy-justify-center dy-mx-auto dy-mb-4 dy-shadow-sm dy-rotate-3 sm:dy-h-20 sm:dy-w-20 sm:dy-rounded-3xl sm:dy-mb-6">
                    <Globe className="dy-h-8 dy-w-8 sm:dy-h-10 sm:dy-w-10" />
                  </div>
                  <h3 className="dy-text-2xl dy-font-serif dy-font-bold dy-tracking-tight sm:dy-text-3xl">Add External Resource</h3>
                  <p className="dy-text-sm dy-text-muted-foreground/70 dy-leading-relaxed dy-max-w-md dy-mx-auto">
                    Paste a link to any YouTube video, Vimeo link, direct video file, or image URL to add it to your library.
                  </p>
                </div>

                <div className="dy-space-y-5 sm:dy-space-y-6">
                  <div className="dy-flex dy-flex-col dy-gap-3 sm:dy-flex-row">
                    <div className="dy-relative dy-flex-1">
                      <LinkIcon className="dy-absolute dy-left-4 dy-top-1/2 dy--translate-y-1/2 dy-h-4 dy-w-4 dy-text-muted-foreground" />
                      <Input
                        placeholder="https://example.com/image.jpg or video link..."
                        className="dy-h-12 dy-rounded-lg dy-shadow-xl dy-border-muted dy-bg-muted/5 dy-pl-12 dy-text-sm dy-font-medium focus:dy-bg-background dy-transition-all sm:dy-h-14 sm:dy-text-base"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isAddingUrl && externalUrl.trim()) {
                            e.preventDefault()
                            handleExternalUrlSubmit()
                          }
                        }}
                      />
                    </div>
                    <Button
                      onClick={handleExternalUrlSubmit}
                      disabled={isAddingUrl || !externalUrl}
                      className="dy-h-12 dy-w-full dy-rounded-lg dy-px-8 dy-font-bold dy-shadow-xl dy-shadow-primary/20 dy-bg-primary hover:dy-bg-primary/90 dy-transition-all active:dy-scale-95 sm:dy-h-14 sm:dy-w-auto sm:dy-px-10"
                    >
                      {isAddingUrl ? "Adding..." : "Add URL"}
                    </Button>
                  </div>

                  <div className="dy-grid dy-grid-cols-1 dy-gap-3 sm:dy-grid-cols-2 sm:dy-gap-4">
                    <div className="dy-p-4 dy-rounded-lg dy-bg-red-50/50 dy-border dy-border-red-100 dy-flex dy-items-start dy-gap-3">
                      <div className="dy-mt-0.5 dy-p-1.5 dy-bg-red-100 dy-rounded-lg dy-text-red-600">
                        <Video className="dy-h-4 dy-w-4" />
                      </div>
                      <div>
                        <p className="dy-text-xs dy-font-bold dy-text-red-900">Video Streaming</p>
                        <p className="dy-text-[10px] dy-text-red-700/70 dy-leading-relaxed dy-font-medium dy-mt-0.5">Supports YouTube & Vimeo embeds, as well as direct MP4/WebM video links.</p>
                      </div>
                    </div>
                    <div className="dy-p-4 dy-rounded-lg dy-bg-blue-50/50 dy-border dy-border-blue-100 dy-flex dy-items-start dy-gap-3">
                      <div className="dy-mt-0.5 dy-p-1.5 dy-bg-blue-100 dy-rounded-lg dy-text-blue-600">
                        <ImageIcon className="dy-h-4 dy-w-4" />
                      </div>
                      <div>
                        <p className="dy-text-xs dy-font-bold dy-text-blue-900">Direct Image Import</p>
                        <p className="dy-text-[10px] dy-text-blue-700/70 dy-leading-relaxed dy-font-medium dy-mt-0.5">Direct image links are fetched, compressed, and stored safely in your media library.</p>
                      </div>
                    </div>
                  </div>

                  <div className="dy-flex dy-items-center dy-gap-3 dy-p-4 dy-rounded-lg dy-bg-muted/20 dy-border dy-border-muted/30">
                    <div className="dy-p-2 dy-bg-background dy-rounded-lg dy-shadow-sm dy-text-muted-foreground">
                      <Info className="dy-h-4 dy-w-4" />
                    </div>
                    <p className="dy-text-[11px] dy-text-muted-foreground/80 dy-font-medium dy-leading-relaxed">
                      <span className="dy-font-bold dy-text-foreground">Pro Tip:</span> External videos stream directly from YouTube or Vimeo to ensure fast global delivery without high storage costs.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
