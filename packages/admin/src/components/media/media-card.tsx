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
    <div className="group relative aspect-square rounded-2xl overflow-hidden bg-white border border-border/40 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300">
      <img 
        src={url}
        alt={item.filename}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
        <Link to={editPath}>
          <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full bg-white/90 hover:bg-white text-foreground shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
        <Button 
          size="icon" 
          variant="destructive" 
          className="h-9 w-9 rounded-full bg-destructive/90 hover:bg-destructive shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="text-[10px] text-white truncate font-medium">{item.filename}</p>
        <p className="text-[8px] text-white/60 uppercase tracking-wider mt-0.5">{item.mimeType}</p>
      </div>
    </div>
  )
}
