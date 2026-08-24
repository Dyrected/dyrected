import * as React from "react"
import { Link } from "react-router-dom"

import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card"
import { RenderCell } from "../../../../components/ui/render-cell"
import { getMediaUrl } from "../../../../lib/utils"
import { RowActionsCell } from "../row-actions-cell"
import type { SerializedAction, SerializedView } from "../types"
import { resolveDocumentTitle } from "@/lib/document-title"

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
    (field: any) => field.type === "image" || field.type === "file",
  )
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

  const source = fields ?? view.columns ?? []
  const shownColumns = source.filter((name) => {
    const field = fieldsByName.get(name)
    return field && field.type !== "image" && doc[name] !== undefined && doc[name] !== null
  })
  const rowActions = actions.filter((action) => (action.type ?? "row") === "row")
  const cover = coverField(schema)
  const docTitle = resolveDocumentTitle({
    entry: doc,
    collection: schema,
    collections: (schemas as any)?.collections,
  })

  return (
    <Card className="dy-overflow-hidden dy-border-border/30">
      <CardHeader className="dy-space-y-2 dy-p-4">
        {cover && doc[cover.name] ? (
          <MediaCover value={doc[cover.name]} client={client} />
        ) : null}
        <CardTitle className="dy-text-lg">
          <Link
            to={`/collections/${slug}/${String(doc.id)}`}
            className="hover:dy-text-primary hover:dy-underline dy-underline-offset-2"
          >
            {docTitle}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="dy-space-y-2 dy-px-4 dy-pb-4">
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
          <div className="dy-w-full dy-overflow-hidden">
            <RowActionsCell
              actions={rowActions}
              docId={String(doc.id)}
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
  const url = getMediaUrl(value, (client as any)?.getBaseUrl?.() || "")
  if (!url) return null
  return (
    <div className="dy-aspect-video dy-w-full dy-overflow-hidden dy-border-b dy-bg-muted">
      <img src={url} alt="" className="dy-h-full dy-w-full dy-object-cover" loading="lazy" />
    </div>
  )
}
