/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from "./badge"
import { Calendar } from "lucide-react"
import { getMediaUrl } from "../../lib/utils"

interface RenderCellProps {
  value: any
  field: any
  client: any
  schemas: any
}

export function RenderCell({ value, field, client, schemas }: RenderCellProps) {
  if (value === null || value === undefined) return <span className="dy-text-muted-foreground">-</span>

  // Handle Boolean
  if (field.type === "boolean" || typeof value === "boolean") {
    return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
  }

  // Handle Date
  if (field.type === "date") {
    const date = new Date(value)
    return (
      <div className="dy-flex dy-items-center dy-gap-1.5 dy-text-muted-foreground">
        <Calendar className="dy-h-3 dy-w-3" />
        <span className="dy-text-xs">{date.toLocaleDateString()}</span>
      </div>
    )
  }

  // Handle Image/Media (from upload collections)
  const relationTo = field.relationTo || field.collection
  if (field.type === "image" || (field.type === "relationship" && isUploadCollection(relationTo, schemas))) {
    const media = value
    if (!media) return <span className="dy-text-muted-foreground">-</span>

    const url = getMediaUrl(value, client?.getBaseUrl() || "")
    
    if (!url) return <span className="dy-text-muted-foreground">-</span>

    return (
      <div className="dy-h-8 dy-w-8 dy-rounded dy-overflow-hidden dy-border dy-bg-muted dy-shadow-sm">
        <img src={url} className="dy-h-full dy-w-full dy-object-cover" alt="" />
      </div>
    )
  }

  // Handle Relationship (Populated)
  if (field.type === "relationship" && typeof value === "object") {
    const relTo = field.relationTo || field.collection
    const relatedCollection = schemas?.collections?.find((c: any) => c?.slug === relTo)
    const displayField = relatedCollection?.admin?.useAsTitle || "title"
    const displayValue = value[displayField] || value.name || value.id || "Unknown"

    return (
      <div className="dy-flex dy-items-center dy-gap-2">
        <Badge variant="outline" className="dy-font-normal dy-border-primary/20 dy-bg-primary/5 dy-text-primary">
          {String(displayValue)}
        </Badge>
      </div>
    )
  }

  // Handle Array of strings or IDs
  if (Array.isArray(value)) {
    return (
      <div className="dy-flex dy-flex-wrap dy-gap-1">
        {value.slice(0, 2).map((item, i) => (
          <Badge key={i} variant="outline" className="dy-text-[10px] dy-px-1.5 dy-h-5">
            {typeof item === 'object' ? (item.title || item.name || item.id) : String(item)}
          </Badge>
        ))}
        {value.length > 2 && (
          <span className="dy-text-[10px] dy-text-muted-foreground">+{value.length - 2} more</span>
        )}
      </div>
    )
  }

  // Handle Generic Object (Summary)
  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value)
      .filter(([_, v]) => typeof v !== 'object' && v !== null && v !== undefined)
      .slice(0, 3)
    
    if (entries.length > 0) {
      return (
        <span className="dy-text-[11px] dy-text-muted-foreground dy-font-medium dy-leading-tight">
          {entries.map(([k, v]) => `${k}: ${String(v)}`).join(", ")}
          {Object.keys(value).length > 3 ? "..." : ""}
        </span>
      )
    }

    return (
      <span className="dy-text-[11px] dy-text-muted-foreground dy-font-mono dy-bg-muted/30 dy-px-1 dy-rounded">
        {JSON.stringify(value).slice(0, 30)}
        {JSON.stringify(value).length > 30 ? "..." : ""}
      </span>
    )
  }

  return <span className="dy-text-sm dy-font-medium">{typeof value === 'object' ? JSON.stringify(value).slice(0, 50) : String(value)}</span>
}

function isUploadCollection(slug: string | undefined, schemas: any) {
  if (!slug) return false
  const collection = schemas?.collections?.find((c: any) => c?.slug === slug)
  return !!collection?.upload
}
