import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-context"
import { Button } from "../../ui/button"
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  UploadCloud,
  Loader2,
  Scissors,
} from "lucide-react"
import { cn, getMediaUrl, getDisplayFilename } from "../../../lib/utils"
import { getMediaPreviewUrl } from "../../../lib/external-media"
import { Progress } from "../../ui/progress"
import { MediaLibraryDialog } from "../../media/media-library-dialog"
import { ImageCropDialog } from "./image-crop-dialog"
import type { Media } from "@dyrected/sdk"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { compressImage } from "../../../lib/compress-image"

import { resolveActiveMediaCollection } from "../../../lib/media-utils"
import { useMediaUpload } from "../../../hooks/use-media-upload"

interface MediaPickerProps {
  collection: string
  value?: string | string[] | any
  onChange: (value: any) => void
  label?: string
  variant?: "default" | "icon"
  disabled?: boolean
  multiple?: boolean
  placeholder?: string
  valueType?: "id" | "url"
}

interface CachedMedia extends Media {
  id: string
  filename: string
  url: string
  mimeType: string
}

export function MediaPicker({
  collection,
  value,
  onChange,
  label,
  variant = "default",
  disabled,
  multiple,
  placeholder,
  valueType = "id"
}: MediaPickerProps) {
  const { client, schemas } = useDyrected()
  const [isOpen, setIsOpen] = React.useState(false)
  const [localMediaCache, setLocalMediaCache] = React.useState<CachedMedia[]>([])
  const [cropState, setCropState] = React.useState<{ targetId: string; imageUrl: string; filename: string } | null>(null)

  const activeMediaCollection = React.useMemo(() => {
    return resolveActiveMediaCollection(schemas, collection)
  }, [schemas, collection])

  const selectedValues = React.useMemo(() => {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }, [value])

  const getIdentifier = React.useCallback((v: any): string => {
    if (!v) return ""
    if (typeof v === "object" && v !== null) {
      return v.id || v._id || v.filename || ""
    }
    const strVal = String(v)
    if (strVal.includes("/")) {
      return strVal.split("/").pop() || strVal
    }
    return strVal
  }, [])

  const selectedIds = React.useMemo(() => {
    return selectedValues.map(getIdentifier).filter(Boolean)
  }, [selectedValues, getIdentifier])

  const getFullUrl = React.useCallback((item: any): string => {
    if (!item) return ""
    if (valueType === "url") {
      if (item.mimeType === "video/youtube") {
        return item.url || ""
      }
      return getMediaUrl(item, client?.getBaseUrl() || "")
    }
    return item.id
  }, [valueType, client])

  const handleUploadedItems = React.useCallback((uploadedItems: (Media & { id: string })[]) => {
    setLocalMediaCache(prev => {
      const next = [...prev]
      uploadedItems.forEach(item => {
        if (item && item.id && !next.some(m => m.id === item.id)) {
          next.push(item as CachedMedia)
        }
      })
      return next
    })

    const newIds = uploadedItems.map(item => item.id)

    if (multiple) {
      const nextIds = [...selectedIds]
      newIds.forEach(id => {
        if (!nextIds.includes(id)) {
          nextIds.push(id)
        }
      })
      const nextValues = nextIds.map(nid => {
        const cached = localMediaCache.find(m => m.id === nid || m.filename === nid || m.url === nid) || uploadedItems.find(m => m.id === nid || m.filename === nid || m.url === nid)
        return cached ? getFullUrl(cached) : nid
      })
      onChange(nextValues)
    } else if (newIds.length > 0) {
      const nid = newIds[0]
      const cached = uploadedItems.find(m => m.id === nid || m.filename === nid || m.url === nid)
      onChange(cached ? getFullUrl(cached) : nid)
    }
  }, [multiple, selectedIds, localMediaCache, getFullUrl, onChange])

  const {
    isUploading: uploading,
    queue,
    uploadFiles,
  } = useMediaUpload({
    collectionSlug: activeMediaCollection,
    onAllCompleted: (items) => {
      handleUploadedItems(items)
      toast.success(`Successfully uploaded and selected ${items.length} asset(s)`)
    },
    onError: (err) => toast.error("Upload failed", { description: err.message }),
  })

  const uploadProgress = React.useMemo(() => {
    if (queue.length === 0) return 0
    const total = queue.reduce((acc, q) => acc + q.progress, 0)
    return Math.round(total / queue.length)
  }, [queue])

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadFiles(acceptedFiles)
    }
  }, [uploadFiles])


  const checkIsCropable = React.useCallback((id: string, item?: any) => {
    if (item) {
      return item.mimeType?.startsWith("image/") && item.mimeType !== "image/svg+xml"
    }
    if (!id) return false
    const lower = id.toLowerCase()
    return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif") || lower.startsWith("data:image/") || lower.includes("/uploads/")
  }, [])

  const openCrop = React.useCallback((id: string, item?: any) => {
    const resolvedItem = item || localMediaCache.find(m => m.id === id || m.filename === id || m.url === id)
    if (resolvedItem) {
      const mimeType: string = resolvedItem.mimeType || ""
      if (!mimeType.startsWith("image/") || mimeType === "image/svg+xml") return
      const url = getMediaUrl(resolvedItem, client?.getBaseUrl() || "")
      setCropState({ targetId: resolvedItem.id, imageUrl: url, filename: resolvedItem.filename || "image.jpg" })
    } else {
      const url = getMediaUrl(id, client?.getBaseUrl() || "")
      if (!url) return
      const filename = url.split("/").pop() || "image.jpg"
      setCropState({ targetId: id, imageUrl: url, filename })
    }
  }, [localMediaCache, client])

  const handleCropConfirm = React.useCallback(async (blob: Blob, cropFilename: string) => {
    if (!client || !cropState) return
    const file = new File([blob], cropFilename, { type: blob.type })
    const toastId = toast.loading("Uploading cropped image…")
    try {
      const uploaded = await client.collection(activeMediaCollection).upload(file, undefined, {
        onProgress: (pct) => toast.loading(`Uploading cropped image… ${pct}%`, { id: toastId }),
      }) as CachedMedia
      setLocalMediaCache(prev => {
        if (prev.some(m => m.id === uploaded.id)) return prev
        return [...prev, uploaded]
      })
      const newValue = getFullUrl(uploaded)
      if (multiple) {
        const nextIds = selectedIds.map(sid => sid === cropState.targetId ? uploaded.id : sid)
        const nextValues = nextIds.map(nid => {
          const cached = localMediaCache.find(m => m.id === nid) || (nid === uploaded.id ? uploaded : undefined)
          return cached ? getFullUrl(cached) : nid
        })
        onChange(nextValues)
      } else {
        onChange(newValue)
      }
      toast.success("Crop applied", { id: toastId })
    } catch (err: any) {
      toast.error("Crop upload failed", { description: err.message, id: toastId })
      throw err
    }
  }, [client, cropState, activeMediaCollection, multiple, selectedIds, localMediaCache, getFullUrl, onChange])


  const handlePaste = React.useCallback(async (e: React.ClipboardEvent) => {
    if (disabled || uploading || !client) return
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
      await onDrop(filesToUpload)
    }
  }, [disabled, uploading, client, onDrop])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled || uploading,
    noClick: true,
  })

  const getPreviewUrl = (item: Media) => getMediaPreviewUrl(item, client?.getBaseUrl() || "")

  const isIcon = variant === "icon"

  const getDisplayString = (val: any): string => {
    if (!val) return ""
    if (Array.isArray(val)) {
      if (val.length === 0) return ""
      return `${val.length} items selected`
    }
    if (typeof val === "object") return val.filename || val.id || val.slug || "Object"
    const cached = localMediaCache.find(m => m.id === val || m.filename === val || m.url === val)
    if (cached) return cached.filename || cached.id
    if (val.includes("/")) {
      return val.split("/").pop() || val
    }
    return String(val)
  }
  const displayValue = getDisplayString(value)

  if (multiple && !isIcon) {
    return (
      <div
        {...getRootProps()}
        onPaste={handlePaste}
        className="dy-space-y-4 dy-relative"
      >
        <input {...getInputProps()} />
        {isDragActive && (
          <div className="dy-absolute dy-inset-0 dy-z-50 dy-bg-primary/10 dy-backdrop-blur-[2px] dy-border-2 dy-border-dashed dy-border-primary dy-rounded-2xl dy-flex dy-items-center dy-justify-center dy-pointer-events-none">
            <div className="dy-bg-card dy-p-4 dy-rounded-lg dy-shadow-xl dy-flex dy-items-center dy-gap-2">
              <UploadCloud className="dy-h-5 dy-w-5 dy-text-primary dy-animate-bounce" />
              <p className="dy-text-xs dy-font-bold">Drop to upload & select</p>
            </div>
          </div>
        )}
        {uploading && (
          <div className="dy-absolute dy-inset-0 dy-z-50 dy-bg-background/60 dy-backdrop-blur-[1px] dy-rounded-2xl dy-flex dy-items-center dy-justify-center dy-pointer-events-none">
            <div className="dy-bg-card dy-p-4 dy-rounded-lg dy-shadow-xl dy-w-56 dy-max-w-[80%] dy-space-y-2">
              <div className="dy-flex dy-items-center dy-justify-between dy-gap-2">
                <div className="dy-flex dy-items-center dy-gap-2">
                  <Loader2 className="dy-h-4 dy-w-4 dy-text-primary dy-animate-spin" />
                  <p className="dy-text-xs dy-font-bold">Uploading files…</p>
                </div>
                <span className="dy-text-xs dy-font-bold dy-tabular-nums dy-text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="dy-h-2 dy-rounded-full" />
            </div>
          </div>
        )}

        {label && (
          <label className="dy-text-sm dy-font-semibold dy-text-foreground/70 dy-tracking-tight dy-leading-none">
            {label}
          </label>
        )}

        <div className="dy-grid dy-grid-cols-2 dy-gap-3 md:dy-grid-cols-3 lg:dy-grid-cols-4 lg:dy-gap-4">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="dy-group dy-relative dy-aspect-square dy-rounded-lg dy-border-2 dy-border-dashed dy-border-muted hover:dy-border-primary/40 hover:dy-bg-primary/5 dy-transition-all dy-flex dy-flex-col dy-items-center dy-justify-center dy-gap-3 dy-overflow-hidden"
          >
            <div className="dy-absolute dy-inset-0 dy-bg-primary/5 dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-opacity" />
            <div className="dy-h-12 dy-w-12 dy-bg-muted dy-rounded-full dy-flex dy-items-center dy-justify-center dy-text-muted-foreground dy-group-hover:dy-bg-primary/10 dy-group-hover:dy-text-primary dy-transition-all dy-shadow-inner">
              <Plus className="dy-h-6 dy-w-6" />
            </div>
            <div className="dy-text-center dy-px-4">
              <p className="dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground dy-group-hover:dy-text-primary dy-transition-colors">Add Media</p>
              <p className="dy-text-[10px] dy-text-muted-foreground/40 dy-mt-1 dy-font-medium dy-group-hover:dy-text-primary/60">Select or upload</p>
            </div>
          </button>

          {selectedValues.map((val, index) => {
            const valId = getIdentifier(val)
            const item = localMediaCache.find((m: any) => m.id === valId || m.filename === valId || m.url === valId)
            return (
              <div key={valId} className="dy-relative dy-group dy-animate-in dy-zoom-in dy-duration-300">
                <div className={cn(
                  "dy-relative dy-aspect-square dy-rounded-lg dy-overflow-hidden dy-border-2 dy-bg-muted/20 dy-transition-all dy-shadow-sm",
                  index === 0 ? "dy-border-primary dy-ring-4 dy-ring-primary/10" : "dy-border-border/40 hover:dy-border-border/80"
                )}>
                  {item ? (
                    <img
                      src={getPreviewUrl(item)}
                      alt=""
                      className="dy-w-full dy-h-full dy-object-cover dy-transition-transform dy-group-hover:dy-scale-110"
                    />
                  ) : val ? (
                    <img
                      src={getMediaUrl(val, client?.getBaseUrl() || "")}
                      alt=""
                      className="dy-w-full dy-h-full dy-object-cover dy-transition-transform dy-group-hover:dy-scale-110"
                    />
                  ) : (
                    <div className="dy-w-full dy-h-full dy-animate-pulse dy-bg-muted/50 dy-flex dy-items-center dy-justify-center">
                      <ImageIcon className="dy-h-6 dy-w-6 dy-text-muted-foreground/20" />
                    </div>
                  )}

                  {index === 0 && (
                    <div className="dy-absolute dy-top-0 dy-left-0 dy-w-full dy-text-center dy-z-10 dy-px-3 dy-py-1 dy-bg-primary dy-text-white dy-text-[9px] dy-font-black dy-uppercase dy-tracking-widest dy-shadow-primary/20">
                      Main Image
                    </div>
                  )}

                  <div className="dy-absolute dy-inset-0 dy-flex dy-items-start dy-justify-end dy-gap-1 dy-bg-black/25 dy-p-1.5 dy-opacity-100 dy-transition-all sm:dy-bg-black/40 sm:dy-opacity-0 sm:dy-group-hover:dy-opacity-100 sm:dy-backdrop-blur-[2px]">
                    {checkIsCropable(valId, item) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="dy-h-9 dy-w-9 dy-rounded-lg dy-text-foreground dy-bg-background/90 dy-shadow-2xl sm:dy-h-8 sm:dy-w-8 sm:dy-scale-75 sm:dy-group-hover:dy-scale-100 sm:dy-transition-all"
                        onClick={() => openCrop(valId, item)}
                        title="Crop image"
                      >
                        <Scissors className="dy-w-4 dy-h-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="dy-h-9 dy-w-9 dy-rounded-lg dy-text-destructive dy-bg-destructive-foreground dy-shadow-2xl sm:dy-h-8 sm:dy-w-8 sm:dy-scale-75 sm:dy-group-hover:dy-scale-100 sm:dy-transition-all"
                      onClick={() => toggleValue(valId, item)}
                    >
                      <Trash2 className="dy-w-5 dy-h-5" />
                    </Button>
                  </div>

                  {item && (
                    <div className="dy-absolute dy-inset-x-0 dy-bottom-0 dy-p-2 dy-bg-gradient-to-t dy-from-black/60 dy-to-transparent dy-opacity-100 dy-transition-opacity sm:dy-opacity-0 sm:dy-group-hover:dy-opacity-100">
                      <p className="dy-text-[10px] dy-text-white dy-truncate dy-font-medium">{getDisplayFilename(item.filename)}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <MediaLibraryDialog
          collection={activeMediaCollection}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          selectedValues={selectedValues}
          onSelect={toggleValue}
          multiple={multiple}
          onConfirm={handleConfirm}
        />

        <ImageCropDialog
          open={!!cropState}
          onOpenChange={(o) => { if (!o) setCropState(null) }}
          imageUrl={cropState?.imageUrl || ""}
          filename={cropState?.filename}
          onConfirm={handleCropConfirm}
        />
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      onPaste={handlePaste}
      className={cn("dy-relative", isIcon ? "" : "dy-space-y-3")}
    >
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="dy-absolute dy-inset-0 dy-z-50 dy-bg-primary/10 dy-backdrop-blur-[2px] dy-border-2 dy-border-dashed dy-border-primary dy-rounded-2xl dy-flex dy-items-center dy-justify-center dy-pointer-events-none">
          <div className="dy-bg-card dy-p-3 dy-rounded-lg dy-shadow-xl dy-flex dy-items-center dy-gap-2">
            <UploadCloud className="dy-h-4 dy-w-4 dy-text-primary dy-animate-bounce" />
            <p className="dy-text-[11px] dy-font-bold">Drop file here</p>
          </div>
        </div>
      )}
      {uploading && (
        <div className="dy-absolute dy-inset-0 dy-z-50 dy-bg-background/60 dy-backdrop-blur-[1px] dy-rounded-2xl dy-flex dy-items-center dy-justify-center dy-pointer-events-none">
          <div className="dy-bg-card dy-p-3 dy-rounded-lg dy-shadow-xl dy-w-48 dy-max-w-[85%] dy-space-y-2">
            <div className="dy-flex dy-items-center dy-justify-between dy-gap-2">
              <div className="dy-flex dy-items-center dy-gap-2">
                <Loader2 className="dy-h-4 dy-w-4 dy-text-primary dy-animate-spin" />
                <p className="dy-text-[11px] dy-font-bold">Uploading…</p>
              </div>
              <span className="dy-text-[11px] dy-font-bold dy-tabular-nums dy-text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="dy-h-1.5 dy-rounded-full" />
          </div>
        </div>
      )}

      {label && !isIcon && (
        <label className="dy-text-sm dy-font-semibold dy-text-foreground/70 dy-tracking-tight dy-leading-none dy-peer-disabled:dy-cursor-not-allowed dy-peer-disabled:dy-opacity-70">
          {label}
        </label>
      )}

      <div className={isIcon ? "" : "dy-relative"}>
        {!isIcon && (
          <div className="dy-grid dy-grid-cols-2 dy-gap-3 sm:dy-grid-cols-3 md:dy-grid-cols-4 lg:dy-grid-cols-5 lg:dy-gap-4">
            {selectedValues.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                disabled={disabled}
                className="dy-group dy-relative dy-aspect-square dy-rounded-lg dy-border-2 dy-border-dashed dy-border-muted hover:dy-border-primary/40 hover:dy-bg-primary/5 disabled:dy-cursor-not-allowed disabled:dy-opacity-60 dy-transition-all dy-flex dy-flex-col dy-items-center dy-justify-center dy-gap-3 dy-overflow-hidden"
              >
                <div className="dy-absolute dy-inset-0 dy-bg-primary/5 dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-opacity" />
                <div className="dy-h-12 dy-w-12 dy-bg-muted dy-rounded-full dy-flex dy-items-center dy-justify-center dy-text-muted-foreground dy-group-hover:dy-bg-primary/10 dy-group-hover:dy-text-primary dy-transition-all dy-shadow-inner">
                  <Plus className="dy-h-6 dy-w-6" />
                </div>
                <div className="dy-text-center dy-px-4">
                  <p className="dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground dy-group-hover:dy-text-primary dy-transition-colors">Add Media</p>
                  <p className="dy-text-[10px] dy-text-muted-foreground/40 dy-mt-1 dy-font-medium dy-group-hover:dy-text-primary/60">{placeholder || "Select or upload"}</p>
                </div>
              </button>
            ) : (
              selectedValues.slice(0, 1).map((val) => {
                const valId = getIdentifier(val)
                const item = localMediaCache.find((m: any) => m.id === valId || m.filename === valId || m.url === valId)
                const previewUrl = item ? getPreviewUrl(item) : (val ? getMediaUrl(val, client?.getBaseUrl() || "") : "")
                return (
                  <div
                    key={valId}
                    className="dy-relative dy-aspect-square dy-group dy-rounded-lg dy-overflow-hidden dy-border-2 dy-border-primary dy-ring-4 dy-ring-primary/10 dy-transition-all dy-bg-muted/20 dy-shadow-sm"
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setIsOpen(true)}
                      className="dy-h-full dy-w-full disabled:dy-cursor-not-allowed"
                      title={`Change ${displayValue}`}
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt=""
                          className="dy-w-full dy-h-full dy-object-cover dy-transition-transform dy-group-hover:dy-scale-110"
                        />
                      ) : (
                        <div className="dy-w-full dy-h-full dy-animate-pulse dy-bg-muted/50 dy-flex dy-items-center dy-justify-center">
                          <ImageIcon className="dy-h-6 dy-w-6 dy-text-muted-foreground/20" />
                        </div>
                      )}
                    </button>

                    {!disabled && (
                      <div className="dy-pointer-events-none dy-absolute dy-inset-0 dy-flex dy-items-start dy-justify-end dy-gap-1 dy-bg-black/25 dy-p-1.5 dy-opacity-100 dy-transition-all sm:dy-bg-black/40 sm:dy-opacity-0 sm:dy-group-hover:dy-opacity-100 sm:dy-backdrop-blur-[2px]">
                        {checkIsCropable(valId, item) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="dy-pointer-events-auto dy-h-9 dy-w-9 dy-rounded-lg dy-text-foreground dy-bg-background/90 dy-shadow-2xl sm:dy-h-8 sm:dy-w-8 sm:dy-scale-75 sm:dy-group-hover:dy-scale-100 sm:dy-transition-all"
                            onClick={() => openCrop(valId, item)}
                            title="Crop image"
                          >
                            <Scissors className="dy-w-4 dy-h-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="dy-pointer-events-auto dy-h-9 dy-w-9 dy-rounded-lg dy-text-destructive dy-bg-destructive-foreground dy-shadow-2xl sm:dy-h-8 sm:dy-w-8 sm:dy-scale-75 sm:dy-group-hover:dy-scale-100 sm:dy-transition-all"
                          onClick={() => onChange("")}
                          title="Remove media"
                        >
                          <Trash2 className="dy-w-5 dy-h-5" />
                        </Button>
                      </div>
                    )}

                    <div className="dy-absolute dy-inset-x-0 dy-bottom-0 dy-p-2 dy-bg-gradient-to-t dy-from-black/60 dy-to-transparent dy-opacity-100 dy-transition-opacity sm:dy-opacity-0 sm:dy-group-hover:dy-opacity-100">
                      <p className="dy-text-[10px] dy-text-white dy-truncate dy-font-medium">{getDisplayFilename(item?.filename) || displayValue || "Media"}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {isIcon && (
          <Button variant="ghost" size="sm" className="dy-px-2 dy-h-8 dy-w-8 dy-rounded-lg" disabled={disabled} onClick={() => setIsOpen(true)}>
            <ImageIcon className="dy-h-4 dy-w-4" />
          </Button>
        )}

        <MediaLibraryDialog
          collection={activeMediaCollection}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          selectedValues={selectedValues}
          onSelect={toggleValue}
          multiple={multiple}
          onConfirm={handleConfirm}
        />

        <ImageCropDialog
          open={!!cropState}
          onOpenChange={(o) => { if (!o) setCropState(null) }}
          imageUrl={cropState?.imageUrl || ""}
          filename={cropState?.filename}
          onConfirm={handleCropConfirm}
        />
      </div>

    </div>
  )
}
