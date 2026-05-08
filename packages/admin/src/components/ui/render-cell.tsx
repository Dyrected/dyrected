import { Badge } from "./badge"
import { Calendar } from "lucide-react"

interface RenderCellProps {
  value: any
  field: any
  client: any
  schemas: any
}

export function RenderCell({ value, field, client, schemas }: RenderCellProps) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>

  // Handle Boolean
  if (field.type === "boolean" || typeof value === "boolean") {
    return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
  }

  // Handle Date
  if (field.type === "date") {
    const date = new Date(value)
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span className="text-xs">{date.toLocaleDateString()}</span>
      </div>
    )
  }

  // Handle Image/Media (from upload collections)
  const relationTo = field.relationTo || field.collection
  if (field.type === "image" || (field.type === "relationship" && isUploadCollection(relationTo, schemas))) {
    const media = value
    const url = typeof media === 'string' 
      ? `${client?.getBaseUrl()}/media/${media}` // Legacy support for raw strings
      : media?.url || `${client?.getBaseUrl()}/media/${media?.filename}`
    
    if (!url) return <span className="text-muted-foreground">-</span>

    return (
      <div className="h-8 w-8 rounded overflow-hidden border bg-muted shadow-sm">
        <img src={url} className="h-full w-full object-cover" alt="" />
      </div>
    )
  }

  // Handle Relationship (Populated)
  if (field.type === "relationship" && typeof value === "object") {
    const relTo = field.relationTo || field.collection
    const relatedCollection = schemas?.collections.find((c: any) => c.slug === relTo)
    const displayField = relatedCollection?.admin?.useAsTitle || "title"
    const displayValue = value[displayField] || value.name || value.id || "Unknown"

    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-normal border-primary/20 bg-primary/5 text-primary">
          {String(displayValue)}
        </Badge>
      </div>
    )
  }

  // Handle Array of strings or IDs
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.slice(0, 2).map((item, i) => (
          <Badge key={i} variant="outline" className="text-[10px] px-1.5 h-5">
            {typeof item === 'object' ? (item.title || item.name || item.id) : String(item)}
          </Badge>
        ))}
        {value.length > 2 && (
          <span className="text-[10px] text-muted-foreground">+{value.length - 2} more</span>
        )}
      </div>
    )
  }

  return <span className="text-sm">{String(value)}</span>
}

function isUploadCollection(slug: string | undefined, schemas: any) {
  if (!slug) return false
  const collection = schemas?.collections.find((c: any) => c.slug === slug)
  return !!collection?.upload
}
