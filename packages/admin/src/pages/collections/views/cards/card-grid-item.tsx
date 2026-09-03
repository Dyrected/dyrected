import * as React from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card"
import { RenderCell } from "../../../../components/ui/render-cell"
import { getMediaUrl } from "../../../../lib/utils"
import { RowActionsCell } from "../row-actions-cell"
import type { SerializedAction, SerializedView } from "../types"
import { resolveDocumentTitle } from "../../../../lib/document-title"

interface CardGridItemProps {
  slug: string
  doc: Record<string, any>
  schema: any
  client: unknown
  schemas: unknown
  view: SerializedView
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
  isRunningAction?: (action: SerializedAction, ids: string[]) => boolean
  /**
   * Field names to render on the card body, in order (from the layout's
   * field preferences). Defaults to the view's configured columns.
   */
  fields?: string[]
  /** Field ids whose label should be shown alongside the value. */
  showLabels?: string[]
}

/** Finds the first image/media field usable as a cover. */
function coverField(schema: any): any | undefined {
  return (schema?.fields ?? []).find(
    (field: any) =>
      field.type === "image" ||
      field.type === "file" ||
      (field.type === "relationship" && field.relationTo === "media") ||
      field.name === "avatar" ||
      field.name === "image" ||
      field.name === "images" ||
      field.name === "gallery" ||
      field.name === "photos" ||
      field.name === "cover" ||
      field.name === "photo",
  )
}

function extractMediaUrls(value: any, client: any): string[] {
  if (!value) return []
  const getUrl = (val: any): string | null => {
    if (!val) return null
    if (typeof val === "string") {
      if (val.startsWith("http") || val.startsWith("/") || val.startsWith("data:")) return val
      return getMediaUrl(val, client?.getBaseUrl?.() || "")
    }
    if (typeof val === "object") {
      return (
        val.url ||
        val.src ||
        val.image ||
        val.photo ||
        val.asset ||
        getMediaUrl(val, client?.getBaseUrl?.() || "") ||
        null
      )
    }
    return null
  }

  if (Array.isArray(value)) {
    const urls: string[] = []
    for (const item of value) {
      if (item && typeof item === "object") {
        const u = getUrl(item.url || item.image || item.photo || item.src || item.asset || item)
        if (u) urls.push(u)
      } else if (typeof item === "string") {
        const u = getUrl(item)
        if (u) urls.push(u)
      }
    }
    return urls.filter(Boolean)
  }

  const single = getUrl(value)
  return single ? [single] : []
}

/**
 * A single card in the visual gallery layout.
 * Uses the collection's media field as the cover when available.
 */
export function CardGridItem({ slug, doc, schema, client, schemas, view, actions, onRunAction, isRunningAction, fields, showLabels }: CardGridItemProps) {
  const fieldsByName = React.useMemo(
    () => new Map<string, any>((schema?.fields ?? []).map((field: any) => [field.name, field])),
    [schema],
  )

  const cover = coverField(schema)
  const source = fields ?? view.columns ?? []
  const shownColumns = source.filter((name) => {
    const field = fieldsByName.get(name)
    return (
      field &&
      field.type !== "image" &&
      (!cover || name !== cover.name) &&
      doc[name] !== undefined &&
      doc[name] !== null
    )
  })
  const rowActions = actions.filter((action) => (action.type ?? "row") === "row")
  const docTitle = resolveDocumentTitle({
    entry: doc,
    collection: schema,
    collections: (schemas as any)?.collections,
  })

  return (
    <Card className="dy-overflow-hidden dy-border-border/30 dy-flex dy-flex-col">
      {cover && doc[cover.name] ? (
        <MediaCover value={doc[cover.name]} client={client} />
      ) : null}
      <CardHeader className="dy-space-y-1.5 dy-p-4">
        <CardTitle className="dy-text-lg">
          <Link
            to={`/collections/${slug}/${String(doc.id)}`}
            className="hover:dy-text-primary hover:dy-underline dy-underline-offset-2"
          >
            {docTitle}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="dy-space-y-3 dy-px-4 dy-pb-4 dy-pt-0 dy-flex-1 dy-flex dy-flex-col dy-justify-between">
        <div className="dy-space-y-1">
          {(shownColumns.length ? shownColumns : (view.columns ?? [])).slice(0, 4).map((fieldName, index) => {
            const field = fieldsByName.get(fieldName)
            if (!field || doc[fieldName] === undefined || doc[fieldName] === null || doc[fieldName] === docTitle) return null
            const showLabel = !!showLabels?.includes(fieldName)
            return (
              <div key={fieldName} className={index === 0 ? "dy-text-sm dy-font-medium" : "dy-text-xs"}>
                {showLabel ? (
                  <span className="dy-inline-flex dy-items-baseline dy-gap-1.5">
                    <span className="dy-text-[10px] dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground dy-shrink-0">
                      {field.label || fieldName}:
                    </span>
                    <span className={index === 0 ? "dy-text-sm dy-text-foreground" : "dy-text-xs dy-text-muted-foreground"}>
                      <RenderCell value={doc[fieldName]} field={field} client={client} schemas={schemas} />
                    </span>
                  </span>
                ) : (
                  <span className={index === 0 ? "dy-text-sm dy-text-foreground" : "dy-text-xs dy-text-muted-foreground"}>
                    <RenderCell value={doc[fieldName]} field={field} client={client} schemas={schemas} />
                  </span>
                )}
              </div>
            )
          })}
        </div>
        {rowActions.length > 0 && (
          <div className="dy-w-full dy-overflow-hidden dy-pt-2">
            <RowActionsCell
              actions={rowActions}
              docId={String(doc.id)}
              doc={doc}
              onRun={onRunAction}
              isRunning={isRunningAction}
              maxInline={2}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MediaCover({ value, client }: { value: any; client: unknown }) {
  const urls = React.useMemo(() => extractMediaUrls(value, client), [value, client])
  const [index, setIndex] = React.useState(0)

  if (urls.length === 0) return null

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIndex((prev) => (prev > 0 ? prev - 1 : urls.length - 1))
  }

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIndex((prev) => (prev < urls.length - 1 ? prev + 1 : 0))
  }

  const handleDotClick = (e: React.MouseEvent, i: number) => {
    e.preventDefault()
    e.stopPropagation()
    setIndex(i)
  }

  return (
    <div className="dy-group/media dy-relative dy-aspect-video dy-w-full dy-overflow-hidden dy-border-b dy-border-border/30 dy-bg-muted dy-select-none">
      <img
        src={urls[index]}
        alt=""
        className="dy-h-full dy-w-full dy-object-cover dy-transition-all dy-duration-300"
        loading="lazy"
      />

      {urls.length > 1 && (
        <>
          {/* Navigation overlay buttons */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous image"
            className="dy-absolute dy-left-2 dy-top-1/2 -dy-translate-y-1/2 dy-flex dy-h-7 dy-w-7 dy-items-center dy-justify-center dy-rounded-full dy-bg-black/60 dy-text-white dy-opacity-0 dy-transition-opacity hover:dy-bg-black/80 group-hover/media:dy-opacity-100"
          >
            <ChevronLeft className="dy-h-4 dy-w-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next image"
            className="dy-absolute dy-right-2 dy-top-1/2 -dy-translate-y-1/2 dy-flex dy-h-7 dy-w-7 dy-items-center dy-justify-center dy-rounded-full dy-bg-black/60 dy-text-white dy-opacity-0 dy-transition-opacity hover:dy-bg-black/80 group-hover/media:dy-opacity-100"
          >
            <ChevronRight className="dy-h-4 dy-w-4" />
          </button>

          {/* Dots and Count indicator */}
          <div className="dy-absolute dy-bottom-2 dy-left-0 dy-right-0 dy-flex dy-items-center dy-justify-center dy-gap-1.5">
            {urls.slice(0, 5).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => handleDotClick(e, i)}
                className={`dy-h-1.5 dy-rounded-full dy-transition-all ${
                  i === index
                    ? "dy-w-4 dy-bg-white"
                    : "dy-w-1.5 dy-bg-white/60 hover:dy-bg-white/90"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
            {urls.length > 5 && (
              <span className="dy-rounded dy-bg-black/60 dy-px-1.5 dy-py-0.5 dy-text-[9px] dy-font-medium dy-text-white">
                +{urls.length - 5}
              </span>
            )}
          </div>

          <span className="dy-absolute dy-top-2 dy-right-2 dy-rounded dy-bg-black/60 dy-px-1.5 dy-py-0.5 dy-text-[10px] dy-font-semibold dy-text-white">
            {index + 1}/{urls.length}
          </span>
        </>
      )}
    </div>
  )
}
