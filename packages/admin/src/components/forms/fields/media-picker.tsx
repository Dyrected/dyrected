import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-provider"
import { Button } from "../../ui/button"
import {
  Image as ImageIcon,
  X,
} from "lucide-react"
import { Input } from "../../ui/input"
import { getMediaUrl } from "../../../lib/utils"
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

  // Fetch media for thumbnails in the field view
  const { data: media } = useQuery({
    queryKey: [collection, "previews", selectedValues],
    queryFn: () => {
      if (selectedValues.length === 0) return []
      return client!.listMedia({
        where: { id: { in: selectedValues } }
      }).then((r: any) => r.docs)
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
          onConfirm={() => setIsOpen(false)}
        />
      </div>

      {!isIcon && selectedValues.length > 0 && (
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
