/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from "./badge"
import { Calendar, ExternalLink, Star } from "lucide-react"
import { cn, getMediaUrl } from "../../lib/utils"
import {
  displayToneClass,
  formatDate,
  formatJson,
  formatNumber,
  formatText,
  getBooleanBadge,
  getLinkSpec,
  getOptionBadge,
  getRatingSpec,
  isCodeText,
  type BadgeSpec,
} from "../../lib/format"

interface RenderCellProps {
  value: any
  field: any
  client: any
  schemas: any
}

const PILL_BASE =
  "dy-inline-flex dy-items-center dy-rounded-full dy-border dy-px-2.5 dy-py-0.5 dy-text-xs dy-font-medium"

function TonePill({ spec }: { spec: BadgeSpec }) {
  return <span className={cn(PILL_BASE, displayToneClass(spec.tone))}>{spec.label}</span>
}

export function RenderCell({ value, field, client, schemas }: RenderCellProps) {
  if (value === null || value === undefined) return <span className="dy-text-muted-foreground">-</span>

  // Handle Boolean (with optional admin.format for custom labels/tones)
  if (field.type === "boolean" || typeof value === "boolean") {
    const badge = getBooleanBadge(value, field.admin?.format)
    if (badge) return <TonePill spec={badge} />
    return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
  }

  // Handle Select / Radio (with optional admin.format badge)
  if (field.type === "select" || field.type === "radio") {
    const badge = getOptionBadge(value, field.admin?.format, field.options)
    if (badge) return <TonePill spec={badge} />
  }

  // Handle MultiSelect (badge per selected value)
  if (field.type === "multiSelect" && Array.isArray(value) && field.admin?.format) {
    return (
      <div className="dy-flex dy-flex-wrap dy-gap-1">
        {value.slice(0, 3).map((item, i) => {
          const badge = getOptionBadge(item, field.admin?.format, field.options)
          return badge ? <TonePill key={i} spec={badge} /> : null
        })}
        {value.length > 3 && (
          <span className="dy-text-[10px] dy-text-muted-foreground">+{value.length - 3} more</span>
        )}
      </div>
    )
  }

  // Handle Number (with optional admin.format: currency, percent, rating, etc.)
  if (field.type === "number") {
    const rating = getRatingSpec(value, field.admin?.format)
    if (rating) {
      return (
        <div className="dy-flex dy-items-center dy-gap-0.5" title={`${rating.value} / ${rating.max}`}>
          {Array.from({ length: rating.max }, (_, i) => (
            <Star
              key={i}
              className={
                i < Math.round(rating.value)
                  ? "dy-h-3.5 dy-w-3.5 dy-fill-amber-400 dy-text-amber-400"
                  : "dy-h-3.5 dy-w-3.5 dy-text-muted-foreground/30"
              }
            />
          ))}
        </div>
      )
    }
    return (
      <span className="dy-text-sm dy-font-medium dy-tabular-nums">
        {formatNumber(value, field.admin?.format)}
      </span>
    )
  }

  // Handle Date / DateTime / Time (with optional admin.format)
  if (field.type === "date" || field.type === "datetime" || field.type === "time") {
    return (
      <div className="dy-flex dy-items-center dy-gap-1.5 dy-text-muted-foreground">
        <Calendar className="dy-h-3 dy-w-3" />
        <span className="dy-text-xs">{formatDate(value, field.admin?.format, field.type)}</span>
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

  // Handle JSON (with optional admin.format: summary or code)
  if (field.type === "json" && typeof value === "object") {
    return (
      <span className="dy-text-[11px] dy-text-muted-foreground dy-font-mono dy-bg-muted/30 dy-px-1.5 dy-py-0.5 dy-rounded">
        {formatJson(value, field.admin?.format)}
      </span>
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
      .filter(([, v]) => typeof v !== 'object' && v !== null && v !== undefined)
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

  // Handle Url / Email as a clickable link (with optional admin.format)
  if ((field.type === "url" || field.type === "email") && field.admin?.format) {
    const link = getLinkSpec(value, field.admin.format, field.type)
    if (link) {
      return (
        <a
          href={link.href}
          target={link.newTab ? "_blank" : undefined}
          rel={link.newTab ? "noreferrer" : undefined}
          onClick={(e) => e.stopPropagation()}
          className="dy-inline-flex dy-items-center dy-gap-1 dy-text-sm dy-font-medium dy-text-primary hover:dy-underline"
        >
          {link.label}
          {field.type === "url" && <ExternalLink className="dy-h-3 dy-w-3 dy-opacity-60" />}
        </a>
      )
    }
  }

  // Handle Text / Textarea display transforms (uppercase, code, truncate, mask, ...)
  if ((field.type === "text" || field.type === "textarea") && field.admin?.format) {
    const formatted = formatText(value, field.admin.format)
    if (isCodeText(field.admin.format)) {
      return (
        <span className="dy-text-xs dy-font-mono dy-bg-muted/50 dy-px-1.5 dy-py-0.5 dy-rounded dy-border">
          {formatted}
        </span>
      )
    }
    return (
      <span className="dy-text-sm dy-font-medium" title={String(value)}>
        {formatted}
      </span>
    )
  }

  let text = String(value)
  if (field.type === "richText") {
    text = text.replace(/<[^>]*>/g, "")
  }
  const truncated = text.slice(0, 30)
  const hasMore = text.length > 30

  return (
    <span className="dy-text-sm dy-font-medium" title={String(value)}>
      {truncated}
      {hasMore ? "..." : ""}
    </span>
  )
}

function isUploadCollection(slug: string | undefined, schemas: any) {
  if (!slug) return false
  const collection = schemas?.collections?.find((c: any) => c?.slug === slug)
  return !!collection?.upload
}
