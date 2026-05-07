import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-provider"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
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
  Image as ImageIcon
} from "lucide-react"
import { useDropzone } from "react-dropzone"
import { Progress } from "../../components/ui/progress"

export function MediaPage() {
  const { client } = useDyrected()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [isUploadOpen, setIsUploadOpen] = React.useState(false)

  const { data: mediaResponse, isLoading } = useQuery({
    queryKey: ["media", search],
    queryFn: () => client!.listMedia({ where: search ? { filename: { contains: search } } : undefined }).then(r => r.docs),
    enabled: !!client,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client!.deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] })
    }
  })

  return (
    <div className="space-y-8 animate-in">
      <div className="flex items-end justify-between border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Media Library</h1>
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
              onComplete={() => {
                setIsUploadOpen(false)
                queryClient.invalidateQueries({ queryKey: ["media"] })
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
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function MediaCard({ item, baseUrl, onDelete }: { item: any, baseUrl: string, onDelete: () => void }) {
  const isImage = item.mimeType?.startsWith("image/")
  const url = `${baseUrl}/media/${item.filename}`

  return (
    <Card className="overflow-hidden group relative border-border/40 bg-white shadow-sm hover:shadow-xl transition-all duration-300 rounded-xl">
      <CardHeader className="p-0 border-b border-border/10">
        <AspectRatio ratio={1 / 1} className="bg-muted/30 overflow-hidden">
          {isImage ? (
            <img
              src={url}
              alt={item.filename}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
            />
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
            {(item.size / 1024).toFixed(1)} KB
          </p>
        </div>
      </CardContent>
      <div className="absolute inset-0 bg-primary/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
        <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full shadow-lg bg-white hover:bg-white/90 text-primary transition-transform duration-300 hover:scale-110" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        <Button 
          size="icon" 
          variant="destructive" 
          className="h-9 w-9 rounded-full shadow-lg transition-transform duration-300 hover:scale-110"
          onClick={(e) => {
            e.preventDefault()
            if (confirm("Are you sure you want to delete this file?")) {
              onDelete()
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}

function FileUploader({ onComplete }: { onComplete: () => void }) {
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
        await client!.uploadMedia(files[i])
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
