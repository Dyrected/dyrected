import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-provider"
import { Button } from "../../ui/button"
import {
  Image as ImageIcon,
  X,
  Plus,
  Trash2,
  UploadCloud,
  Loader2,
  Scissors,
} from "lucide-react"
import { Input } from "../../ui/input"
import { cn, getMediaUrl } from "../../../lib/utils"
import { MediaLibraryDialog } from "../../media/media-library-dialog"
import { ImageCropDialog } from "./image-crop-dialog"
import type { Media } from "@dyrected/sdk"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"

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
  const [uploading, setUploading] = React.useState(false)
  const [cropState, setCropState] = React.useState<{ targetId: string; imageUrl: string; filename: string } | null>(null)

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

  // Seed cache from populated objects in value
  React.useEffect(() => {
    if (!value) return
    const vals = Array.isArray(value) ? value : [value]
    const objects = vals.filter((v: any) => typeof v === "object" && v !== null)
    if (objects.length > 0) {
      Promise.resolve().then(() => {
        setLocalMediaCache((prev) => {
          const next = [...prev]
          objects.forEach((obj: any) => {
            if (obj.id && !next.some((m) => m.id === obj.id)) {
              next.push(obj)
            }
          })
          return next
        })
      })
    }
  }, [value])

  const activeMediaCollection = React.useMemo(() => {
    const targetColl = schemas?.collections?.find((c: any) => c.slug === collection)
    if (targetColl?.upload) return collection
    return "media"
  }, [schemas, collection])

  const missingIds = React.useMemo(() => {
    return selectedIds.filter(id => !localMediaCache.some(m => m.id === id || m.filename === id || m.url === id))
  }, [selectedIds, localMediaCache])

  // Fetch missing media for previews
  const { data: fetchedMedia } = useQuery({
    queryKey: [activeMediaCollection, "previews", missingIds],
    queryFn: () => {
      if (missingIds.length === 0) return []
      return client!.listMedia({
        where: {
          OR: [
            { id: { in: missingIds } },
            { filename: { in: missingIds } }
          ]
        }
      }, activeMediaCollection).then((r: any) => r.docs)
    },
    enabled: !!client && missingIds.length > 0,
  })

  React.useEffect(() => {
    if (fetchedMedia && fetchedMedia.length > 0) {
      Promise.resolve().then(() => {
        setLocalMediaCache((prev) => {
          const next = [...prev]
          fetchedMedia.forEach((obj: any) => {
            if (obj.id && !next.some((m) => m.id === obj.id)) {
              next.push(obj)
            }
          })
          return next
        })
      })
    }
  }, [fetchedMedia])

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

  const toggleValue = (id: string, item?: any) => {
    if (item && item.id) {
      setLocalMediaCache(prev => {
        if (!prev.some(m => m.id === item.id)) {
          return [...prev, item]
        }
        return prev
      })
    }

    const resolvedItem = item || localMediaCache.find(m => m.id === id || m.filename === id || m.url === id)
    const matchId = resolvedItem?.id || id
    const isSelected = selectedIds.includes(matchId)

    if (multiple) {
      let nextIds: string[]
      if (isSelected) {
        nextIds = selectedIds.filter(v => v !== matchId)
      } else {
        nextIds = [...selectedIds, matchId]
      }
      const nextValues = nextIds.map(nid => {
        const cached = localMediaCache.find(m => m.id === nid || m.filename === nid || m.url === nid)
        return cached ? getFullUrl(cached) : nid
      })
      onChange(nextValues)
    } else {
      if (isSelected) {
        onChange("")
      } else {
        onChange(resolvedItem ? getFullUrl(resolvedItem) : id)
      }
    }
  }

  const handleConfirm = React.useCallback((ids: string[], items?: any[]) => {
    if (items && items.length > 0) {
      setLocalMediaCache(prev => {
        const next = [...prev]
        items.forEach(item => {
          if (item && item.id && !next.some(m => m.id === item.id)) {
            next.push(item)
          }
        })
        return next
      })
    }

    if (multiple) {
      const nextIds = [...selectedIds]
      ids.forEach(id => {
        if (!nextIds.includes(id)) {
          nextIds.push(id)
        }
      })
      const nextValues = nextIds.map(nid => {
        const cached = localMediaCache.find(m => m.id === nid || m.filename === nid || m.url === nid) || items?.find(m => m.id === nid || m.filename === nid || m.url === nid)
        return cached ? getFullUrl(cached) : nid
      })
      onChange(nextValues)
    } else if (ids.length > 0) {
      const nid = ids[0]
      const cached = localMediaCache.find(m => m.id === nid || m.filename === nid || m.url === nid) || items?.find(m => m.id === nid || m.filename === nid || m.url === nid)
      onChange(cached ? getFullUrl(cached) : nid)
    }
    setIsOpen(false)
  }, [multiple, selectedIds, localMediaCache, getFullUrl, onChange])

  const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !client) return
    setUploading(true)
    const toastId = toast.loading(`Uploading ${acceptedFiles.length} file(s)...`)
    try {
      const uploadedItems: any[] = []
      for (const file of acceptedFiles) {
        const res = await client.collection(activeMediaCollection).upload(file)
        uploadedItems.push(res)
      }

      setLocalMediaCache(prev => {
        const next = [...prev]
        uploadedItems.forEach(item => {
          if (item && item.id && !next.some(m => m.id === item.id)) {
            next.push(item)
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

      toast.success(`Successfully uploaded and selected ${acceptedFiles.length} asset(s)`, { id: toastId })
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message, id: toastId })
    } finally {
      setUploading(false)
    }
  }, [client, activeMediaCollection, multiple, selectedIds, localMediaCache, getFullUrl, onChange])

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
      const url = id.includes("/") ? id : getMediaUrl({ filename: id }, client?.getBaseUrl() || "")
      const filename = url.split("/").pop() || "image.jpg"
      setCropState({ targetId: id, imageUrl: url, filename })
    }
  }, [localMediaCache, client])

  const handleCropConfirm = React.useCallback(async (blob: Blob, cropFilename: string) => {
    if (!client || !cropState) return
    const file = new File([blob], cropFilename, { type: blob.type })
    const toastId = toast.loading("Uploading cropped image…")
    try {
      const uploaded = await client.collection(activeMediaCollection).upload(file)
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

  const getPreviewUrl = (item: Media) => {
    if (!item) return ""
    if (item.mimeType === "video/youtube") {
      const match = item.url?.match(/(?:youtu\.be\/|youtube\.com\/(?:v\/|u\/\w\/|embed\/|watch\?v=))([^#&?]*)/)
      const videoId = match && match[1]
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    }
    return getMediaUrl(item, client?.getBaseUrl() || "")
  }

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
            <div className="dy-bg-card dy-p-4 dy-rounded-xl dy-shadow-xl dy-flex dy-items-center dy-gap-2">
              <UploadCloud className="dy-h-5 dy-w-5 dy-text-primary dy-animate-bounce" />
              <p className="dy-text-xs dy-font-bold">Drop to upload & select</p>
            </div>
          </div>
        )}
        {uploading && (
          <div className="dy-absolute dy-inset-0 dy-z-50 dy-bg-background/60 dy-backdrop-blur-[1px] dy-rounded-2xl dy-flex dy-items-center dy-justify-center dy-pointer-events-none">
            <div className="dy-bg-card dy-p-4 dy-rounded-xl dy-shadow-xl dy-flex dy-items-center dy-gap-2">
              <Loader2 className="dy-h-5 dy-w-5 dy-text-primary dy-animate-spin" />
              <p className="dy-text-xs dy-font-bold">Uploading files...</p>
            </div>
          </div>
        )}

        {label && (
          <label className="dy-text-sm dy-font-semibold dy-text-foreground/70 dy-tracking-tight dy-leading-none">
            {label}
          </label>
        )}

        <div className="dy-grid dy-grid-cols-2 md:dy-grid-cols-3 lg:dy-grid-cols-4 dy-gap-4">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="dy-group dy-relative dy-aspect-square dy-rounded-xl dy-border-2 dy-border-dashed dy-border-muted hover:dy-border-primary/40 hover:dy-bg-primary/5 dy-transition-all dy-flex dy-flex-col dy-items-center dy-justify-center dy-gap-3 dy-overflow-hidden"
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
                  "dy-relative dy-aspect-square dy-rounded-xl dy-overflow-hidden dy-border-2 dy-bg-muted/20 dy-transition-all dy-shadow-sm",
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

                  <div className="dy-absolute dy-inset-0 dy-bg-black/40 dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-all dy-flex dy-items-start dy-justify-end dy-gap-1 dy-p-1.5 dy-backdrop-blur-[2px]">
                    {checkIsCropable(valId, item) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="dy-h-8 dy-w-8 dy-rounded-lg dy-text-foreground dy-bg-background/90 dy-shadow-2xl dy-scale-75 dy-group-hover:dy-scale-100 dy-transition-all"
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
                      className="dy-h-8 dy-w-8 dy-rounded-lg dy-text-destructive dy-bg-destructive-foreground dy-shadow-2xl dy-scale-75 dy-group-hover:dy-scale-100 dy-transition-all"
                      onClick={() => toggleValue(valId, item)}
                    >
                      <Trash2 className="dy-w-5 dy-h-5" />
                    </Button>
                  </div>

                  {item && (
                    <div className="dy-absolute dy-inset-x-0 dy-bottom-0 dy-p-2 dy-bg-gradient-to-t dy-from-black/60 dy-to-transparent dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-opacity">
                      <p className="dy-text-[10px] dy-text-white dy-truncate dy-font-medium">{item.filename}</p>
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
          <div className="dy-bg-card dy-p-3 dy-rounded-xl dy-shadow-xl dy-flex dy-items-center dy-gap-2">
            <UploadCloud className="dy-h-4 dy-w-4 dy-text-primary dy-animate-bounce" />
            <p className="dy-text-[11px] dy-font-bold">Drop file here</p>
          </div>
        </div>
      )}
      {uploading && (
        <div className="dy-absolute dy-inset-0 dy-z-50 dy-bg-background/60 dy-backdrop-blur-[1px] dy-rounded-2xl dy-flex dy-items-center dy-justify-center dy-pointer-events-none">
          <div className="dy-bg-card dy-p-3 dy-rounded-xl dy-shadow-xl dy-flex dy-items-center dy-gap-2">
            <Loader2 className="dy-h-4 dy-w-4 dy-text-primary dy-animate-spin" />
            <p className="dy-text-[11px] dy-font-bold">Uploading...</p>
          </div>
        </div>
      )}

      {label && !isIcon && (
        <label className="dy-text-sm dy-font-semibold dy-text-foreground/70 dy-tracking-tight dy-leading-none dy-peer-disabled:dy-cursor-not-allowed dy-peer-disabled:dy-opacity-70">
          {label}
        </label>
      )}

      <div className={isIcon ? "" : "dy-relative dy-flex dy-items-center dy-gap-2"}>
        {!isIcon && (
          <div className="dy-relative dy-flex-1 dy-group">
            <Input
              value={displayValue}
              readOnly
              disabled={disabled}
              placeholder={placeholder || "No media selected"}
              className="dy-pr-24 dy-bg-muted/30 dy-border-dashed focus-visible:dy-ring-offset-0 focus-visible:dy-ring-1 dy-h-10 dy-rounded-xl"
            />
            <div className="dy-absolute dy-right-1 dy-top-1/2 dy--translate-y-1/2 dy-flex dy-items-center dy-gap-1 dy-pr-1">
              {value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="dy-h-7 dy-w-7 dy-text-muted-foreground hover:dy-text-destructive dy-transition-colors dy-rounded-lg"
                  onClick={(e) => {
                    e.preventDefault()
                    onChange(multiple ? [] : "")
                  }}
                >
                  <X className="dy-h-4 dy-w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="dy-h-8 dy-text-xs dy-font-bold dy-px-3 dy-rounded-lg dy-shadow-sm dy-border dy-border-border/50"
                disabled={disabled}
                onClick={() => setIsOpen(true)}
              >
                {value ? "Change" : "Select"}
              </Button>
            </div>
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

      {!isIcon && selectedValues.length > 0 && !multiple && (
        <div className="dy-grid dy-grid-cols-2 sm:dy-grid-cols-3 md:dy-grid-cols-4 lg:dy-grid-cols-5 dy-gap-4 dy-pt-2">
          {selectedValues.map((val) => {
            const valId = getIdentifier(val)
            const item = localMediaCache.find((m: any) => m.id === valId || m.filename === valId || m.url === valId)
            const previewUrl = item ? getPreviewUrl(item) : (val ? getMediaUrl(val, client?.getBaseUrl() || "") : "")
            return (
              <div
                key={valId}
                className="dy-relative dy-aspect-square dy-group dy-rounded-2xl dy-overflow-hidden dy-border-2 dy-border-border/50 hover:dy-border-primary/50 dy-transition-all dy-bg-muted/20 dy-shadow-sm"
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
                {!disabled && (
                  <div className="dy-absolute dy-top-2 dy-right-2 dy-flex dy-flex-col dy-gap-1 dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-all">
                    {checkIsCropable(valId, item) && (
                      <button
                        type="button"
                        onClick={() => openCrop(valId, item)}
                        title="Crop image"
                        className="dy-p-1.5 dy-bg-background/90 dy-text-foreground dy-rounded-full hover:dy-scale-110 dy-transition-all dy-shadow-lg dy-border-2 dy-border-white"
                      >
                        <Scissors className="dy-h-3.5 dy-w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleValue(valId, item)}
                      className="dy-p-1.5 dy-bg-destructive dy-text-destructive-foreground dy-rounded-full hover:dy-scale-110 dy-transition-all dy-shadow-lg dy-border-2 dy-border-white"
                    >
                      <X className="dy-h-3.5 dy-w-3.5" />
                    </button>
                  </div>
                )}
                <div className="dy-absolute dy-inset-x-0 dy-bottom-0 dy-p-2 dy-bg-gradient-to-t dy-from-black/60 dy-to-transparent dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-opacity">
                  <p className="dy-text-[10px] dy-text-white dy-truncate dy-font-medium">{item?.filename || (typeof val === "string" ? val.split("/").pop() : "Media")}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
