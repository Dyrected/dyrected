import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-provider"
import { Button } from "../../ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger
} from "../../ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "../../ui/tabs"
import {
  Image as ImageIcon,
  X,
  Video,
  Search,
  Upload,
  Library,
  Check
} from "lucide-react"
import { ScrollArea } from "../../ui/scroll-area"
import { Input } from "../../ui/input"
import { getMediaUrl } from "../../../lib/utils"

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
  const [searchQuery, setSearchQuery] = React.useState("")
  const [youtubeUrl, setYoutubeUrl] = React.useState("")
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
    queryKey: [collection, searchQuery],
    queryFn: () => client!.listMedia({
      where: searchQuery ? { filename: { contains: searchQuery } } : undefined
    }).then((r: any) => r.docs),
    enabled: isOpen && !!client,
  })

  const [isUploading, setIsUploading] = React.useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !client) return

    setIsUploading(true)
    try {
      const result = await client.collection(collection).upload(file, {})
      await refetch()
      toggleValue(result.id)
      if (!multiple) setIsOpen(false)
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl || !client) return

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
      if (!multiple) setIsOpen(false)
      setYoutubeUrl("")
    } catch (error) {
      console.error("Failed to add YouTube link:", error)
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

    return getMediaUrl(item, client?.getBaseUrl() || "");
  }

  const isIcon = variant === "icon"
  const getDisplayString = (val: any): string => {
    if (!val) return ""
    if (Array.isArray(val)) return val.map(v => getDisplayString(v)).join(", ")
    if (typeof val === 'object') return val.filename || val.id || val.slug || "Object"
    return String(val)
  }
  const displayValue = getDisplayString(value)

  const renderDialogContent = () => (
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
                    {media?.map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (selectedItem?.id === item.id) {
                            toggleValue(item.id)
                            if (!multiple) setIsOpen(false)
                          } else {
                            setSelectedItem(item)
                          }
                        }}
                        className={`relative group rounded-xl overflow-hidden border-2 aspect-square transition-all hover:scale-[1.02] active:scale-95 ${selectedItem?.id === item.id ? "border-primary ring-2 ring-primary/20" : "border-transparent"
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
                      <Button
                        className="w-full"
                        onClick={() => {
                          toggleValue(selectedItem.id)
                          if (!multiple) setIsOpen(false)
                        }}
                      >
                        {selectedValues.includes(selectedItem.id) ? "Deselect" : "Select Media"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 text-muted-foreground">
                    <div className="p-4 bg-muted/50 rounded-full">
                      <ImageIcon className="h-10 w-10 opacity-20" />
                    </div>
                    <p className="text-sm">Select an item to view details</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="h-full m-0 p-6 focus-visible:ring-0">
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
              <input
                type="file"
                id="media-upload"
                className="hidden"
                onChange={handleUpload}
                disabled={isUploading}
              />
              <label
                htmlFor="media-upload"
                className="flex flex-col items-center gap-4 cursor-pointer p-12 text-center"
              >
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Upload className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-bold text-lg">Click to upload</p>
                  <p className="text-sm text-muted-foreground">Drag and drop files here too</p>
                </div>
              </label>
            </div>
          </TabsContent>

          <TabsContent value="youtube" className="h-full m-0 p-12 focus-visible:ring-0">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Add YouTube Video</h3>
                <p className="text-sm text-muted-foreground">Enter a YouTube URL to embed it in your content</p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
                <Button onClick={handleYoutubeSubmit} disabled={isUploading}>
                  Add
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </DialogContent>
  )

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
              className="pr-24 bg-muted/30 border-dashed focus-visible:ring-offset-0 focus-visible:ring-1"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 pr-1">
              {value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    onChange(multiple ? [] : "");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs font-medium px-2.5"
                    disabled={disabled}
                  >
                    {value ? "Change" : "Select"}
                  </Button>
                </DialogTrigger>
                {renderDialogContent()}
              </Dialog>
            </div>
          </div>
        )}

        {isIcon && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2" disabled={disabled}>
                <ImageIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            {renderDialogContent()}
          </Dialog>
        )}
      </div>

      {!isIcon && selectedValues.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
          {selectedValues.map((val) => {
            const item = media?.find((m: any) => m.id === val)
            if (!item) return null
            return (
              <div
                key={val}
                className="relative aspect-square group rounded-xl overflow-hidden border-2 border-border/50 hover:border-primary/50 transition-all bg-muted/20"
              >
                <img
                  src={getPreviewUrl(item)}
                  alt=""
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => toggleValue(val)}
                    className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
