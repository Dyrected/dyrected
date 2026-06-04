import * as React from "react"
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { Button } from "../../ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog"
import { Loader2 } from "lucide-react"
import { cn } from "../../../lib/utils"

interface ImageCropDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
  filename?: string
  onConfirm: (blob: Blob, filename: string) => Promise<void>
}

const ASPECT_PRESETS: { label: string; value: number | undefined }[] = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
]

function centerAspectCrop(width: number, height: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, aspect, width, height),
    width,
    height
  )
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageUrl,
  filename = "image.jpg",
  onConfirm,
}: ImageCropDialogProps) {
  const imgRef = React.useRef<HTMLImageElement>(null)
  const [crop, setCrop] = React.useState<Crop>()
  const [completedCrop, setCompletedCrop] = React.useState<PixelCrop>()
  const [aspect, setAspect] = React.useState<number | undefined>(undefined)
  const [saving, setSaving] = React.useState(false)

  const onImageLoad = () => {
    // Default: select 80% of the image free-form
    setCrop({
      unit: "%",
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    })
    setCompletedCrop(undefined)
  }

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect)
    if (imgRef.current) {
      const { width, height } = imgRef.current
      if (newAspect) {
        setCrop(centerAspectCrop(width, height, newAspect))
      } else {
        setCrop({ unit: "%", x: 10, y: 10, width: 80, height: 80 })
      }
      setCompletedCrop(undefined)
    }
  }

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop || completedCrop.width === 0 || completedCrop.height === 0) return

    const image = imgRef.current
    const canvas = document.createElement("canvas")
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = Math.floor(completedCrop.width * scaleX)
    canvas.height = Math.floor(completedCrop.height * scaleY)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )

    setSaving(true)
    try {
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(
          async (blob) => {
            if (!blob) { reject(new Error("Canvas produced no blob")); return }
            const cleanFilename = filename.split("/").pop() || filename
            const ext = cleanFilename.split(".").pop() || "jpg"
            const baseName = cleanFilename.replace(/\.[^.]+$/, "")
            const cropFilename = `${baseName}-crop.${ext}`
            try {
              await onConfirm(blob, cropFilename)
              resolve()
            } catch (e) {
              reject(e)
            }
          },
          "image/jpeg",
          0.92
        )
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    // key={imageUrl} forces a full remount (resetting all state) when a different image is opened
    <Dialog key={imageUrl} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:dy-max-w-2xl dy-max-h-[90vh] dy-flex dy-flex-col dy-gap-0 dy-p-0 dy-overflow-hidden">
        <DialogHeader className="dy-px-6 dy-pt-5 dy-pb-4 dy-border-b dy-border-border/40 dy-shrink-0">
          <DialogTitle className="dy-text-base dy-font-semibold">Crop Image</DialogTitle>
        </DialogHeader>

        {/* Aspect ratio presets */}
        <div className="dy-flex dy-items-center dy-gap-2 dy-px-6 dy-py-3 dy-border-b dy-border-border/40 dy-shrink-0">
          <span className="dy-text-xs dy-font-semibold dy-text-muted-foreground dy-uppercase dy-tracking-wider dy-mr-1">
            Ratio
          </span>
          {ASPECT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleAspectChange(preset.value)}
              className={cn(
                "dy-px-3 dy-py-1 dy-text-xs dy-font-semibold dy-rounded-md dy-border dy-transition-all",
                aspect === preset.value
                  ? "dy-bg-primary dy-text-primary-foreground dy-border-primary dy-shadow-sm"
                  : "dy-bg-transparent dy-text-muted-foreground dy-border-border/50 hover:dy-bg-muted hover:dy-text-foreground"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Crop area */}
        <div className="dy-flex-1 dy-overflow-auto dy-flex dy-items-center dy-justify-center dy-bg-muted/30 dy-p-4 dy-min-h-0">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            minWidth={10}
            minHeight={10}
            className="dy-max-w-full dy-max-h-full"
          >
            <img
              ref={imgRef}
              src={imageUrl}
              onLoad={onImageLoad}
              crossOrigin="anonymous"
              alt="Crop preview"
              style={{ maxHeight: "50vh", maxWidth: "100%", display: "block" }}
            />
          </ReactCrop>
        </div>

        <DialogFooter className="dy-px-6 dy-py-4 dy-border-t dy-border-border/40 dy-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !completedCrop || completedCrop.width === 0}
          >
            {saving ? (
              <>
                <Loader2 className="dy-h-4 dy-w-4 dy-mr-2 dy-animate-spin" />
                Uploading crop…
              </>
            ) : (
              "Apply Crop"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
