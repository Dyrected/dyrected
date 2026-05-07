import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-provider"
import { Button } from "../../components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "../../components/ui/dialog"
import { Image as ImageIcon, X, Plus, FileIcon } from "lucide-react"
import { ScrollArea } from "../../components/ui/scroll-area"

interface MediaPickerProps {
  value?: string
  onChange: (value: string) => void
  label?: string
  variant?: "default" | "icon"
}

export function MediaPicker({ value, onChange, label, variant = "default" }: MediaPickerProps) {
  const { client } = useDyrected()
  const [isOpen, setIsOpen] = React.useState(false)

  const { data: media } = useQuery({
    queryKey: ["media"],
    queryFn: () => client!.listMedia().then(r => r.docs),
    enabled: isOpen && !!client,
  })

  const selectedMedia = media?.find(m => m.id === value)
  const previewUrl = selectedMedia?.url || (selectedMedia ? `${client?.getBaseUrl()}/media/${selectedMedia.filename}` : null)

  const isIcon = variant === "icon"

  return (
    <div className={isIcon ? "" : "space-y-2"}>
      {label && !isIcon && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
      <div className={isIcon ? "" : "flex items-center gap-4"}>
        {value && !isIcon ? (
          <div className="relative group rounded-lg overflow-hidden border bg-muted aspect-square h-24">
            {selectedMedia?.mimeType?.startsWith("image/") ? (
              <img src={previewUrl!} alt="" className="object-cover w-full h-full" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <FileIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <button
              onClick={() => onChange("")}
              className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              {isIcon ? (
                <Button variant="ghost" size="sm" className="px-2">
                  <ImageIcon className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="h-24 w-24 flex flex-col gap-2 border-dashed border-2 hover:border-primary/50"
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Select</span>
                </Button>
              )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>Select Media</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[400px] mt-4">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {media?.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChange(item.id)
                        setIsOpen(false)
                      }}
                      className={`relative group rounded-md overflow-hidden border aspect-square transition-all hover:ring-2 hover:ring-primary ${
                        value === item.id ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      {item.mimeType?.startsWith("image/") ? (
                        <img 
                          src={item.url || `${client?.getBaseUrl()}/media/${item.filename}`} 
                          alt="" 
                          className="object-cover w-full h-full" 
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-muted">
                          <FileIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
