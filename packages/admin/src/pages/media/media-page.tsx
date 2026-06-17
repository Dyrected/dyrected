import * as React from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useDyrected } from "../../providers/dyrected-provider"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { cn, getMediaUrl } from "../../lib/utils"
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
import { ScrollArea } from "../../components/ui/scroll-area"
import { AspectRatio } from "../../components/ui/aspect-ratio"
import { Link } from "react-router-dom"
import {
  Upload,
  Search,
  FileIcon,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Copy,
  Info,
  Pencil,
  Scissors
} from "lucide-react"
import { useDropzone } from "react-dropzone"
import { Progress } from "../../components/ui/progress"
import { Separator } from "../../components/ui/separator"
// import { FocalPointPicker } from "../../components/media/focal-point-picker"
import { Blurhash } from "react-blurhash"
import type { Media } from "@dyrected/sdk"
import { ImageCropDialog } from "../../components/forms/fields/image-crop-dialog"

export function MediaPage({ collectionSlug, schema }: { collectionSlug?: string, schema?: { labels?: { plural?: string }; label?: string } }) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [isUploadOpen, setIsUploadOpen] = React.useState(false)
  const [uploadFiles, setUploadFiles] = React.useState<File[]>([])
  const [selectedItem, setSelectedItem] = React.useState<Media | null>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ["media", collectionSlug, search],
    queryFn: ({ pageParam = 1 }) =>
      client!.listMedia(
        {
          where: search ? { filename: { contains: search } } : undefined,
          limit: 12,
          page: pageParam
        },
        collectionSlug
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.page + 1 : undefined
    },
    enabled: !!client,
  })

  const mediaResponse = React.useMemo(() => {
    return data?.pages.flatMap((page) => page.docs) || []
  }, [data])

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
    mutationFn: (args: { id: string, data: Record<string, unknown> }) => client!.update(collectionSlug || "media", args.id, args.data),
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
    if (acceptedFiles.length > 0) {
      setUploadFiles(acceptedFiles)
      setIsUploadOpen(true)
    }
  }, [])

  const handlePaste = React.useCallback((e: React.ClipboardEvent) => {
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
  }, [])

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
      <div className="dy-flex dy-flex-col dy-gap-4 dy-border-b dy-border-border/50 dy-pb-5 sm:dy-flex-row sm:dy-items-end sm:dy-justify-between sm:dy-pb-6">
        <div className="dy-min-w-0">
          <div className="dy-flex dy-items-center dy-gap-2 dy-mb-1">
            <ImageIcon className="dy-h-5 dy-w-5 dy-flex-shrink-0 dy-text-primary" />
            <h1 className="dy-min-w-0 dy-break-words dy-text-2xl dy-font-bold dy-tracking-tight dy-text-foreground sm:dy-text-3xl">
              {schema?.labels?.plural ?? schema?.label ?? (collectionSlug && collectionSlug !== 'media' ? (collectionSlug.charAt(0).toUpperCase() + collectionSlug.slice(1)) : "Media Library")}
            </h1>
          </div>
          <p className="dy-text-sm dy-leading-5 dy-text-muted-foreground">
            Manage your images, documents, and other assets for this site.
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={handleUploadOpenChange}>
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
        </Dialog>
      </div>

      <div className="dy-flex dy-items-center dy-gap-4">
        <div className="dy-relative dy-w-full sm:dy-max-w-sm">
          <Search className="dy-absolute dy-left-3 dy-top-1/2 dy--translate-y-1/2 dy-h-4 dy-w-4 dy-text-muted-foreground/60" />
          <Input
            placeholder="Search assets by filename..."
            className="dy-pl-10 dy-h-11 dy-bg-card dy-border-border/60 dy-rounded-xl dy-shadow-sm focus-visible:dy-ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="dy-h-auto dy-pr-0 md:dy-h-[calc(100vh-320px)] md:dy-pr-4">
        {isLoading ? (
          <div className="dy-flex dy-h-44 dy-items-center dy-justify-center sm:dy-h-60">
            <div className="dy-animate-spin dy-rounded-full dy-border-4 dy-border-primary/20 dy-border-t-primary dy-h-10 dy-w-10"></div>
          </div>
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
        ) : (
          <div className="dy-grid dy-grid-cols-2 dy-gap-3 dy-pb-8 sm:dy-grid-cols-3 md:dy-grid-cols-3 lg:dy-grid-cols-4 lg:dy-gap-5 xl:dy-grid-cols-5 2xl:dy-grid-cols-6">
            {mediaResponse?.map((item) => (
              <MediaCard
                key={item.id as string}
                item={item}
                baseUrl={client!.getBaseUrl()}
                onDelete={() => deleteMutation.mutate(item.id as string)}
                onClick={() => setSelectedItem(item)}
                isSelected={selectedItem?.id === item.id}
              />
            ))}
            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="dy-w-full dy-col-span-full dy-flex dy-justify-center dy-py-4">
              {isFetchingNextPage && (
                <div className="dy-animate-spin dy-rounded-full dy-border-2 dy-border-primary/20 dy-border-t-primary dy-h-6 dy-w-6"></div>
              )}
            </div>
          </div>
        )}
      </ScrollArea>

      <MediaDetailsDialog
        key={selectedItem?.id as string}
        item={selectedItem}
        collectionSlug={collectionSlug}
        onClose={() => setSelectedItem(null)}
        baseUrl={client!.getBaseUrl()}
        onUpdate={(data) => selectedItem && updateMutation.mutate({ id: selectedItem.id as string, data })}
        onDelete={() => {
          if (confirm("Are you sure you want to delete this file?")) {
            if (selectedItem) {
              deleteMutation.mutate(selectedItem.id as string)
              setSelectedItem(null)
            }
          }
        }}
      />
    </div>
  )
}

function MediaCard({ item, baseUrl, onDelete, onClick, isSelected }: {
  item: Media,
  baseUrl: string,
  onDelete: () => void,
  onClick: () => void,
  isSelected: boolean
}) {
  const isImage = item.mimeType?.startsWith("image/")
  const url = getMediaUrl(item, baseUrl)

  return (
    <Card
      className={cn(
        "dy-overflow-hidden dy-group dy-relative dy-border-border/40 dy-bg-card dy-shadow-sm hover:dy-shadow-xl dy-transition-all dy-duration-300 dy-rounded-xl dy-cursor-pointer",
        isSelected && "dy-ring-2 dy-ring-primary dy-ring-offset-2 dy-shadow-lg dy-scale-[0.98]"
      )}
      onClick={onClick}
    >
      <CardHeader className="!dy-p-0 dy-border-b dy-border-border/10">
        <AspectRatio ratio={1 / 1} className="dy-bg-muted/30 dy-overflow-hidden dy-relative">
          {isImage ? (
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
                src={url}
                alt={item.filename}
                className="dy-object-cover dy-w-full dy-h-full dy-transition-transform dy-duration-500 dy-group-hover:dy-scale-110 dy-relative dy-z-10"
                loading="lazy"
              />
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
          {item.filename}
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
      <div className="dy-absolute dy-top-2 dy-right-2 dy-flex dy-gap-2 dy-opacity-100 dy-transition-opacity sm:dy-opacity-0 sm:dy-group-hover:dy-opacity-100">
        <Button
          size="icon"
          variant="destructive"
          className="dy-h-8 dy-w-8 dy-rounded-lg dy-shadow-lg sm:dy-h-7 sm:dy-w-7"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm("Are you sure you want to delete this file?")) {
              onDelete()
            }
          }}
        >
          <Trash2 className="dy-h-3.5 dy-w-3.5" />
        </Button>
      </div>
    </Card>
  )
}

function MediaDetailsDialog({ item, collectionSlug, onClose, baseUrl, onUpdate, onDelete, onCropUploaded }: {
  item: Media | null,
  collectionSlug?: string,
  onClose: () => void,
  baseUrl: string,
  onUpdate: (data: { alt: string; caption: string }) => void,
  onDelete?: () => void,
  onCropUploaded?: (newItem: Media) => void
}) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()
  const [isCropOpen, setIsCropOpen] = React.useState(false)
  const [formData, setFormData] = React.useState<{ alt: string; caption: string }>(() => ({
    alt: (item?.alt as string) || "",
    caption: (item?.caption as string) || "",
  }))
  const [isSaving, setIsSaving] = React.useState(false)

  const handleCropConfirm = async (blob: Blob, cropFilename: string) => {
    if (!client || !item) return
    const file = new File([blob], cropFilename, { type: blob.type })
    const toastId = toast.loading("Uploading cropped image…")
    try {
      const uploaded = await client.uploadMedia(file, collectionSlug)
      queryClient.invalidateQueries({ queryKey: ["media"] })
      toast.success("Crop applied & uploaded", { id: toastId })
      if (onCropUploaded) {
        onCropUploaded(uploaded)
      }
      setIsCropOpen(false)
    } catch (err) {
      toast.error("Crop upload failed", { description: (err as Error).message, id: toastId })
      throw err
    }
  }

  if (!item) return null

  const isImage = item.mimeType?.startsWith("image/")
  const url = getMediaUrl(item, baseUrl)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate(formData)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges =
    formData.alt !== (item.alt || "") ||
    formData.caption !== (item.caption || "")

  return (
    <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="dy-flex dy-h-[92dvh] dy-max-h-[92dvh] dy-w-[calc(100vw-1rem)] dy-flex-col dy-overflow-hidden dy-border-border/40 dy-bg-background dy-p-0 dy-shadow-2xl sm:dy-w-full sm:dy-max-w-4xl md:dy-h-[85dvh] md:dy-max-h-[85dvh] md:dy-max-w-5xl lg:dy-max-w-6xl xl:dy-max-w-7xl">
        <DialogHeader className="dy-p-4 sm:dy-p-6 dy-border-b dy-border-border/40 dy-bg-card dy-flex-shrink-0">
          <DialogTitle className="dy-flex dy-items-center dy-gap-2">
            <Info className="dy-h-5 dy-w-5 dy-text-primary" />
            Attachment Details
          </DialogTitle>
        </DialogHeader>

        <div className="dy-flex dy-min-h-0 dy-flex-1 dy-flex-col dy-overflow-y-auto md:dy-flex-row md:dy-overflow-hidden">
          {/* Left Side: Large Preview */}
          <div className="dy-relative dy-flex dy-w-full dy-flex-none dy-items-center dy-justify-center dy-border-b dy-border-border/40 dy-bg-muted/15 dy-p-3 sm:dy-p-5 md:dy-h-full md:dy-min-h-0 md:dy-w-3/5 md:dy-flex-shrink md:dy-border-b-0 md:dy-border-r lg:dy-w-2/3">
            <div className="dy-relative dy-flex dy-h-[40dvh] dy-min-h-[220px] dy-max-h-80 dy-w-full dy-max-w-full dy-items-center dy-justify-center dy-overflow-hidden dy-rounded-xl dy-border dy-border-border/40 dy-bg-checkered dy-shadow-inner md:dy-h-full md:dy-max-h-full">
              {isImage ? (
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
                    src={url}
                    alt={item.filename}
                    className="dy-relative dy-z-10 dy-h-auto dy-max-h-full dy-w-auto dy-max-w-full dy-object-contain"
                  />
                </>
              ) : (
                <div className="dy-flex dy-flex-col dy-items-center dy-gap-4">
                  <div className="dy-h-20 dy-w-20 dy-rounded-2xl dy-bg-primary/10 dy-flex dy-items-center dy-justify-center">
                    <FileIcon className="dy-h-10 dy-w-10 dy-text-primary" />
                  </div>
                  <span className="dy-text-xs dy-font-medium dy-text-muted-foreground">{item.mimeType}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Details Form */}
          <div className="media-preview-dialod-details-form dy-flex dy-w-full dy-flex-none dy-flex-col dy-bg-card md:dy-h-full md:dy-min-h-0 md:dy-w-2/5 lg:dy-w-1/3">
            <div className="dy-flex-none md:dy-min-h-0 md:dy-flex-1 md:dy-overflow-y-auto">
              <div className="dy-p-4 dy-space-y-5 sm:dy-p-6 sm:dy-space-y-6">
                {/* Core Info */}
                <div className="dy-space-y-4">
                  <div>
                    <h4 className="dy-text-sm dy-font-bold dy-text-foreground dy-break-all">{item.filename}</h4>
                    <p className="dy-text-xs dy-text-muted-foreground">Uploaded on {item.createdAt ? new Date(item.createdAt as string).toLocaleDateString() : 'N/A'}</p>
                  </div>

                  <div className="dy-grid dy-grid-cols-2 dy-gap-x-4 dy-gap-y-3 dy-bg-muted/30 dy-p-3.5 dy-rounded-xl dy-border dy-border-border/40">
                    <div className="dy-space-y-0.5">
                      <span className="dy-text-[9px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/80">File Size</span>
                      <p className="dy-text-xs dy-font-semibold">{((item.filesize || (item.size as number) || 0) / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="dy-space-y-0.5">
                      <span className="dy-text-[9px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/80">Dimensions</span>
                      <p className="dy-text-xs dy-font-semibold">{item.width ? `${item.width} x ${item.height}` : 'N/A'}</p>
                    </div>
                    <div className="dy-space-y-0.5">
                      <span className="dy-text-[9px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/80">File Type</span>
                      <p className="dy-text-xs dy-font-semibold dy-truncate" title={item.mimeType}>{item.mimeType || 'Unknown'}</p>
                    </div>
                    <div className="dy-space-y-0.5">
                      <span className="dy-text-[9px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/80">File ID</span>
                      <p className="dy-text-xs dy-font-semibold dy-font-mono dy-truncate" title={item.id as string}>{item.id as string}</p>
                    </div>
                  </div>
                </div>

                <Separator className="dy-bg-border/40" />

                {/* Editable Fields */}
                <div className="dy-space-y-4">
                  <div className="dy-space-y-2">
                    <label className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground/80">Filename</label>
                    <Input
                      value={item.filename || ""}
                      readOnly
                      className="dy-h-10 dy-rounded-lg dy-bg-muted/10 dy-border-border/40 dy-text-muted-foreground focus-visible:dy-ring-0 focus-visible:dy-ring-offset-0 dy-cursor-not-allowed"
                    />
                  </div>
                  <div className="dy-space-y-2">
                    <label className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground/80">Alt Text</label>
                    <Input
                      value={formData.alt}
                      onChange={(e) => setFormData({ ...formData, alt: e.target.value })}
                      placeholder="Describe the image for accessibility..."
                      className="dy-h-10 dy-rounded-lg dy-bg-card dy-border-border/60 focus:dy-ring-1 focus:dy-ring-primary/20"
                    />
                  </div>
                  <div className="dy-space-y-2">
                    <label className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground/80">Caption</label>
                    <textarea
                      value={formData.caption}
                      onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                      placeholder="Add a caption..."
                      className="dy-flex dy-min-h-[80px] dy-w-full dy-rounded-lg dy-border dy-border-border/60 dy-bg-card dy-px-3 dy-py-2 dy-text-sm dy-ring-offset-background placeholder:dy-text-muted-foreground focus-visible:dy-outline-none focus-visible:dy-ring-1 focus-visible:dy-ring-primary/20"
                    />
                  </div>
                </div>

                <Separator className="dy-bg-border/40" />

                {/* Detail URL */}
                <div className="dy-space-y-4">
                  <DetailItem label="File URL" value={url} copyable />
                </div>
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="dy-flex dy-flex-shrink-0 dy-flex-col dy-gap-3 dy-border-t dy-border-border/40 dy-bg-muted/5 dy-p-4 sm:dy-p-6">
              {hasChanges && (
                <Button
                  className="dy-w-full dy-h-11 dy-rounded-xl dy-font-bold dy-bg-primary dy-text-card dy-shadow-lg dy-shadow-primary/20 dy-animate-in dy-fade-in dy-slide-in-from-bottom-2"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              )}
              <div className="dy-grid dy-grid-cols-2 dy-gap-2 sm:dy-flex">
                {collectionSlug && (
                  <Button className="dy-col-span-2 dy-h-11 dy-rounded-xl dy-font-bold dy-gap-2 dy-bg-card sm:dy-flex-1" variant="outline" asChild>
                    <Link to={`/collections/${collectionSlug}/edit/${item.id}`}>
                      <Pencil className="dy-h-4 dy-w-4" />
                      Edit Full Details
                    </Link>
                  </Button>
                )}
                <Button
                  className={cn(
                    "dy-h-11 dy-rounded-xl dy-font-bold dy-gap-2 dy-bg-card",
                    collectionSlug ? "dy-px-3" : "dy-flex-1"
                  )}
                  variant="outline"
                  asChild
                  title="Open Original File"
                >
                  <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="dy-h-4 dy-w-4" />
                    {!collectionSlug && "Open Original"}
                  </a>
                </Button>
                {isImage && item.mimeType !== "image/svg+xml" && (
                  <Button
                    onClick={() => setIsCropOpen(true)}
                    className={cn(
                      "dy-h-11 dy-rounded-xl dy-font-bold dy-gap-2 dy-bg-card",
                      collectionSlug ? "dy-px-3" : "dy-flex-1"
                    )}
                    variant="outline"
                    title="Crop Image"
                  >
                    <Scissors className="dy-h-4 dy-w-4" />
                    {!collectionSlug && "Crop"}
                  </Button>
                )}
                {onDelete && (
                  <Button
                    onClick={onDelete}
                    className="dy-h-11 dy-px-4 dy-rounded-xl dy-text-destructive hover:dy-bg-destructive/10 hover:dy-text-destructive dy-transition-colors"
                    variant="ghost"
                    title="Delete Permanently"
                  >
                    <Trash2 className="dy-h-4 dy-w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        {isImage && (
          <ImageCropDialog
            open={isCropOpen}
            onOpenChange={setIsCropOpen}
            imageUrl={url}
            filename={item.filename || "image.jpg"}
            onConfirm={handleCropConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DetailItem({ label, value, copyable }: {
  label: string,
  value: string,
  copyable?: boolean
}) {
  return (
    <div className="dy-space-y-1.5">
      <label className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground/80">{label}</label>
      <div className="dy-flex dy-items-center dy-gap-2 dy-group">
        <p className="dy-text-sm dy-font-medium dy-text-foreground dy-truncate dy-flex-1">{value}</p>
        {copyable && (
          <Button
            size="icon"
            variant="ghost"
            className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-primary dy-transition-colors"
            onClick={() => navigator.clipboard.writeText(value)}
          >
            <Copy className="dy-h-3.5 dy-w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

function FileUploader({ collectionSlug, files, setFiles, onComplete }: {
  collectionSlug?: string,
  files: File[],
  setFiles: React.Dispatch<React.SetStateAction<File[]>>,
  onComplete: () => void
}) {
  const { client } = useDyrected()
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [setFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        await client!.uploadMedia(files[i], collectionSlug)
        setProgress(((i + 1) / files.length) * 100)
      }
      onComplete()
      toast.success(`${files.length} assets uploaded successfully`)
    } catch (error: unknown) {
      console.error("Upload failed", error)
      toast.error("Failed to upload assets", {
        description: (error as Error).message
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="dy-space-y-6 dy-py-6 dy-px-4">
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
              <div key={idx} className="dy-flex dy-items-center dy-justify-between dy-p-3 dy-bg-muted/30 dy-border dy-border-border/40 dy-rounded-xl dy-text-sm dy-group dy-transition-colors hover:dy-bg-muted/50">
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
              className="dy-w-full dy-h-12 dy-rounded-xl dy-bg-primary hover:dy-bg-primary/90 dy-text-card dy-font-bold dy-shadow-lg dy-shadow-primary/20 dy-transition-all active:dy-scale-[0.98]"
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
    </div>
  )
}
