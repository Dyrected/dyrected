import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-provider"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { cn } from "../../lib/utils"
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
import { FocalPointPicker } from "../../components/media/focal-point-picker"
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
    }
  })
  
  const updateMutation = useMutation({
    mutationFn: (args: { id: string, data: any }) => client!.update(collectionSlug || "media", args.id, args.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["media"] })
      setSelectedItem(data)
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
    <div {...getRootProps()} className="min-h-full space-y-8 animate-in relative">
      <input {...getInputProps()} />
      
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-[2px] border-4 border-dashed border-primary rounded-2xl flex items-center justify-center pointer-events-none">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary animate-bounce" />
            </div>
            <p className="text-xl font-bold">Drop to upload assets</p>
          </div>
        </div>
      )}
      <div className="flex items-end justify-between border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {schema?.labels?.plural ?? schema?.label ?? "Media Library"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your images, documents, and other assets for this site.
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-95">
              <Upload className="mr-2 h-4 w-4" />
              Upload Assets
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] rounded-2xl overflow-hidden border-none shadow-2xl">
            <DialogHeader className="pb-4 border-b border-border/40">
              <DialogTitle className="text-xl font-bold">Upload Media Assets</DialogTitle>
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search assets by filename..."
            className="pl-10 h-11 bg-white border-border/60 rounded-xl shadow-sm focus-visible:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-320px)] pr-4">
        {isLoading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="animate-spin rounded-full border-4 border-primary/20 border-t-primary h-10 w-10"></div>
          </div>
        ) : mediaResponse?.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/5 text-center animate-in">
            <div className="h-16 w-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
              <FileIcon className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No assets found</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Your media library is empty. Upload some files to start building your content.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-8">
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
  const url = item.url ? (item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`) : `${baseUrl}/uploads/${item.filename}`

  return (
    <Card 
      className={cn(
        "overflow-hidden group relative border-border/40 bg-white shadow-sm hover:shadow-xl transition-all duration-300 rounded-xl cursor-pointer",
        isSelected && "ring-2 ring-primary ring-offset-2 shadow-lg scale-[0.98]"
      )}
      onClick={onClick}
    >
      <CardHeader className="p-0 border-b border-border/10">
        <AspectRatio ratio={1 / 1} className="bg-muted/30 overflow-hidden relative">
          {isImage ? (
            <>
              {item.blurhash && (
                <div className="absolute inset-0 z-0">
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
                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110 relative z-10"
                loading="lazy"
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-primary/5">
              <FileIcon className="h-10 w-10 text-primary/40" />
            </div>
          )}
        </AspectRatio>
      </CardHeader>
      <CardContent className="p-3 bg-white">
        <p className="text-[11px] font-bold truncate text-foreground/90 mb-0.5" title={item.filename}>
          {item.filename}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
            {item.mimeType?.split("/")[1] || "file"}
          </p>
          <p className="text-[9px] text-muted-foreground font-medium">
            {((item.filesize || item.size || 0) / 1024).toFixed(1)} KB
          </p>
        </div>
      </CardContent>
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          size="icon" 
          variant="destructive" 
          className="h-7 w-7 rounded-lg shadow-lg"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm("Are you sure you want to delete this file?")) {
              onDelete()
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
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
  if (!item) return null

  const isImage = item.mimeType?.startsWith("image/")
  const url = item.url ? (item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`) : `${baseUrl}/uploads/${item.filename}`

  return (
    <Sheet open={!!item} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col h-full border-l border-border/40">
        <SheetHeader className="p-6 border-b border-border/40">
          <SheetTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            File Details
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            <div className="rounded-xl overflow-hidden border border-border/40 bg-muted/20 relative">
              <AspectRatio ratio={16 / 9}>
                {isImage ? (
                  <>
                    {item.blurhash && (
                      <div className="absolute inset-0 z-0">
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
                    <img src={url} alt={item.filename} className="object-contain w-full h-full bg-checkered relative z-10" />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FileIcon className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
              </AspectRatio>
            </div>

            <div className="space-y-6">
              <DetailItem label="Filename" value={item.filename} />
              <DetailItem label="File ID" value={item.id} copyable />
              <DetailItem label="URL" value={url} copyable />
              <div className="grid grid-cols-2 gap-4">
                <DetailItem label="Size" value={`${((item.filesize || item.size || 0) / 1024).toFixed(1)} KB`} />
                <DetailItem label="Type" value={item.mimeType || "Unknown"} />
              </div>
              <DetailItem label="Created At" value={new Date(item.createdAt).toLocaleString()} />
            </div>

            {isImage && (
              <div className="space-y-4">
                <Separator className="bg-border/40" />
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Focal Point</label>
                  <FocalPointPicker 
                    url={url} 
                    value={item.focalPoint} 
                    onChange={(fp) => {
                      onUpdate({ focalPoint: fp })
                    }} 
                  />
                </div>
              </div>
            )}

            {isImage && (item.width || item.height) && (
              <div className="space-y-4">
                <Separator className="bg-border/40" />
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Width" value={`${item.width}px`} />
                  <DetailItem label="Height" value={`${item.height}px`} />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-6 border-t border-border/40 bg-muted/5">
          <Button className="w-full h-12 rounded-xl font-bold gap-2" variant="outline" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
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
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{label}</label>
      <div className="flex items-center gap-2 group">
        <p className="text-sm font-medium text-foreground truncate flex-1">{value}</p>
        {copyable && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
            onClick={() => navigator.clipboard.writeText(value)}
          >
            <Copy className="h-3.5 w-3.5" />
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
    } catch (error) {
      console.error("Upload failed", error)
      alert("Failed to upload files.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6 py-6 px-4">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragActive 
            ? "border-primary bg-primary/5 scale-[0.98]" 
            : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/5"
        }`}
      >
        <input {...getInputProps()} />
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <p className="text-xl font-bold text-foreground">Drag & drop assets</p>
        <p className="text-sm text-muted-foreground mt-1">or click to browse your files</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">{files.length} assets selected</p>
            <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={uploading} className="text-xs h-8">
              Clear All
            </Button>
          </div>
          
          <div className="max-h-[240px] overflow-auto space-y-2 pr-2 custom-scrollbar">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 border border-border/40 rounded-xl text-sm group transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3 truncate">
                  <div className="h-8 w-8 rounded-lg bg-white border border-border/60 flex items-center justify-center flex-shrink-0">
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="truncate font-medium text-foreground/80">{file.name}</span>
                </div>
                <span className="text-muted-foreground text-[10px] font-bold bg-white px-2 py-1 rounded border border-border/40 ml-4">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>

          {uploading && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Uploading...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 rounded-full" />
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border/40">
            <Button 
              onClick={handleUpload} 
              disabled={uploading || files.length === 0}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
