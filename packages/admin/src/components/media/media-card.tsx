import { Link } from "react-router-dom"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "../ui/button"
import { getMediaUrl } from "../../lib/utils"

interface MediaCardProps {
  item: any
  baseUrl: string
  onDelete: (id: string) => void
  editPath: string
}

export function MediaCard({ item, baseUrl, onDelete, editPath }: MediaCardProps) {
  const url = getMediaUrl(item, baseUrl)
  
  return (
    <div className="dy-group dy-relative dy-aspect-square dy-rounded-2xl dy-overflow-hidden dy-bg-white dy-border dy-border-border/40 dy-shadow-sm hover:dy-shadow-xl hover:dy-border-primary/20 dy-transition-all dy-duration-300">
      <img 
        src={url}
        alt={item.filename}
        className="dy-w-full dy-h-full dy-object-cover dy-transition-transform dy-duration-500 dy-group-hover:dy-scale-110"
      />
      <div className="dy-absolute dy-inset-0 dy-bg-black/40 dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-all dy-duration-300 dy-flex dy-items-center dy-justify-center dy-gap-3 dy-backdrop-blur-[2px]">
        <Link to={editPath}>
          <Button size="icon" variant="secondary" className="dy-h-9 dy-w-9 dy-rounded-full dy-bg-white/90 hover:dy-bg-white dy-text-foreground dy-shadow-lg dy-transform dy-translate-y-2 dy-group-hover:dy-translate-y-0 dy-transition-transform dy-duration-300">
            <Pencil className="dy-h-4 dy-w-4" />
          </Button>
        </Link>
        <Button 
          size="icon" 
          variant="destructive" 
          className="dy-h-9 dy-w-9 dy-rounded-full dy-bg-destructive/90 hover:dy-bg-destructive dy-shadow-lg dy-transform dy-translate-y-2 dy-group-hover:dy-translate-y-0 dy-transition-transform dy-duration-300 dy-delay-75"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="dy-h-4 dy-w-4" />
        </Button>
      </div>
      <div className="dy-absolute dy-bottom-0 dy-left-0 dy-right-0 dy-p-3 dy-bg-gradient-to-t dy-from-black/80 dy-via-black/40 dy-to-transparent dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-opacity dy-duration-300">
        <p className="dy-text-[10px] dy-text-white dy-truncate dy-font-medium">{item.filename}</p>
        <p className="dy-text-[8px] dy-text-white/60 dy-uppercase dy-tracking-wider dy-mt-0.5">{item.mimeType}</p>
      </div>
    </div>
  )
}
