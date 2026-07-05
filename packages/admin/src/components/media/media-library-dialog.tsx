import * as React from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-context"
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
import { cn, getDisplayFilename } from "../../lib/utils"
import { getMediaPreviewUrl } from "../../lib/external-media"
import { useAddMediaFromUrl } from "../../hooks/use-add-media-from-url"
import type { Media } from "@dyrected/sdk"

interface MediaLibraryDialogProps {
  collection: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedValues: (string | Media)[]
  onSelect: (id: string, item?: Media) => void
  multiple?: boolean
  onConfirm?: (selectedIds: string[], selectedItems?: Media[]) => void
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
  const schema = React.useMemo(() => schemas?.collections?.find((c: { slug: string }) => c.slug === collection), [schemas, collection])
  const collectionLabel = React.useMemo(() => schema?.labels?.plural ?? schema?.labels?.singular ?? (collection && collection !== 'media' ? (collection.charAt(0).toUpperCase() + collection.slice(1)) : "Media Library"), [schema, collection])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("library")
  const [selectedItem, setSelectedItem] = React.useState<(Media & { id?: string }) | null>(null)
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

  const observerRef = React.useRef<IntersectionObserver | null>(null)

  const sentinelRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      if (node && hasNextPage && !isFetchingNextPage) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              fetchNextPage()
            }
          },
          { rootMargin: "100px" }
        )
        observerRef.current.observe(node)
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !client) return

    setIsUploading(true)
    try {
      const result = await client.collection(collection).upload(file, {}) as Media & { id: string }
      await refetch()
      onSelect(result.id, result)
      if (!multiple) onOpenChange(false)
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const {
    url: externalUrl,
    setUrl: setExternalUrl,
    submit: handleExternalUrlSubmit,
    isSubmitting: isAddingUrl,
  } = useAddMediaFromUrl({
    collection,
    onAdded: async (result) => {
      await refetch()
      onSelect(result.id, result)
      if (!multiple) onOpenChange(false)
    },
    onError: () => alert("Failed to add URL. Please make sure it is valid."),
  })

  const getPreviewUrl = (item: { url?: string; mimeType?: string;[key: string]: unknown }) =>
    getMediaPreviewUrl(item, client?.getBaseUrl() || "")

  const getIdentifier = React.useCallback((v: unknown): string => {
    if (!v) return ""
    if (typeof v === "object" && v !== null) {
      const obj = v as Record<string, unknown>
      return String(obj.id || obj._id || obj.filename || "")
    }
    const strVal = String(v)
    if (strVal.includes("/")) {
      return strVal.split("/").pop() || strVal
    }
    return strVal
  }, [])

  const sVals = React.useMemo(() => {
    return (selectedValues || []).map(getIdentifier).filter(Boolean)
  }, [selectedValues, getIdentifier])

  const handleConfirm = () => {
    if (onConfirm) {
      const selectedItems = sVals.map(val => {
        return media?.find((m: { id?: string; filename?: string; url?: string; [key: string]: unknown }) => m.id === val || m.filename === val || m.url === val)
      }).filter(Boolean) as Media[]
      onConfirm(sVals, selectedItems)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="dy-h-[92dvh] dy-w-[calc(100vw-1rem)] dy-max-w-none dy-gap-0 dy-overflow-hidden dy-border-none dy-bg-background dy-p-0 dy-shadow-2xl sm:dy-w-[95vw] sm:dy-max-w-[900px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="dy-flex dy-h-full dy-flex-col">
          <div className="dy-flex dy-flex-col dy-gap-4 dy-border-b dy-bg-muted/20 dy-px-4 dy-py-4 sm:dy-flex-row sm:dy-items-center sm:dy-justify-between sm:dy-px-6">
            <div className="dy-flex dy-min-w-0 dy-items-center dy-gap-3 sm:dy-gap-4">
              <DialogTitle className="dy-min-w-0 dy-truncate dy-text-lg dy-font-serif dy-font-bold dy-tracking-tight sm:dy-text-xl">{collectionLabel}</DialogTitle>
              {multiple && sVals.length > 0 && (
                <div className="dy-flex dy-items-center dy-gap-2 dy-px-3 dy-py-1 dy-bg-primary/10 dy-rounded-full dy-border dy-border-primary/20 dy-animate-in dy-fade-in dy-slide-in-from-left-2">
                  <span className="dy-text-xs dy-font-bold dy-text-primary">{sVals.length} Selected</span>
                  <Button variant="ghost" size="icon" className="dy-h-4 dy-w-4 dy-text-primary hover:dy-bg-transparent" onClick={handleConfirm}>
                    <Check className="dy-h-3 dy-w-3" />
                  </Button>
                </div>
              )}
            </div>
            <TabsList className="dy-grid dy-h-auto dy-grid-cols-3 dy-bg-muted/50 dy-p-1 dy-rounded-xl sm:dy-flex">
              <TabsTrigger value="library" className="dy-gap-1.5 dy-rounded-lg dy-px-2 dy-font-bold dy-text-[10px] dy-uppercase dy-tracking-wider dy-transition-all data-[state=active]:dy-bg-background data-[state=active]:dy-shadow-sm sm:dy-gap-2 sm:dy-px-4 sm:dy-text-xs">
                <Library className="dy-h-3.5 dy-w-3.5" /> Library
              </TabsTrigger>
              <TabsTrigger value="upload" className="dy-gap-1.5 dy-rounded-lg dy-px-2 dy-font-bold dy-text-[10px] dy-uppercase dy-tracking-wider dy-transition-all data-[state=active]:dy-bg-background data-[state=active]:dy-shadow-sm sm:dy-gap-2 sm:dy-px-4 sm:dy-text-xs">
                <Upload className="dy-h-3.5 dy-w-3.5" /> Upload
              </TabsTrigger>
              <TabsTrigger value="external" className="dy-gap-1.5 dy-rounded-lg dy-px-2 dy-font-bold dy-text-[10px] dy-uppercase dy-tracking-wider dy-transition-all data-[state=active]:dy-bg-background data-[state=active]:dy-shadow-sm sm:dy-gap-2 sm:dy-px-4 sm:dy-text-xs">
                <Globe className="dy-h-3.5 dy-w-3.5" /> External
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="dy-min-h-0 dy-flex-1 dy-overflow-hidden">
            <TabsContent value="library" className="dy-h-full dy-m-0 dy-p-0 focus-visible:dy-ring-0">
              <div className="dy-flex dy-h-full dy-flex-col md:dy-flex-row">
                <div className="dy-flex dy-min-h-0 dy-flex-1 dy-flex-col dy-space-y-4 dy-border-b dy-p-4 md:dy-border-b-0 md:dy-border-r md:dy-p-6">
                  <div className="dy-flex dy-flex-col dy-gap-3 sm:dy-flex-row sm:dy-items-center sm:dy-gap-4">
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
                      <div className="dy-grid dy-grid-cols-2 dy-items-center dy-gap-1 dy-rounded-lg dy-bg-muted/30 dy-p-1 sm:dy-flex">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="dy-h-8 dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-px-3 hover:dy-bg-background dy-rounded-md"
                          onClick={() => {
                            media?.forEach((item: { id?: string; filename?: string; url?: string; [key: string]: unknown }) => {
              if (!sVals.some(v => v === item.id || v === item.filename || v === item.url)) {
                onSelect(item.id!, item as unknown as Media)
              }
            })
          }}
        >
          Select All
        </Button>
        <div className="dy-hidden dy-w-px dy-h-4 dy-bg-border/50 dy-mx-1 sm:dy-block" />
        <Button
          variant="ghost"
          size="sm"
          className="dy-h-8 dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-px-3 dy-text-destructive hover:dy-text-destructive hover:dy-bg-destructive/10 dy-rounded-md"
          onClick={() => {
            sVals.forEach(val => {
              const item = media?.find((m: { id?: string; filename?: string; url?: string; [key: string]: unknown }) => m.id === val || m.filename === val || m.url === val)
              onSelect(val, item as unknown as Media)
            })                
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                  <ScrollArea className="dy-min-h-0 dy-flex-1 dy--mx-2 dy-px-2">
                    <div className="dy-grid dy-grid-cols-2 dy-gap-3 dy-pb-4 sm:dy-grid-cols-3 md:dy-grid-cols-4 lg:dy-grid-cols-5 lg:dy-gap-4">
                      {media?.map((item: { id?: string; filename?: string; url?: string; mimeType?: string;[key: string]: unknown }) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                             if (multiple) {
                               onSelect(item.id!, item as unknown as Media)
                               setSelectedItem(item as Media & { id?: string })
                             } else {
                               if (selectedItem?.id === item.id) {
                                 onSelect(item.id!, item as unknown as Media)
                                 onOpenChange(false)
                               } else {
                                 setSelectedItem(item as Media & { id?: string })
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
                          {sVals.some(v => v === item.id || v === item.filename || v === item.url) && (
                            <div className="dy-absolute dy-top-2.5 dy-right-2.5 dy-h-7 dy-w-7 dy-bg-primary dy-rounded-full dy-flex dy-items-center dy-justify-center dy-text-white dy-shadow-xl dy-animate-in dy-zoom-in dy-border-2 dy-border-white">
                              <Check className="dy-h-4 dy-w-4" />
                            </div>
                          )}
                          {(item.mimeType?.startsWith('video/') || item.mimeType === 'video/youtube' || item.mimeType === 'video/vimeo') && (
                            <div className="dy-absolute dy-inset-0 dy-flex dy-items-center dy-justify-center dy-bg-black/20 dy-group-hover:dy-bg-black/40 dy-transition-colors">
                              <div className="dy-h-10 dy-w-10 dy-bg-background/20 dy-backdrop-blur-md dy-rounded-full dy-flex dy-items-center dy-justify-center dy-border dy-border-white/30 dy-shadow-2xl">
                                <Video className="dy-h-5 dy-w-5 dy-text-white" />
                              </div>
                            </div>
                          )}
                          <div className="dy-absolute dy-inset-x-0 dy-bottom-0 dy-p-2.5 dy-bg-gradient-to-t dy-from-black/80 dy-via-black/40 dy-to-transparent dy-opacity-100 dy-transition-opacity sm:dy-opacity-0 sm:dy-group-hover:dy-opacity-100">
                            <p className="dy-text-[10px] dy-text-white dy-truncate dy-font-bold dy-uppercase dy-tracking-wider">{getDisplayFilename(item.filename)}</p>
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

                <div className="dy-flex dy-max-h-[42dvh] dy-w-full dy-flex-col dy-gap-4 dy-overflow-y-auto dy-border-muted/20 dy-bg-muted/5 dy-p-4 md:dy-h-full md:dy-max-h-none md:dy-w-80 md:dy-gap-6 md:dy-border-l md:dy-p-6">
                  {selectedItem ? (
                    <>
                      <div className="dy-grid dy-grid-cols-[88px_minmax(0,1fr)] dy-gap-4 md:dy-block md:dy-space-y-5">
                        <div className="dy-aspect-square dy-rounded-2xl dy-overflow-hidden dy-border dy-bg-background dy-shadow-xl dy-group dy-relative dy-ring-1 dy-ring-border/50 md:dy-rounded-3xl md:dy-shadow-2xl">
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
                            {getDisplayFilename(selectedItem.filename)}
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

                      <div className="dy-space-y-3 dy-border-t dy-border-muted/20 dy-pt-4 md:dy-pt-6">
                        {multiple ? (
                          <>
                            <Button
                              className="dy-w-full dy-h-11 dy-rounded-xl dy-shadow-sm dy-font-bold dy-tracking-tight dy-transition-all"
                              variant={sVals.some(v => v === selectedItem.id || v === selectedItem.filename || v === selectedItem.url) ? "outline" : "default"}
                              onClick={() => onSelect(selectedItem.id, selectedItem)}
                            >
                              {sVals.some(v => v === selectedItem.id || v === selectedItem.filename || v === selectedItem.url) ? "Deselect Item" : "Add to Selection"}
                            </Button>
                            {sVals.length > 0 && (
                              <Button
                                className="dy-w-full dy-h-11 dy-rounded-xl dy-shadow-xl dy-bg-primary hover:dy-bg-primary/90 dy-font-bold dy-tracking-tight dy-transition-all dy-group"
                                onClick={handleConfirm}
                              >
                                <span>Confirm {sVals.length} {sVals.length === 1 ? 'Asset' : 'Assets'}</span>
                                <Sparkles className="dy-ml-2 dy-h-4 dy-w-4 dy-opacity-50 dy-group-hover:dy-opacity-100 dy-group-hover:dy-scale-110 dy-transition-all" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            className="dy-w-full dy-h-11 dy-rounded-xl dy-shadow-lg dy-font-bold dy-tracking-tight dy-bg-primary hover:dy-bg-primary/90 dy-transition-all"
                            onClick={() => {
                              onSelect(selectedItem.id, selectedItem)
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

            <TabsContent value="upload" className="dy-h-full dy-m-0 dy-p-4 focus-visible:dy-ring-0 sm:dy-p-8">
              <div className="dy-h-full dy-flex dy-flex-col dy-items-center dy-justify-center dy-border-2 dy-border-dashed dy-border-primary/20 dy-rounded-3xl dy-bg-primary/5 hover:dy-bg-primary/10 dy-transition-all dy-group dy-relative dy-overflow-hidden sm:dy-rounded-[2.5rem]">
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
                  className="dy-flex dy-flex-col dy-items-center dy-gap-5 dy-cursor-pointer dy-p-6 dy-text-center dy-relative dy-z-10 sm:dy-gap-8 sm:dy-p-12"
                >
                  <div className="dy-h-20 dy-w-20 dy-bg-background dy-rounded-full dy-flex dy-items-center dy-justify-center dy-text-primary dy-group-hover:dy-scale-110 dy-transition-all dy-shadow-2xl dy-shadow-primary/20 dy-border dy-border-primary/10 sm:dy-h-24 sm:dy-w-24">
                    <Upload className="dy-h-8 dy-w-8 sm:dy-h-10 sm:dy-w-10" />
                  </div>
                  <div className="dy-space-y-2">
                    <p className="dy-font-serif dy-font-bold dy-text-2xl dy-tracking-tight sm:dy-text-3xl">Upload new assets</p>
                    <p className="dy-text-sm dy-text-muted-foreground/60 dy-font-medium sm:dy-text-base">Tap to browse, or drag files here on desktop</p>
                  </div>
                  <Button variant="secondary" className="dy-rounded-full dy-px-8 dy-h-12 dy-font-bold dy-shadow-sm dy-pointer-events-none dy-group-hover:dy-bg-primary dy-group-hover:dy-text-white dy-transition-all">
                    Choose Files
                  </Button>
                </label>
              </div>
            </TabsContent>

            <TabsContent value="external" className="dy-h-full dy-m-0 dy-overflow-y-auto dy-p-4 focus-visible:dy-ring-0 sm:dy-p-12">
              <div className="dy-mx-auto dy-max-w-2xl dy-space-y-6 dy-pt-2 sm:dy-space-y-10 sm:dy-pt-4">
                <div className="dy-text-center dy-space-y-3 sm:dy-space-y-4">
                  <div className="dy-h-16 dy-w-16 dy-bg-primary/10 dy-text-primary dy-rounded-2xl dy-flex dy-items-center dy-justify-center dy-mx-auto dy-mb-4 dy-shadow-sm dy-rotate-3 dy-group-hover:dy-rotate-0 dy-transition-transform sm:dy-h-20 sm:dy-w-20 sm:dy-rounded-3xl sm:dy-mb-6">
                    <Globe className="dy-h-8 dy-w-8 sm:dy-h-10 sm:dy-w-10" />
                  </div>
                  <h3 className="dy-text-2xl dy-font-serif dy-font-bold dy-tracking-tight sm:dy-text-3xl">Add External Resource</h3>
                  <p className="dy-text-sm dy-text-muted-foreground/70 dy-leading-relaxed dy-max-w-md dy-mx-auto">
                    Paste a link to any image, YouTube video, Vimeo link, or file to add it to your library without uploading.
                  </p>
                </div>

                <div className="dy-space-y-5 sm:dy-space-y-6">
                  <div className="dy-flex dy-flex-col dy-gap-3 sm:dy-flex-row">
                    <div className="dy-relative dy-flex-1">
                      <LinkIcon className="dy-absolute dy-left-4 dy-top-1/2 dy--translate-y-1/2 dy-h-4 dy-w-4 dy-text-muted-foreground" />
                      <Input
                        placeholder="https://example.com/image.jpg or video link..."
                        className="dy-h-12 dy-rounded-2xl dy-shadow-xl dy-border-muted dy-bg-muted/5 dy-pl-12 dy-text-sm dy-font-medium focus:dy-bg-background dy-transition-all sm:dy-h-14 sm:dy-text-base"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleExternalUrlSubmit}
                      disabled={isAddingUrl || !externalUrl}
                      className="dy-h-12 dy-w-full dy-rounded-2xl dy-px-8 dy-font-bold dy-shadow-xl dy-shadow-primary/20 dy-bg-primary hover:dy-bg-primary/90 dy-transition-all active:dy-scale-95 sm:dy-h-14 sm:dy-w-auto sm:dy-px-10"
                    >
                      {isAddingUrl ? "Adding..." : "Add URL"}
                    </Button>
                  </div>

                  <div className="dy-grid dy-grid-cols-1 dy-gap-3 sm:dy-grid-cols-2 sm:dy-gap-4">
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
