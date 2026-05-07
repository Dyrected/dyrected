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
  ExternalLink
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground">
            Manage your images, documents, and other assets.
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="flex gap-2">
              <Upload className="h-4 w-4" />
              Upload Files
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Upload Media</DialogTitle>
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
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
          </div>
        ) : mediaResponse?.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed text-center">
            <FileIcon className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No media found</h3>
            <p className="text-muted-foreground">Upload some files to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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
    <Card className="overflow-hidden group relative">
      <CardHeader className="p-0">
        <AspectRatio ratio={1 / 1} className="bg-muted">
          {isImage ? (
            <img
              src={url}
              alt={item.filename}
              className="object-cover w-full h-full transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <FileIcon className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </AspectRatio>
      </CardHeader>
      <CardContent className="p-2">
        <p className="text-xs font-medium truncate" title={item.filename}>
          {item.filename}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase">
          {item.mimeType?.split("/")[1] || "file"} • {(item.size / 1024).toFixed(1)} KB
        </p>
      </CardContent>
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Button size="icon" variant="secondary" className="h-8 w-8" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        <Button 
          size="icon" 
          variant="destructive" 
          className="h-8 w-8"
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
    <div className="space-y-4 py-4">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Drag & drop files here</p>
        <p className="text-sm text-muted-foreground">or click to select files</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{files.length} files selected</p>
          <div className="max-h-[200px] overflow-auto space-y-2">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-muted-foreground text-xs ml-4">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-[10px] text-right text-muted-foreground">{Math.round(progress)}%</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setFiles([])} disabled={uploading}>
              Clear
            </Button>
            <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
              {uploading ? "Uploading..." : "Start Upload"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
