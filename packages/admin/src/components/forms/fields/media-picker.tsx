import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-provider"
import { Button } from "../../ui/button"
import {
  Image as ImageIcon,
  X,
  Plus,
  Trash2,
} from "lucide-react"
import { Input } from "../../ui/input"
import { cn, getMediaUrl } from "../../../lib/utils"
import { MediaLibraryDialog } from "../../media/media-library-dialog"
import type { Media } from "@dyrected/sdk"

interface MediaPickerProps {
  collection: string
  value?: string | string[]
  onChange: (value: string | string[]) => void
  label?: string
  variant?: "default" | "icon"
  disabled?: boolean
  multiple?: boolean
  placeholder?: string
}

export function MediaPicker({
  collection,
  value,
  onChange,
  label,
  variant = "default",
  disabled,
  multiple,
  placeholder
}: MediaPickerProps) {
  const { client, schemas } = useDyrected()
  const [isOpen, setIsOpen] = React.useState(false)

  const selectedValues = React.useMemo(() => {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }, [value])

  // Extract IDs/filenames from selectedValues (which could be URLs or IDs)
  const selectedIds = React.useMemo(() => {
    return selectedValues.map((v: string) => {
      // If it's a URL, try to extract the ID/filename from it
      if (v?.includes('/')) {
        return v.split('/').pop() || v
      }
      return v
    })
  }, [selectedValues])

  const activeMediaCollection = React.useMemo(() => {
    const targetColl = schemas?.collections?.find((c: any) => c.slug === collection)
    if (targetColl?.upload) return collection
    return "media"
  }, [schemas, collection])

  const getFullUrl = (id: string): string => {
    const item = media?.find((m: any) => m.id === id || m.filename === id || m.url === id)
    if (item) {
      if (item.mimeType === 'video/youtube') {
        return item.url || ""
      }
      return getMediaUrl(item, client?.getBaseUrl() || "")
    }
    // Fallback if media not yet loaded
    return getMediaUrl(id, client?.getBaseUrl() || "")
  }

  const toggleValue = (id: string) => {
    const item = media?.find((m: any) => m.id === id || m.filename === id || m.url === id)
    const matchId = item?.id || id
    const matchFilename = item?.filename || id
    const matchUrl = item?.url || id

    const isSelected = selectedValues.some(v => v === matchId || v === matchFilename || v === matchUrl)

    if (multiple) {
      const next = isSelected
        ? selectedValues.filter(v => v !== matchId && v !== matchFilename && v !== matchUrl)
        : [...selectedValues, getFullUrl(id)]
      onChange(next)
    } else {
      onChange(isSelected ? "" : getFullUrl(id))
    }
  }

  const handleConfirm = (ids: string[]) => {
    if (multiple) {
      const next = [...selectedValues]
      ids.forEach(id => {
        const item = media?.find((m: any) => m.id === id || m.filename === id || m.url === id)
        const matchId = item?.id || id
        const matchFilename = item?.filename || id
        const matchUrl = item?.url || id
        const isSelected = next.some(v => v === matchId || v === matchFilename || v === matchUrl)
        if (!isSelected) {
          next.push(getFullUrl(id))
        }
      })
      onChange(next)
    } else if (ids.length > 0) {
      onChange(getFullUrl(ids[0]))
    }
    setIsOpen(false)
  }

  // Fetch media for thumbnails in the field view
  const { data: media } = useQuery({
    queryKey: [activeMediaCollection, "previews", selectedValues],
    queryFn: () => {
      if (selectedValues.length === 0) return []
      return client!.listMedia({
        where: {
          OR: [
            { id: { in: selectedIds } },
            { filename: { in: selectedIds } },
            { url: { in: selectedValues } }
          ]
        }
      }, activeMediaCollection).then((r: any) => r.docs)
    },
    enabled: !!client && selectedValues.length > 0,
  })

  const getPreviewUrl = (item: Media) => {
    if (!item) return ""
    if (item.mimeType === 'video/youtube') {
      const match = item.url?.match(/(?:youtu\.be\/|youtube\.com\/(?:v\/|u\/\w\/|embed\/|watch\?v=))([^#\&\?]*)/)
      const videoId = match && match[1]
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    }
    return getMediaUrl(item, client?.getBaseUrl() || "");
  }

  const isIcon = variant === "icon"
  const getDisplayString = (val: any): string => {
    if (!val) return ""
    if (Array.isArray(val)) {
      if (val.length === 0) return ""
      return `${val.length} items selected`
    }
    if (typeof val === 'object') return val.filename || val.id || val.slug || "Object"
    return String(val)
  }
  const displayValue = getDisplayString(value)

  if (multiple && !isIcon) {
    return (
      <div className="dy-space-y-4">
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
            const item = media?.find((m: any) => m.id === val || m.filename === val || m.url === val)
            return (
              <div key={val} className="dy-relative dy-group dy-animate-in dy-zoom-in dy-duration-300">
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

                  <div className="dy-absolute dy-inset-0 dy-bg-black/40 dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-all dy-flex dy-items-start dy-justify-end dy-backdrop-blur-[2px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="dy-h-8 dy-w-8 dy-rounded-lg dy-text-destructive dy-bg-destructive-foreground dy-shadow-2xl dy-scale-75 dy-group-hover:dy-scale-100 dy-transition-all"
                      onClick={() => toggleValue(val)}
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
      </div>
    )
  }

  return (
    <div className={isIcon ? "" : "dy-space-y-3"}>
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
                    e.preventDefault();
                    onChange(multiple ? [] : "");
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
      </div>

      {!isIcon && selectedValues.length > 0 && !multiple && (
        <div className="dy-grid dy-grid-cols-2 sm:dy-grid-cols-3 md:dy-grid-cols-4 lg:dy-grid-cols-5 dy-gap-4 dy-pt-2">
          {selectedValues.map((val) => {
            const item = media?.find((m: any) => m.id === val || m.filename === val || m.url === val)
            const previewUrl = item ? getPreviewUrl(item) : (val ? getMediaUrl(val, client?.getBaseUrl() || "") : "")
            return (
              <div
                key={val}
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
                  <button
                    type="button"
                    onClick={() => toggleValue(val)}
                    className="dy-absolute dy-top-2 dy-right-2 dy-p-1.5 dy-bg-destructive dy-text-destructive-foreground dy-rounded-full dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-all hover:dy-scale-110 dy-shadow-lg dy-border-2 dy-border-white"
                  >
                    <X className="dy-h-3.5 dy-w-3.5" />
                  </button>
                )}
                <div className="dy-absolute dy-inset-x-0 dy-bottom-0 dy-p-2 dy-bg-gradient-to-t dy-from-black/60 dy-to-transparent dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-opacity">
                  <p className="dy-text-[10px] dy-text-white dy-truncate dy-font-medium">{item?.filename || (typeof val === 'string' ? val.split('/').pop() : 'Media')}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
