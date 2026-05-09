import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-provider"
import { Button } from "../../components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogTrigger 
} from "../../components/ui/dialog"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "../../components/ui/tabs"
import { 
  Image as ImageIcon, 
  X, 
  Plus, 
  FileIcon, 
  Video, 
  Search, 
  Upload, 
  Library,
  Check
} from "lucide-react"
import { ScrollArea } from "../../components/ui/scroll-area"
import { Input } from "../../components/ui/input"

interface MediaPickerProps {
  value?: string | string[]
  onChange: (value: string | string[]) => void
  label?: string
  variant?: "default" | "icon"
  disabled?: boolean
  multiple?: boolean
}

export function MediaPicker({ value, onChange, label, variant = "default", disabled, multiple }: MediaPickerProps) {
  const { client } = useDyrected()
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [youtubeUrl, setYoutubeUrl] = React.useState("")
  const [unsplashQuery, setUnsplashQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("library")
  const [selectedItem, setSelectedItem] = React.useState<any>(null)

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

  const { data: media, refetch } = useQuery({
    queryKey: ["media", searchQuery],
    queryFn: () => client!.listMedia({ 
      where: searchQuery ? { filename: { contains: searchQuery } } : undefined 
    }).then(r => r.docs),
    enabled: isOpen && !!client,
  })

  const [isUploading, setIsUploading] = React.useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !client) return

    setIsUploading(true)
    try {
      const result = await client.uploadMedia(file)
      await refetch()
      toggleValue(result.id)
      setIsOpen(false)
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl || !client) return
    
    // Simple YouTube ID extraction
    const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:v\/|u\/\w\/|embed\/|watch\?v=))([^#\&\?]*)/)
    const videoId = match && match[1]
    
    if (!videoId) {
      alert("Invalid YouTube URL")
      return
    }

    setIsUploading(true)
    try {
      const result = await client.collection('media').create({
        filename: `YouTube: ${videoId}`,
        url: youtubeUrl,
        mimeType: 'video/youtube',
        filesize: 0,
        id: `yt_${videoId}`
      })
      await refetch()
      toggleValue(result.id)
      setIsOpen(false)
      setYoutubeUrl("")
    } catch (error) {
      console.error("Failed to add YouTube link:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const getPreviewUrl = (item: any) => {
    if (item.mimeType === 'video/youtube') {
      const match = item.url?.match(/(?:youtu\.be\/|youtube\.com\/(?:v\/|u\/\w\/|embed\/|watch\?v=))([^#\&\?]*)/)
      const videoId = match && match[1]
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    }
    return item.url || `${client?.getBaseUrl()}/media/${item.filename}`
  }


  const isIcon = variant === "icon"

  return (
    <div className={isIcon ? "" : "space-y-2"}>
      {label && !isIcon && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
      <div className={isIcon ? "" : "flex flex-wrap items-center gap-4"}>
        {selectedValues.length > 0 && !isIcon ? (
          <div className="flex flex-wrap gap-4">
            {selectedValues.map((val) => {
              const item = media?.find(m => m.id === val)
              if (!item) return null
              const pUrl = getPreviewUrl(item)
              return (
                <div key={val} className="relative group rounded-lg overflow-hidden border bg-muted aspect-square h-24">
                  {item.mimeType?.startsWith("image/") || item.mimeType === 'video/youtube' ? (
                    <img src={pUrl} alt="" className="object-cover w-full h-full" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  {!disabled && (
                    <button
                      onClick={() => toggleValue(val)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
            {!disabled && (multiple || selectedValues.length === 0) && (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="h-24 w-24 flex flex-col gap-2 border-dashed border-2 hover:border-primary/50"
                  >
                    <Plus className="h-6 w-6 text-muted-foreground" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Add</span>
                  </Button>
                </DialogTrigger>
                {/* ... DialogContent ... */}
              </Dialog>
            )}
          </div>
        ) : (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              {isIcon ? (
                <Button variant="ghost" size="sm" className="px-2" disabled={disabled}>
                  <ImageIcon className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="h-24 w-24 flex flex-col gap-2 border-dashed border-2 hover:border-primary/50"
                  disabled={disabled}
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Select</span>
                </Button>
              )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden gap-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[600px]">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <DialogTitle>Media Library</DialogTitle>
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="library" className="gap-2">
                      <Library className="h-4 w-4" /> Library
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="gap-2">
                      <Upload className="h-4 w-4" /> Upload
                    </TabsTrigger>
                    <TabsTrigger value="youtube" className="gap-2">
                      <Video className="h-4 w-4" /> YouTube
                    </TabsTrigger>
                    <TabsTrigger value="unsplash" className="gap-2">
                      <ImageIcon className="h-4 w-4" /> Unsplash
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="library" className="h-full m-0 p-0 focus-visible:ring-0">
                    <div className="flex h-full">
                      <div className="flex-1 flex flex-col p-6 space-y-4 border-r">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Search media..." 
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <ScrollArea className="flex-1">
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {media?.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  if (selectedItem?.id === item.id) {
                                    toggleValue(item.id)
                                    if (!multiple) setIsOpen(false)
                                  } else {
                                    setSelectedItem(item)
                                  }
                                }}
                                className={`relative group rounded-xl overflow-hidden border-2 aspect-square transition-all hover:scale-[1.02] active:scale-95 ${
                                  selectedItem?.id === item.id ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                                }`}
                              >
                                <img 
                                  src={getPreviewUrl(item)} 
                                  alt={item.filename} 
                                  className="object-cover w-full h-full" 
                                />
                                {selectedValues.includes(item.id) && (
                                  <div className="absolute top-2 right-2 h-6 w-6 bg-primary rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in">
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                )}
                                {item.mimeType === 'video/youtube' && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                    <Video className="h-8 w-8 text-white drop-shadow-lg" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="w-96 bg-white border-l p-6 flex flex-col gap-6 overflow-y-auto">
                        {selectedItem ? (
                          <>
                            <div className="space-y-4">
                              <div className="aspect-video rounded-xl overflow-hidden border bg-muted shadow-sm group relative">
                                <img 
                                  src={getPreviewUrl(selectedItem)} 
                                  className="w-full h-full object-contain" 
                                  alt="" 
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <Button variant="secondary" size="sm" onClick={() => window.open(getPreviewUrl(selectedItem), '_blank')}>
                                      View Full
                                   </Button>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-bold text-sm truncate" title={selectedItem.filename}>
                                  {selectedItem.filename}
                                </h4>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                  <span className="bg-muted px-1.5 py-0.5 rounded">{selectedItem.mimeType}</span>
                                  <span>{selectedItem.filesize ? `${(selectedItem.filesize / 1024).toFixed(1)} KB` : 'External'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                               <div className="space-y-2">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Alt Text</label>
                                  <Input 
                                    value={selectedItem.alt || ""} 
                                    placeholder="Describe this image..."
                                    className="h-8 text-xs"
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      setSelectedItem({...selectedItem, alt: newVal});
                                      client?.collection('media').update(selectedItem.id, { alt: newVal });
                                    }}
                                  />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Caption</label>
                                  <Input 
                                    value={selectedItem.caption || ""} 
                                    placeholder="Add a caption..."
                                    className="h-8 text-xs"
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      setSelectedItem({...selectedItem, caption: newVal});
                                      client?.collection('media').update(selectedItem.id, { caption: newVal });
                                    }}
                                  />
                               </div>
                            </div>

                            <div className="space-y-2">
                              <Button 
                                className="w-full" 
                                onClick={() => {
                                  toggleValue(selectedItem.id)
                                  if (!multiple) setIsOpen(false)
                                }}
                              >
                                {selectedValues.includes(selectedItem.id) ? "Deselect Media" : "Select Media"}
                              </Button>
                              <Button 
                                variant="outline" 
                                className="w-full text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this media?")) {
                                    client?.deleteMedia(selectedItem.id).then(() => {
                                      refetch()
                                      setSelectedItem(null)
                                    })
                                  }
                                }}
                              >
                                Delete Forever
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
                            <ImageIcon className="h-8 w-8 opacity-20" />
                            <p className="text-xs">Select an item to view details</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="upload" className="h-full m-0 flex items-center justify-center p-6 focus-visible:ring-0">
                    <div className="max-w-md w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 text-center hover:bg-muted/50 transition-colors">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold">Drop files here</h3>
                        <p className="text-sm text-muted-foreground">Support for images up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        id="media-upload-full"
                        className="hidden"
                        onChange={handleUpload}
                        accept="image/*"
                        disabled={isUploading}
                      />
                      <Button
                        variant="default"
                        disabled={isUploading}
                        onClick={() => document.getElementById("media-upload-full")?.click()}
                      >
                        {isUploading ? "Uploading..." : "Browse Files"}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="youtube" className="h-full m-0 p-6 focus-visible:ring-0">
                    <div className="max-w-md mx-auto space-y-6 pt-12">
                      <div className="space-y-2 text-center">
                        <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                          <Video className="h-6 w-6 text-red-500" />
                        </div>
                        <h3 className="font-semibold text-lg">Add YouTube Video</h3>
                        <p className="text-sm text-muted-foreground">Enter a video URL to embed it in your content.</p>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="https://www.youtube.com/watch?v=..." 
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                        />
                        <Button onClick={handleYoutubeSubmit} disabled={isUploading || !youtubeUrl}>
                          Add
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="unsplash" className="h-full m-0 p-6 focus-visible:ring-0">
                    <div className="space-y-4 h-full flex flex-col items-center justify-center text-center">
                      <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold">Unsplash Integration</h3>
                        <p className="text-sm text-muted-foreground">Search and use millions of high-quality images.</p>
                      </div>
                      <div className="max-w-sm w-full space-y-2">
                        <Input 
                          placeholder="Search Unsplash (e.g. nature, tech)..." 
                          value={unsplashQuery}
                          onChange={(e) => setUnsplashQuery(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground italic">Integration coming soon: Please provide an API key to enable.</p>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
