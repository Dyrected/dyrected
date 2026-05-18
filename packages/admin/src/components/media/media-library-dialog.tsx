import * as React from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
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
  const { client, schemas } = useDyrected()
  const schema = React.useMemo(() => schemas?.collections?.find((c: any) => c.slug === collection), [schemas, collection])
  const collectionLabel = React.useMemo(() => schema?.labels?.plural ?? schema?.label ?? (collection && collection !== 'media' ? (collection.charAt(0).toUpperCase() + collection.slice(1)) : "Media Library"), [schema, collection])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [externalUrl, setExternalUrl] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("library")
  const [selectedItem, setSelectedItem] = React.useState<any>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const {
    data,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: [collection, searchQuery],
    queryFn: ({ pageParam = 1 }) => client!.listMedia({
      where: searchQuery ? { filename: { contains: searchQuery } } : undefined,
      limit: 12,
      page: pageParam
    }, collection),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.page + 1 : undefined
    },
    enabled: isOpen && !!client,
  })

  const media = React.useMemo(() => {
    return data?.pages.flatMap((page) => page.docs) || []
  }, [data])

  const sentinelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: "100px" }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

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

      const result = await client.collection(collection).create({
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
      <DialogContent className="sm:dy-max-w-[900px] dy-p-0 dy-overflow-hidden dy-gap-0 dy-bg-background dy-border-none dy-shadow-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="dy-flex dy-flex-col dy-h-[650px]">
          <div className="dy-px-6 dy-py-4 dy-border-b dy-flex dy-items-center dy-justify-between dy-bg-muted/20">
            <div className="dy-flex dy-items-center dy-gap-4">
              <DialogTitle className="dy-text-xl dy-font-serif dy-font-bold dy-tracking-tight">{collectionLabel}</DialogTitle>
              {multiple && selectedValues.length > 0 && (
                <div className="dy-flex dy-items-center dy-gap-2 dy-px-3 dy-py-1 dy-bg-primary/10 dy-rounded-full dy-border dy-border-primary/20 dy-animate-in dy-fade-in dy-slide-in-from-left-2">
                  <span className="dy-text-xs dy-font-bold dy-text-primary">{selectedValues.length} Selected</span>
                  <Button variant="ghost" size="icon" className="dy-h-4 dy-w-4 dy-text-primary hover:dy-bg-transparent" onClick={handleConfirm}>
                    <Check className="dy-h-3 dy-w-3" />
                  </Button>
                </div>
              )}
            </div>
            <TabsList className="dy-bg-muted/50 dy-p-1 dy-rounded-xl">
              <TabsTrigger value="library" className="dy-gap-2 dy-rounded-lg dy-px-4 dy-font-bold dy-text-xs dy-uppercase dy-tracking-wider dy-transition-all data-[state=active]:dy-bg-background data-[state=active]:dy-shadow-sm">
                <Library className="dy-h-3.5 dy-w-3.5" /> Library
              </TabsTrigger>
              <TabsTrigger value="upload" className="dy-gap-2 dy-rounded-lg dy-px-4 dy-font-bold dy-text-xs dy-uppercase dy-tracking-wider dy-transition-all data-[state=active]:dy-bg-background data-[state=active]:dy-shadow-sm">
                <Upload className="dy-h-3.5 dy-w-3.5" /> Upload
              </TabsTrigger>
              <TabsTrigger value="external" className="dy-gap-2 dy-rounded-lg dy-px-4 dy-font-bold dy-text-xs dy-uppercase dy-tracking-wider dy-transition-all data-[state=active]:dy-bg-background data-[state=active]:dy-shadow-sm">
                <Globe className="dy-h-3.5 dy-w-3.5" /> External URL
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="dy-flex-1 dy-overflow-hidden">
            <TabsContent value="library" className="dy-h-full dy-m-0 dy-p-0 focus-visible:dy-ring-0">
              <div className="dy-flex dy-h-full">
                <div className="dy-flex-1 dy-flex dy-flex-col dy-p-6 dy-space-y-4 dy-border-r">
                  <div className="dy-flex dy-items-center dy-gap-4">
                    <div className="dy-relative dy-flex-1 dy-group">
                      <Search className="dy-absolute dy-left-3.5 dy-top-1/2 dy--translate-y-1/2 dy-h-4 dy-w-4 dy-text-muted-foreground dy-group-focus-within:dy-text-primary dy-transition-colors" />
                      <Input
                        placeholder="Search your media library..."
                        className="dy-pl-11 dy-h-11 dy-rounded-xl dy-border-muted dy-bg-muted/10 focus:dy-bg-background dy-transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    {multiple && (
                      <div className="dy-flex dy-items-center dy-gap-1 dy-bg-muted/30 dy-p-1 dy-rounded-lg">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="dy-h-8 dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-px-3 hover:dy-bg-background dy-rounded-md"
                          onClick={() => {
                            media?.forEach((item: any) => {
                              if (!selectedValues.includes(item.id)) onSelect(item.id)
                            })
                          }}
                        >
                          Select All
                        </Button>
                        <div className="dy-w-px dy-h-4 dy-bg-border/50 dy-mx-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="dy-h-8 dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-px-3 dy-text-destructive hover:dy-text-destructive hover:dy-bg-destructive/10 dy-rounded-md"
                          onClick={() => {
                            selectedValues.forEach(id => onSelect(id))
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                  <ScrollArea className="dy-flex-1 dy--mx-2 dy-px-2">
                    <div className="dy-grid dy-grid-cols-3 sm:dy-grid-cols-4 md:dy-grid-cols-5 dy-gap-4 dy-pb-4">
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
                            "dy-relative dy-group dy-rounded-2xl dy-overflow-hidden dy-border-2 dy-aspect-square dy-transition-all hover:dy-scale-[1.02] active:dy-scale-95 dy-shadow-sm dy-bg-muted/5",
                            selectedItem?.id === item.id
                              ? "dy-border-primary dy-ring-4 dy-ring-primary/10 dy-shadow-lg dy-shadow-primary/5"
                              : "dy-border-border/40 hover:dy-border-border"
                          )}
                        >
                          <img
                            src={getPreviewUrl(item)}
                            alt={item.filename}
                            className="dy-object-cover dy-w-full dy-h-full"
                          />
                          {selectedValues.includes(item.id) && (
                            <div className="dy-absolute dy-top-2.5 dy-right-2.5 dy-h-7 dy-w-7 dy-bg-primary dy-rounded-full dy-flex dy-items-center dy-justify-center dy-text-white dy-shadow-xl dy-animate-in dy-zoom-in dy-border-2 dy-border-white">
                              <Check className="dy-h-4 dy-w-4" />
                            </div>
                          )}
                          {(item.mimeType?.startsWith('video/') || item.mimeType === 'video/youtube' || item.mimeType === 'video/vimeo') && (
                            <div className="dy-absolute dy-inset-0 dy-flex dy-items-center dy-justify-center dy-bg-black/20 dy-group-hover:dy-bg-black/40 dy-transition-colors">
                              <div className="dy-h-10 dy-w-10 dy-bg-white/20 dy-backdrop-blur-md dy-rounded-full dy-flex dy-items-center dy-justify-center dy-border dy-border-white/30 dy-shadow-2xl">
                                <Video className="dy-h-5 dy-w-5 dy-text-white" />
                              </div>
                            </div>
                          )}
                          <div className="dy-absolute dy-inset-x-0 dy-bottom-0 dy-p-2.5 dy-bg-gradient-to-t dy-from-black/80 dy-via-black/40 dy-to-transparent dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-opacity">
                            <p className="dy-text-[10px] dy-text-white dy-truncate dy-font-bold dy-uppercase dy-tracking-wider">{item.filename}</p>
                          </div>
                        </button>
                      ))}
                      {/* Sentinel for infinite scroll */}
                      <div ref={sentinelRef} className="dy-w-full dy-col-span-full dy-flex dy-justify-center dy-py-4">
                        {isFetchingNextPage && (
                          <div className="dy-animate-spin dy-rounded-full dy-border-2 dy-border-primary/20 dy-border-t-primary dy-h-6 dy-w-6"></div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                <div className="dy-w-80 dy-bg-muted/5 dy-p-6 dy-flex dy-flex-col dy-gap-6 dy-overflow-y-auto dy-border-l dy-border-muted/20">
                  {selectedItem ? (
                    <>
                      <div className="dy-space-y-5">
                        <div className="dy-aspect-square dy-rounded-3xl dy-overflow-hidden dy-border dy-bg-background dy-shadow-2xl dy-group dy-relative dy-ring-1 dy-ring-border/50">
                          <img
                            src={getPreviewUrl(selectedItem)}
                            className="dy-w-full dy-h-full dy-object-contain dy-p-2"
                            alt=""
                          />
                          <div className="dy-absolute dy-inset-0 dy-bg-black/40 dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-opacity dy-flex dy-items-center dy-justify-center dy-backdrop-blur-sm">
                            <Button variant="secondary" size="sm" className="dy-rounded-full dy-shadow-lg dy-font-bold" onClick={() => window.open(getPreviewUrl(selectedItem), '_blank')}>
                              View Full
                            </Button>
                          </div>
                        </div>
                        <div className="dy-space-y-2">
                          <h4 className="dy-font-bold dy-text-sm dy-truncate dy-leading-tight" title={selectedItem.filename}>
                            {selectedItem.filename}
                          </h4>
                          <div className="dy-flex dy-flex-wrap dy-items-center dy-gap-2">
                            <span className="dy-text-[9px] dy-font-black dy-uppercase dy-tracking-widest dy-bg-primary/10 dy-text-primary dy-px-2 dy-py-1 dy-rounded-md dy-border dy-border-primary/10">
                              {selectedItem.mimeType?.split('/')[1] || selectedItem.mimeType}
                            </span>
                            <span className="dy-text-[10px] dy-font-bold dy-text-muted-foreground/60">
                              {selectedItem.filesize ? `${(selectedItem.filesize / 1024).toFixed(1)} KB` : 'External Asset'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="dy-space-y-3 dy-pt-6 dy-border-t dy-border-muted/20">
                        {multiple ? (
                          <>
                            <Button
                              className="dy-w-full dy-h-11 dy-rounded-xl dy-shadow-sm dy-font-bold dy-tracking-tight dy-transition-all"
                              variant={selectedValues.includes(selectedItem.id) ? "outline" : "default"}
                              onClick={() => onSelect(selectedItem.id)}
                            >
                              {selectedValues.includes(selectedItem.id) ? "Deselect Item" : "Add to Selection"}
                            </Button>
                            {selectedValues.length > 0 && (
                              <Button
                                className="dy-w-full dy-h-11 dy-rounded-xl dy-shadow-xl dy-bg-primary hover:dy-bg-primary/90 dy-font-bold dy-tracking-tight dy-transition-all dy-group"
                                onClick={handleConfirm}
                              >
                                <span>Confirm {selectedValues.length} {selectedValues.length === 1 ? 'Asset' : 'Assets'}</span>
                                <Sparkles className="dy-ml-2 dy-h-4 dy-w-4 dy-opacity-50 dy-group-hover:dy-opacity-100 dy-group-hover:dy-scale-110 dy-transition-all" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            className="dy-w-full dy-h-11 dy-rounded-xl dy-shadow-lg dy-font-bold dy-tracking-tight dy-bg-primary hover:dy-bg-primary/90 dy-transition-all"
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
                    <div className="dy-flex-1 dy-flex dy-flex-col dy-items-center dy-justify-center dy-text-center dy-space-y-5 dy-text-muted-foreground/30">
                      <div className="dy-p-6 dy-bg-muted/10 dy-rounded-full dy-border dy-border-muted/20 dy-shadow-inner">
                        <ImageIcon className="dy-h-10 dy-w-10" />
                      </div>
                      <div className="dy-space-y-1">
                        <p className="dy-text-xs dy-font-bold dy-uppercase dy-tracking-widest">No Selection</p>
                        <p className="dy-text-[10px] dy-font-medium dy-max-w-[150px] dy-leading-relaxed">Select an item from the library to view details and metadata</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="dy-h-full dy-m-0 dy-p-8 focus-visible:dy-ring-0">
              <div className="dy-h-full dy-flex dy-flex-col dy-items-center dy-justify-center dy-border-2 dy-border-dashed dy-border-primary/20 dy-rounded-[2.5rem] dy-bg-primary/5 hover:dy-bg-primary/10 dy-transition-all dy-group dy-relative dy-overflow-hidden">
                <div className="dy-absolute dy-inset-0 dy-bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_100%)] dy-opacity-[0.03]" />
                <input
                  type="file"
                  id="media-upload-dialog"
                  className="dy-hidden"
                  onChange={handleUpload}
                  disabled={isUploading}
                />
                <label
                  htmlFor="media-upload-dialog"
                  className="dy-flex dy-flex-col dy-items-center dy-gap-8 dy-cursor-pointer dy-p-12 dy-text-center dy-relative dy-z-10"
                >
                  <div className="dy-h-24 dy-w-24 dy-bg-background dy-rounded-full dy-flex dy-items-center dy-justify-center dy-text-primary dy-group-hover:dy-scale-110 dy-transition-all dy-shadow-2xl dy-shadow-primary/20 dy-border dy-border-primary/10">
                    <Upload className="dy-h-10 dy-w-10" />
                  </div>
                  <div className="dy-space-y-2">
                    <p className="dy-font-serif dy-font-bold dy-text-3xl dy-tracking-tight">Upload new assets</p>
                    <p className="dy-text-muted-foreground/60 dy-font-medium">Drag and drop files here or click to browse your computer</p>
                  </div>
                  <Button variant="secondary" className="dy-rounded-full dy-px-8 dy-h-12 dy-font-bold dy-shadow-sm dy-pointer-events-none dy-group-hover:dy-bg-primary dy-group-hover:dy-text-white dy-transition-all">
                    Choose Files
                  </Button>
                </label>
              </div>
            </TabsContent>

            <TabsContent value="external" className="dy-h-full dy-m-0 dy-p-12 focus-visible:dy-ring-0">
              <div className="dy-max-w-2xl dy-mx-auto dy-space-y-10 dy-pt-4">
                <div className="dy-text-center dy-space-y-4">
                  <div className="dy-h-20 dy-w-20 dy-bg-primary/10 dy-text-primary dy-rounded-3xl dy-flex dy-items-center dy-justify-center dy-mx-auto dy-mb-6 dy-shadow-sm dy-rotate-3 dy-group-hover:dy-rotate-0 dy-transition-transform">
                    <Globe className="dy-h-10 dy-w-10" />
                  </div>
                  <h3 className="dy-text-3xl dy-font-serif dy-font-bold dy-tracking-tight">Add External Resource</h3>
                  <p className="dy-text-sm dy-text-muted-foreground/70 dy-leading-relaxed dy-max-w-md dy-mx-auto">
                    Paste a link to any image, YouTube video, Vimeo link, or file to add it to your library without uploading.
                  </p>
                </div>

                <div className="dy-space-y-6">
                  <div className="dy-flex dy-gap-3">
                    <div className="dy-relative dy-flex-1">
                      <LinkIcon className="dy-absolute dy-left-4 dy-top-1/2 dy--translate-y-1/2 dy-h-4 dy-w-4 dy-text-muted-foreground" />
                      <Input
                        placeholder="https://example.com/image.jpg or video link..."
                        className="dy-h-14 dy-rounded-2xl dy-shadow-xl dy-border-muted dy-bg-muted/5 dy-pl-12 dy-text-base dy-font-medium focus:dy-bg-background dy-transition-all"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleExternalUrlSubmit}
                      disabled={isUploading || !externalUrl}
                      className="dy-h-14 dy-rounded-2xl dy-px-10 dy-font-bold dy-shadow-xl dy-shadow-primary/20 dy-bg-primary hover:dy-bg-primary/90 dy-transition-all active:dy-scale-95"
                    >
                      {isUploading ? "Adding..." : "Add URL"}
                    </Button>
                  </div>

                  <div className="dy-grid dy-grid-cols-2 dy-gap-4">
                    <div className="dy-p-4 dy-rounded-2xl dy-bg-red-50/50 dy-border dy-border-red-100 dy-flex dy-items-start dy-gap-3">
                      <div className="dy-mt-0.5 dy-p-1.5 dy-bg-red-100 dy-rounded-lg dy-text-red-600">
                        <Video className="dy-h-4 dy-w-4" />
                      </div>
                      <div>
                        <p className="dy-text-xs dy-font-bold dy-text-red-900">Video Streaming</p>
                        <p className="dy-text-[10px] dy-text-red-700/70 dy-leading-relaxed dy-font-medium dy-mt-0.5">Supports YouTube & Vimeo. We recommend these for the best performance and compatibility.</p>
                      </div>
                    </div>
                    <div className="dy-p-4 dy-rounded-2xl dy-bg-blue-50/50 dy-border dy-border-blue-100 dy-flex dy-items-start dy-gap-3">
                      <div className="dy-mt-0.5 dy-p-1.5 dy-bg-blue-100 dy-rounded-lg dy-text-blue-600">
                        <ImageIcon className="dy-h-4 dy-w-4" />
                      </div>
                      <div>
                        <p className="dy-text-xs dy-font-bold dy-text-blue-900">External Assets</p>
                        <p className="dy-text-[10px] dy-text-blue-700/70 dy-leading-relaxed dy-font-medium dy-mt-0.5">Add direct links to images or files from other CDNs. We'll automatically detect the type.</p>
                      </div>
                    </div>
                  </div>

                  <div className="dy-flex dy-items-center dy-gap-3 dy-p-4 dy-rounded-2xl dy-bg-muted/20 dy-border dy-border-muted/30">
                    <div className="dy-p-2 dy-bg-background dy-rounded-xl dy-shadow-sm dy-text-muted-foreground">
                      <Info className="dy-h-4 dy-w-4" />
                    </div>
                    <p className="dy-text-[11px] dy-text-muted-foreground/80 dy-font-medium dy-leading-relaxed">
                      <span className="dy-font-bold dy-text-foreground">Pro Tip:</span> External videos are better streamed from
                      <span className="dy-text-red-600 dy-font-bold dy-ml-1">YouTube</span> or
                      <span className="dy-text-blue-500 dy-font-bold dy-ml-1">Vimeo</span> to ensure smooth playback on all devices.
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
