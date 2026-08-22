import { CardGridItem } from "./card-grid-item"
import type { SerializedAction, SerializedView } from "../types"

export interface CardsLayoutProps {
  slug: string
  schema: any
  view: SerializedView
  data: Record<string, any>[]
  isLoading?: boolean
  client: unknown
  schemas: unknown
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
}

/**
 * Visual gallery layout — media-forward cards in a responsive grid.
 */
export function CardsLayout({
  slug,
  schema,
  view,
  data,
  isLoading,
  client,
  schemas,
  actions,
  onRunAction,
}: CardsLayoutProps) {
  if (isLoading) {
    return (
      <div className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 lg:dy-grid-cols-3 xl:dy-grid-cols-4 dy-gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="dy-h-56 dy-animate-pulse dy-rounded-md dy-bg-muted" style={{ opacity: 1 - i * 0.09 }} />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <p className="dy-rounded-md dy-border dy-border-dashed dy-p-8 dy-text-center dy-text-sm dy-text-muted-foreground">
        No items to show yet.
      </p>
    )
  }

  return (
    <div
      className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 lg:dy-grid-cols-3 xl:dy-grid-cols-4 dy-gap-4"
      data-collection={slug}
    >
      {data.map((doc) => (
        <CardGridItem
          key={String(doc.id)}
          doc={doc}
          schema={schema}
          client={client}
          schemas={schemas}
          view={view}
          actions={actions}
          onRunAction={onRunAction}
        />
      ))}
    </div>
  )
}
