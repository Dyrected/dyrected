import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-provider"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "../ui/tabs"
import {
  Image as ImageIcon,
  Video,
  Search,
  Upload,
  Library,
  Check,
  Link as LinkIcon,
  Globe,
  Info,
  Sparkles
} from "lucide-react"
import { ScrollArea } from "../ui/scroll-area"
import { Input } from "../ui/input"
import { getMediaUrl, cn } from "../../lib/utils"

interface MediaLibraryDialogProps {
  collection: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedValues: string[]
  onSelect: (id: string) => void
  multiple?: boolean
  onConfirm?: (selectedIds: string[]) => void
}

export function MediaLibraryDialog({
  collection,
  isOpen,
  onOpenChange,
  selectedValues,
  onSelect,
  multiple,
  onConfirm
}: MediaLibraryDialogProps) {
  const { client } = useDyrected()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [externalUrl, setExternalUrl] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("library")
  const [selectedItem, setSelectedItem] = React.useState<any>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const { data: media, refetch } = useQuery({
    queryKey: [collection, searchQuery],
    queryFn: () => client!.listMedia({
      where: searchQuery ? { filename: { contains: searchQuery } } : undefined
    }).then((r: any) => r.docs),
    enabled: isOpen && !!client,
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !client) return

    setIsUploading(true)
    try {
      const result = await client.collection(collection).upload(file, {})
      await refetch()
      onSelect(result.id)
      if (!multiple) onOpenChange(false)
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleExternalUrlSubmit = async () => {
    if (!externalUrl || !client) return

    setIsUploading(true)
    try {
      let mimeType = 'application/octet-stream'
      let filename = 'External Asset'
      let idPrefix = 'ext'

      // YouTube Detection
      const ytMatch = externalUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:v\/|u\/\w\/|embed\/|watch\?v=))([^#\&\?]*)/)
      if (ytMatch && ytMatch[1]) {
        mimeType = 'video/youtube'
        filename = `YouTube: ${ytMatch[1]}`
        idPrefix = `yt_${ytMatch[1]}`
      } 
      // Vimeo Detection
      else if (externalUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/)) {
        const vimeoId = externalUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/)![1]
        mimeType = 'video/vimeo'
        filename = `Vimeo: ${vimeoId}`
        idPrefix = `vm_${vimeoId}`
      }
      // Image Detection
      else if (externalUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)(?:\?.*)?$/i)) {
        mimeType = 'image/external'
        filename = externalUrl.split('/').pop()?.split('?')[0] || 'External Image'
        idPrefix = `img_${Math.random().toString(36).substring(7)}`
      }
      // Default / Generic
      else {
        filename = externalUrl.split('/').pop()?.split('?')[0] || 'External File'
      }

      const result = await client.collection('media').create({
        filename,
        url: externalUrl,
        mimeType,
        filesize: 0,
        id: idPrefix
      })
      
      await refetch()
      onSelect(result.id)
      if (!multiple) onOpenChange(false)
      setExternalUrl("")
    } catch (error) {
      console.error("Failed to add external URL:", error)
      alert("Failed to add URL. Please make sure it is valid.")
    } finally {
      setIsUploading(false)
    }
  }

  const getPreviewUrl = (item: any) => {
    if (!item) return ""
    if (item.mimeType === 'video/youtube') {
      const match = item.url?.match(/(?:youtu\.be\/|youtube\.com\/(?:v\/|u\/\w\/|embed\/|watch\?v=))([^#\&\?]*)/)
      const videoId = match && match[1]
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    }
    if (item.mimeType === 'video/vimeo') {
      // Vimeo thumbnails are harder to get purely client side without API, 
      // but we can use a placeholder or better, try to fetch if we had a proper utility.
      // For now, let's use a generic vimeo-style placeholder or icon
      return "https://vimeo.com/assets/images/logo_vimeo_blue.png" 
    }
    if (item.mimeType === 'image/external') {
      return item.url
    }
    return getMediaUrl(item, client?.getBaseUrl() || "");
  }

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(selectedValues)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden gap-0 bg-background border-none shadow-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[650px]">
          <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-xl font-serif font-bold tracking-tight">Media Library</DialogTitle>
              {multiple && selectedValues.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20 animate-in fade-in slide-in-from-left-2">
                  <span className="text-xs font-bold text-primary">{selectedValues.length} Selected</span>
                  <Button variant="ghost" size="icon" className="h-4 w-4 text-primary hover:bg-transparent" onClick={handleConfirm}>
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="library" className="gap-2 rounded-lg px-4 font-bold text-xs uppercase tracking-wider transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Library className="h-3.5 w-3.5" /> Library
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2 rounded-lg px-4 font-bold text-xs uppercase tracking-wider transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Upload className="h-3.5 w-3.5" /> Upload
              </TabsTrigger>
              <TabsTrigger value="external" className="gap-2 rounded-lg px-4 font-bold text-xs uppercase tracking-wider transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Globe className="h-3.5 w-3.5" /> External URL
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="library" className="h-full m-0 p-0 focus-visible:ring-0">
              <div className="flex h-full">
                <div className="flex-1 flex flex-col p-6 space-y-4 border-r">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 group">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder="Search your media library..."
                        className="pl-11 h-11 rounded-xl border-muted bg-muted/10 focus:bg-background transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    {multiple && (
                      <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[10px] font-bold uppercase tracking-wider px-3 hover:bg-background rounded-md"
                          onClick={() => {
                            media?.forEach((item: any) => {
                              if (!selectedValues.includes(item.id)) onSelect(item.id)
                            })
                          }}
                        >
                          Select All
                        </Button>
                        <div className="w-px h-4 bg-border/50 mx-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[10px] font-bold uppercase tracking-wider px-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md"
                          onClick={() => {
                            selectedValues.forEach(id => onSelect(id))
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                  <ScrollArea className="flex-1 -mx-2 px-2">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 pb-4">
                      {media?.map((item: any) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (multiple) {
                              onSelect(item.id)
                              setSelectedItem(item)
                            } else {
                              if (selectedItem?.id === item.id) {
                                onSelect(item.id)
                                onOpenChange(false)
                              } else {
                                setSelectedItem(item)
                              }
                            }
                          }}
                          className={cn(
                            "relative group rounded-2xl overflow-hidden border-2 aspect-square transition-all hover:scale-[1.02] active:scale-95 shadow-sm bg-muted/5",
                            selectedItem?.id === item.id 
                              ? "border-primary ring-4 ring-primary/10 shadow-lg shadow-primary/5" 
                              : "border-border/40 hover:border-border"
                          )}
                        >
                          <img
                            src={getPreviewUrl(item)}
                            alt={item.filename}
                            className="object-cover w-full h-full"
                          />
                          {selectedValues.includes(item.id) && (
                            <div className="absolute top-2.5 right-2.5 h-7 w-7 bg-primary rounded-full flex items-center justify-center text-white shadow-xl animate-in zoom-in border-2 border-white">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                          {(item.mimeType?.startsWith('video/') || item.mimeType === 'video/youtube' || item.mimeType === 'video/vimeo') && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                              <div className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-2xl">
                                <Video className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[10px] text-white truncate font-bold uppercase tracking-wider">{item.filename}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="w-80 bg-muted/5 p-6 flex flex-col gap-6 overflow-y-auto border-l border-muted/20">
                  {selectedItem ? (
                    <>
                      <div className="space-y-5">
                        <div className="aspect-square rounded-3xl overflow-hidden border bg-background shadow-2xl group relative ring-1 ring-border/50">
                          <img
                            src={getPreviewUrl(selectedItem)}
                            className="w-full h-full object-contain p-2"
                            alt=""
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <Button variant="secondary" size="sm" className="rounded-full shadow-lg font-bold" onClick={() => window.open(getPreviewUrl(selectedItem), '_blank')}>
                              View Full
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-bold text-sm truncate leading-tight" title={selectedItem.filename}>
                            {selectedItem.filename}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/10">
                              {selectedItem.mimeType.split('/')[1] || selectedItem.mimeType}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground/60">
                              {selectedItem.filesize ? `${(selectedItem.filesize / 1024).toFixed(1)} KB` : 'External Asset'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-6 border-t border-muted/20">
                        {multiple ? (
                          <>
                            <Button
                              className="w-full h-11 rounded-xl shadow-sm font-bold tracking-tight transition-all"
                              variant={selectedValues.includes(selectedItem.id) ? "outline" : "default"}
                              onClick={() => onSelect(selectedItem.id)}
                            >
                              {selectedValues.includes(selectedItem.id) ? "Deselect Item" : "Add to Selection"}
                            </Button>
                            {selectedValues.length > 0 && (
                              <Button
                                className="w-full h-11 rounded-xl shadow-xl bg-primary hover:bg-primary/90 font-bold tracking-tight transition-all group"
                                onClick={handleConfirm}
                              >
                                <span>Confirm {selectedValues.length} {selectedValues.length === 1 ? 'Asset' : 'Assets'}</span>
                                <Sparkles className="ml-2 h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            className="w-full h-11 rounded-xl shadow-lg font-bold tracking-tight bg-primary hover:bg-primary/90 transition-all"
                            onClick={() => {
                              onSelect(selectedItem.id)
                              onOpenChange(false)
                            }}
                          >
                            Select Media
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 text-muted-foreground/30">
                      <div className="p-6 bg-muted/10 rounded-full border border-muted/20 shadow-inner">
                        <ImageIcon className="h-10 w-10" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest">No Selection</p>
                        <p className="text-[10px] font-medium max-w-[150px] leading-relaxed">Select an item from the library to view details and metadata</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="h-full m-0 p-8 focus-visible:ring-0">
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-primary/20 rounded-[2.5rem] bg-primary/5 hover:bg-primary/10 transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_100%)] opacity-[0.03]" />
                <input
                  type="file"
                  id="media-upload-dialog"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={isUploading}
                />
                <label
                  htmlFor="media-upload-dialog"
                  className="flex flex-col items-center gap-8 cursor-pointer p-12 text-center relative z-10"
                >
                  <div className="h-24 w-24 bg-background rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-all shadow-2xl shadow-primary/20 border border-primary/10">
                    <Upload className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-serif font-bold text-3xl tracking-tight">Upload new assets</p>
                    <p className="text-muted-foreground/60 font-medium">Drag and drop files here or click to browse your computer</p>
                  </div>
                  <Button variant="secondary" className="rounded-full px-8 h-12 font-bold shadow-sm pointer-events-none group-hover:bg-primary group-hover:text-white transition-all">
                    Choose Files
                  </Button>
                </label>
              </div>
            </TabsContent>

            <TabsContent value="external" className="h-full m-0 p-12 focus-visible:ring-0">
              <div className="max-w-2xl mx-auto space-y-10 pt-4">
                <div className="text-center space-y-4">
                  <div className="h-20 w-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm rotate-3 group-hover:rotate-0 transition-transform">
                    <Globe className="h-10 w-10" />
                  </div>
                  <h3 className="text-3xl font-serif font-bold tracking-tight">Add External Resource</h3>
                  <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-md mx-auto">
                    Paste a link to any image, YouTube video, Vimeo link, or file to add it to your library without uploading.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="https://example.com/image.jpg or video link..."
                        className="h-14 rounded-2xl shadow-xl border-muted bg-muted/5 pl-12 text-base font-medium focus:bg-background transition-all"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handleExternalUrlSubmit} 
                      disabled={isUploading || !externalUrl} 
                      className="h-14 rounded-2xl px-10 font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95"
                    >
                      {isUploading ? "Adding..." : "Add URL"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 bg-red-100 rounded-lg text-red-600">
                        <Video className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-red-900">Video Streaming</p>
                        <p className="text-[10px] text-red-700/70 leading-relaxed font-medium mt-0.5">Supports YouTube & Vimeo. We recommend these for the best performance and compatibility.</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 bg-blue-100 rounded-lg text-blue-600">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-900">External Assets</p>
                        <p className="text-[10px] text-blue-700/70 leading-relaxed font-medium mt-0.5">Add direct links to images or files from other CDNs. We'll automatically detect the type.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/20 border border-muted/30">
                    <div className="p-2 bg-background rounded-xl shadow-sm text-muted-foreground">
                      <Info className="h-4 w-4" />
                    </div>
                    <p className="text-[11px] text-muted-foreground/80 font-medium leading-relaxed">
                      <span className="font-bold text-foreground">Pro Tip:</span> External videos are better streamed from 
                      <span className="text-red-600 font-bold ml-1">YouTube</span> or 
                      <span className="text-blue-500 font-bold ml-1">Vimeo</span> to ensure smooth playback on all devices.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
