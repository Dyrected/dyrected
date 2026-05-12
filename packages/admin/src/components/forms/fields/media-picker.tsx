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
  const { client } = useDyrected()
  const [isOpen, setIsOpen] = React.useState(false)

  const selectedValues = React.useMemo(() => {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }, [value])

  const toggleValue = (id: string) => {
    if (multiple) {
      const next = selectedValues.includes(id)
        ? selectedValues.filter(v => v !== id)
        : [...selectedValues, id]
      onChange(next)
    } else {
      onChange(id)
    }
  }

  const handleConfirm = (ids: string[]) => {
    if (multiple) {
      const next = [...new Set([...selectedValues, ...ids])]
      onChange(next)
    } else if (ids.length > 0) {
      onChange(ids[0])
    }
    setIsOpen(false)
  }

  // Fetch media for thumbnails in the field view
  const { data: media } = useQuery({
    queryKey: [collection, "previews", selectedValues],
    queryFn: () => {
      if (selectedValues.length === 0) return []
      return client!.listMedia({
        where: { id: { in: selectedValues } }
      }, collection).then((r: any) => r.docs)
    },
    enabled: !!client && selectedValues.length > 0,
  })

  const getPreviewUrl = (item: any) => {
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
      <div className="space-y-4">
        {label && (
          <label className="text-sm font-semibold text-foreground/70 tracking-tight leading-none">
            {label}
          </label>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative aspect-square rounded-xl border-2 border-dashed border-muted hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-inner">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-center px-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Add Media</p>
              <p className="text-[10px] text-muted-foreground/40 mt-1 font-medium group-hover:text-primary/60">Select or upload</p>
            </div>
          </button>

          {selectedValues.map((val, index) => {
            const item = media?.find((m: any) => m.id === val)
            return (
              <div key={val} className="relative group animate-in zoom-in duration-300">
                <div className={cn(
                  "relative aspect-square rounded-xl overflow-hidden border-2 bg-muted/20 transition-all shadow-sm",
                  index === 0 ? "border-primary ring-4 ring-primary/10" : "border-border/40 hover:border-border/80"
                )}>
                  {item ? (
                    <img
                      src={getPreviewUrl(item)}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full animate-pulse bg-muted/50 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground/20" />
                    </div>
                  )}

                  {index === 0 && (
                    <div className="absolute top-0 left-0 w-full text-center z-10 px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest shadow-primary/20">
                      Main Image
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-start justify-end backdrop-blur-[2px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-destructive bg-destructive-foreground shadow-2xl scale-75 group-hover:scale-100 transition-all"
                      onClick={() => toggleValue(val)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>

                  {item && (
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white truncate font-medium">{item.filename}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <MediaLibraryDialog
          collection={collection}
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
    <div className={isIcon ? "" : "space-y-3"}>
      {label && !isIcon && (
        <label className="text-sm font-semibold text-foreground/70 tracking-tight leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}

      <div className={isIcon ? "" : "relative flex items-center gap-2"}>
        {!isIcon && (
          <div className="relative flex-1 group">
            <Input
              value={displayValue}
              readOnly
              disabled={disabled}
              placeholder={placeholder || "No media selected"}
              className="pr-24 bg-muted/30 border-dashed focus-visible:ring-offset-0 focus-visible:ring-1 h-10 rounded-xl"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 pr-1">
              {value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors rounded-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    onChange(multiple ? [] : "");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 text-xs font-bold px-3 rounded-lg shadow-sm border border-border/50"
                disabled={disabled}
                onClick={() => setIsOpen(true)}
              >
                {value ? "Change" : "Select"}
              </Button>
            </div>
          </div>
        )}

        {isIcon && (
          <Button variant="ghost" size="sm" className="px-2 h-8 w-8 rounded-lg" disabled={disabled} onClick={() => setIsOpen(true)}>
            <ImageIcon className="h-4 w-4" />
          </Button>
        )}

        <MediaLibraryDialog
          collection={collection}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          selectedValues={selectedValues}
          onSelect={toggleValue}
          multiple={multiple}
          onConfirm={handleConfirm}
        />
      </div>

      {!isIcon && selectedValues.length > 0 && !multiple && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
          {selectedValues.map((val) => {
            const item = media?.find((m: any) => m.id === val)
            if (!item) return (
              <div key={val} className="aspect-square rounded-xl bg-muted/20 animate-pulse border-2 border-dashed border-border/50" />
            )
            return (
              <div
                key={val}
                className="relative aspect-square group rounded-2xl overflow-hidden border-2 border-border/50 hover:border-primary/50 transition-all bg-muted/20 shadow-sm"
              >
                <img
                  src={getPreviewUrl(item)}
                  alt=""
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => toggleValue(val)}
                    className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg border-2 border-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white truncate font-medium">{item.filename}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
