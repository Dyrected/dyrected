import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import {
  Upload,
  Search,
  FileIcon,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Copy,
  Info
} from "lucide-react"
import { useDropzone } from "react-dropzone"
import { Progress } from "../../components/ui/progress"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet"
import { Separator } from "../../components/ui/separator"
// import { FocalPointPicker } from "../../components/media/focal-point-picker"
import { Blurhash } from "react-blurhash"

export function MediaPage({ collectionSlug, schema }: { collectionSlug?: string, schema?: any }) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [isUploadOpen, setIsUploadOpen] = React.useState(false)
  const [selectedItem, setSelectedItem] = React.useState<any>(null)

  const { data: mediaResponse, isLoading } = useQuery({
    queryKey: ["media", collectionSlug, search],
    queryFn: () => client!.listMedia({ where: search ? { filename: { contains: search } } : undefined }, collectionSlug).then(r => r.docs),
    enabled: !!client,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client!.deleteMedia(id, collectionSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] })
      toast.success("Asset deleted successfully")
    },
    onError: (error: any) => {
      toast.error("Failed to delete asset", {
        description: error.message
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: (args: { id: string, data: any }) => client!.update(collectionSlug || "media", args.id, args.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["media"] })
      setSelectedItem(data)
      toast.success("Asset details updated")
    },
    onError: (error: any) => {
      toast.error("Failed to update asset", {
        description: error.message
      })
    }
  })

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setIsUploadOpen(true)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // Only trigger on drop, not on background click
  })

  return (
    <div {...getRootProps()} className="dy-min-h-full dy-space-y-8 dy-animate-in dy-relative">
      <input {...getInputProps()} />

      {isDragActive && (
        <div className="dy-absolute dy-inset-0 dy-z-50 dy-bg-primary/10 dy-backdrop-blur-[2px] dy-border-4 dy-border-dashed dy-border-primary dy-rounded-2xl dy-flex dy-items-center dy-justify-center dy-pointer-events-none">
          <div className="dy-bg-white dy-p-8 dy-rounded-2xl dy-shadow-2xl dy-flex dy-flex-col dy-items-center dy-gap-4">
            <div className="dy-h-16 dy-w-16 dy-rounded-full dy-bg-primary/10 dy-flex dy-items-center dy-justify-center">
              <Upload className="dy-h-8 dy-w-8 dy-text-primary dy-animate-bounce" />
            </div>
            <p className="dy-text-xl dy-font-bold">Drop to upload assets</p>
          </div>
        </div>
      )}
      <div className="dy-flex dy-items-end dy-justify-between dy-border-b dy-border-border/50 dy-pb-6">
        <div>
          <div className="dy-flex dy-items-center dy-gap-2 dy-mb-1">
            <ImageIcon className="dy-h-5 dy-w-5 dy-text-primary" />
            <h1 className="dy-text-3xl dy-font-bold dy-tracking-tight dy-text-foreground">
              {schema?.labels?.plural ?? schema?.label ?? "Media Library"}
            </h1>
          </div>
          <p className="dy-text-sm dy-text-muted-foreground">
            Manage your images, documents, and other assets for this site.
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="dy-h-10 dy-px-4 dy-rounded-lg dy-bg-primary hover:dy-bg-primary/90 dy-shadow-md dy-transition-all active:dy-scale-95">
              <Upload className="dy-mr-2 dy-h-4 dy-w-4" />
              Upload Assets
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:dy-max-w-[600px] dy-rounded-2xl dy-overflow-hidden dy-border-none dy-shadow-2xl">
            <DialogHeader className="dy-pb-4 dy-border-b dy-border-border/40">
              <DialogTitle className="dy-text-xl dy-font-bold">Upload Media Assets</DialogTitle>
            </DialogHeader>
            <FileUploader
              collectionSlug={collectionSlug}
              onComplete={() => {
                setIsUploadOpen(false)
                queryClient.invalidateQueries({ queryKey: ["media", collectionSlug] })
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="dy-flex dy-items-center dy-gap-4">
        <div className="dy-relative dy-flex-1 dy-max-w-sm">
          <Search className="dy-absolute dy-left-3 dy-top-1/2 dy--translate-y-1/2 dy-h-4 dy-w-4 dy-text-muted-foreground/60" />
          <Input
            placeholder="Search assets by filename..."
            className="dy-pl-10 dy-h-11 dy-bg-white dy-border-border/60 dy-rounded-xl dy-shadow-sm focus-visible:dy-ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="dy-h-[calc(100vh-320px)] dy-pr-4">
        {isLoading ? (
          <div className="dy-flex dy-h-60 dy-items-center dy-justify-center">
            <div className="dy-animate-spin dy-rounded-full dy-border-4 dy-border-primary/20 dy-border-t-primary dy-h-10 dy-w-10"></div>
          </div>
        ) : mediaResponse?.length === 0 ? (
          <div className="dy-flex dy-h-80 dy-flex-col dy-items-center dy-justify-center dy-rounded-2xl dy-border-2 dy-border-dashed dy-border-border/60 dy-bg-muted/5 dy-text-center dy-animate-in">
            <div className="dy-h-16 dy-w-16 dy-rounded-2xl dy-bg-muted/40 dy-flex dy-items-center dy-justify-center dy-mb-4">
              <FileIcon className="dy-h-8 dy-w-8 dy-text-muted-foreground/50" />
            </div>
            <h3 className="dy-text-lg dy-font-bold dy-text-foreground">No assets found</h3>
            <p className="dy-text-sm dy-text-muted-foreground dy-max-w-xs dy-mx-auto">
              Your media library is empty. Upload some files to start building your content.
            </p>
          </div>
        ) : (
          <div className="dy-grid dy-grid-cols-2 md:dy-grid-cols-3 lg:dy-grid-cols-4 xl:dy-grid-cols-5 2xl:dy-grid-cols-6 dy-gap-6 dy-pb-8">
            {mediaResponse?.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                baseUrl={client!.getBaseUrl()}
                onDelete={() => deleteMutation.mutate(item.id)}
                onClick={() => setSelectedItem(item)}
                isSelected={selectedItem?.id === item.id}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <MediaSidebar
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        baseUrl={client!.getBaseUrl()}
        onUpdate={(data) => updateMutation.mutate({ id: selectedItem.id, data })}
      />
    </div>
  )
}

function MediaCard({ item, baseUrl, onDelete, onClick, isSelected }: {
  item: any,
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
        "dy-overflow-hidden dy-group dy-relative dy-border-border/40 dy-bg-white dy-shadow-sm hover:dy-shadow-xl dy-transition-all dy-duration-300 dy-rounded-xl dy-cursor-pointer",
        isSelected && "dy-ring-2 dy-ring-primary dy-ring-offset-2 dy-shadow-lg dy-scale-[0.98]"
      )}
      onClick={onClick}
    >
      <CardHeader className="dy-p-0 dy-border-b dy-border-border/10">
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
      <CardContent className="dy-p-3 dy-bg-white">
        <p className="dy-text-[11px] dy-font-bold dy-truncate dy-text-foreground/90 dy-mb-0.5" title={item.filename}>
          {item.filename}
        </p>
        <div className="dy-flex dy-items-center dy-justify-between">
          <p className="dy-text-[9px] dy-text-muted-foreground dy-font-bold dy-uppercase dy-tracking-wider">
            {item.mimeType?.split("/")[1] || "file"}
          </p>
          <p className="dy-text-[9px] dy-text-muted-foreground dy-font-medium">
            {((item.filesize || item.size || 0) / 1024).toFixed(1)} KB
          </p>
        </div>
      </CardContent>
      <div className="dy-absolute dy-top-2 dy-right-2 dy-flex dy-gap-2 dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-opacity">
        <Button
          size="icon"
          variant="destructive"
          className="dy-h-7 dy-w-7 dy-rounded-lg dy-shadow-lg"
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

function MediaSidebar({ item, onClose, baseUrl, onUpdate }: {
  item: any,
  onClose: () => void,
  baseUrl: string,
  onUpdate: (data: any) => void
}) {
  const [formData, setFormData] = React.useState<any>({})
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (item) {
      setFormData({
        alt: item.alt || "",
        caption: item.caption || "",
        filename: item.filename || "",
      })
    }
  }, [item])

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
    formData.caption !== (item.caption || "") ||
    formData.filename !== (item.filename || "")

  return (
    <Sheet open={!!item} onOpenChange={onClose}>
      <SheetContent className="sm:dy-max-w-md dy-p-0 dy-flex dy-flex-col dy-h-full dy-border-l dy-border-border/40 dy-bg-white dy-shadow-2xl">
        <SheetHeader className="dy-p-6 dy-border-b dy-border-border/40 dy-bg-white">
          <SheetTitle className="dy-flex dy-items-center dy-gap-2">
            <Info className="dy-h-5 dy-w-5 dy-text-primary" />
            File Details
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="dy-flex-1 dy-bg-white">
          <div className="dy-p-6 dy-space-y-8">
            <div className="dy-rounded-xl dy-overflow-hidden dy-border dy-border-border/40 dy-bg-muted/10 dy-relative dy-shadow-inner">
              <AspectRatio ratio={16 / 9}>
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
                    <img src={url} alt={item.filename} className="dy-object-contain dy-w-full dy-h-full dy-bg-checkered dy-relative dy-z-10" />
                  </>
                ) : (
                  <div className="dy-flex dy-items-center dy-justify-center dy-h-full">
                    <FileIcon className="dy-h-16 dy-w-16 dy-text-muted-foreground/30" />
                  </div>
                )}
              </AspectRatio>
            </div>

            <div className="dy-space-y-6">
              <div className="dy-space-y-4">
                <div className="dy-space-y-2">
                  <label className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground/80">Filename</label>
                  <Input
                    value={formData.filename}
                    onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
                    className="dy-h-10 dy-rounded-lg dy-bg-white dy-border-border/60 focus:dy-ring-1 focus:dy-ring-primary/20"
                  />
                </div>
                <div className="dy-space-y-2">
                  <label className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground/80">Alt Text</label>
                  <Input
                    value={formData.alt}
                    onChange={(e) => setFormData({ ...formData, alt: e.target.value })}
                    placeholder="Describe the image for accessibility..."
                    className="dy-h-10 dy-rounded-lg dy-bg-white dy-border-border/60 focus:dy-ring-1 focus:dy-ring-primary/20"
                  />
                </div>
                <div className="dy-space-y-2">
                  <label className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground/80">Caption</label>
                  <textarea
                    value={formData.caption}
                    onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                    placeholder="Add a caption..."
                    className="dy-flex dy-min-h-[80px] dy-w-full dy-rounded-lg dy-border dy-border-border/60 dy-bg-white dy-px-3 dy-py-2 dy-text-sm dy-ring-offset-background placeholder:dy-text-muted-foreground focus-visible:dy-outline-none focus-visible:dy-ring-1 focus-visible:dy-ring-primary/20 disabled:dy-cursor-not-allowed disabled:dy-opacity-50"
                  />
                </div>
              </div>

              <Separator className="dy-bg-border/40" />

              <div className="dy-grid dy-grid-cols-2 dy-gap-6">
                <DetailItem label="File ID" value={item.id} copyable />
                <DetailItem label="Size" value={`${((item.filesize || item.size || 0) / 1024).toFixed(1)} KB`} />
                <DetailItem label="Type" value={item.mimeType || "Unknown"} />
                <DetailItem label="Dimensions" value={item.width ? `${item.width}x${item.height}` : "N/A"} />
              </div>

              <DetailItem label="URL" value={url} copyable />
              <DetailItem label="Created At" value={item?.createdAt ? new Date(item?.createdAt).toLocaleString() : "N/A"} />
            </div>

            {/* {isImage && (
              <div className="dy-space-y-4">
                <Separator className="dy-bg-border/40" />
                <div className="dy-space-y-4">
                  <label className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground/80">Focal Point</label>
                  <FocalPointPicker 
                    url={url} 
                    value={item.focalPoint} 
                    onChange={(fp) => {
                      onUpdate({ focalPoint: fp })
                    }} 
                  />
                </div>
              </div>
            )} */}
          </div>
        </ScrollArea>

        <div className="dy-p-6 dy-border-t dy-border-border/40 dy-bg-muted/5 dy-space-y-3">
          {hasChanges && (
            <Button
              className="dy-w-full dy-h-12 dy-rounded-xl dy-font-bold dy-bg-primary dy-text-white dy-shadow-lg dy-shadow-primary/20 dy-animate-in dy-fade-in dy-slide-in-from-bottom-2"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
          <Button className="dy-w-full dy-h-11 dy-rounded-xl dy-font-bold dy-gap-2 dy-bg-white" variant="outline" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="dy-h-4 dy-w-4" />
              Open Original
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
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

function FileUploader({ collectionSlug, onComplete }: { collectionSlug?: string, onComplete: () => void }) {
  const { client } = useDyrected()
  const [files, setFiles] = React.useState<File[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

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
    } catch (error: any) {
      console.error("Upload failed", error)
      toast.error("Failed to upload assets", {
        description: error.message
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
                  <div className="dy-h-8 dy-w-8 dy-rounded-lg dy-bg-white dy-border dy-border-border/60 dy-flex dy-items-center dy-justify-center dy-flex-shrink-0">
                    <FileIcon className="dy-h-4 dy-w-4 dy-text-muted-foreground" />
                  </div>
                  <span className="dy-truncate dy-font-medium dy-text-foreground/80">{file.name}</span>
                </div>
                <span className="dy-text-muted-foreground dy-text-[10px] dy-font-bold dy-bg-white dy-px-2 dy-py-1 dy-rounded dy-border dy-border-border/40 dy-ml-4">
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
              className="dy-w-full dy-h-12 dy-rounded-xl dy-bg-primary hover:dy-bg-primary/90 dy-text-white dy-font-bold dy-shadow-lg dy-shadow-primary/20 dy-transition-all active:dy-scale-[0.98]"
            >
              {uploading ? (
                <span className="dy-flex dy-items-center dy-gap-2">
                  <div className="dy-h-4 dy-w-4 dy-border-2 dy-border-white/30 dy-border-t-white dy-rounded-full dy-animate-spin" />
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
