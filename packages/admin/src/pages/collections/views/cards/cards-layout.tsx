import * as React from "react"
import { Search } from "lucide-react"

import { Input } from "../../../../components/ui/input"
import { CardGridItem } from "./card-grid-item"
import { resolveDocumentTitle } from "@/lib/document-title"
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
 * Visual gallery layout — media-forward cards in a responsive grid, with a
 * client-side search over each card's title and visible column values.
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
  const [query, setQuery] = React.useState("")

  const visibleDocs = React.useMemo(() => {
    const docs = data ?? []
    const needle = query.trim().toLowerCase()
    if (!needle) return docs
    return docs.filter((doc) => searchableText(doc, schema, view.columns, schemas).includes(needle))
  }, [data, query, schema, view.columns, schemas])

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
    <div className="dy-space-y-4" data-collection={slug}>
      <div className="dy-relative dy-w-full sm:dy-max-w-sm">
        <Search className="dy-absolute dy-left-3 dy-top-1/2 dy--translate-y-1/2 dy-h-4 dy-w-4 dy-text-muted-foreground/60" />
        <Input
          size="sm"
          type="search"
          aria-label={`Search ${schema?.labels?.plural || schema?.labels?.singular || slug}`}
          placeholder={`Search ${schema?.labels?.plural || schema?.labels?.singular || slug}...`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="dy-pl-10"
        />
      </div>

      {visibleDocs.length ? (
        <div className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 lg:dy-grid-cols-3 xl:dy-grid-cols-4 dy-gap-4">
          {visibleDocs.map((doc) => (
            <CardGridItem
              key={String(doc.id)}
              slug={slug}
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
      ) : (
        <p className="dy-rounded-md dy-border dy-border-dashed dy-p-8 dy-text-center dy-text-sm dy-text-muted-foreground">
          No cards match “{query.trim()}”.
        </p>
      )}
    </div>
  )
}

/** Lowercase haystack a card is matched against: document title + primitive column values. */
function searchableText(
  doc: Record<string, any>,
  schema: any,
  columns: string[] | undefined,
  schemas: unknown,
): string {
  const parts = [
    resolveDocumentTitle({
      entry: doc,
      collection: schema,
      collections: (schemas as any)?.collections,
    }),
  ]
  for (const name of columns ?? []) {
    const value = doc[name]
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      parts.push(String(value))
    }
  }
  return parts.join(" ").toLowerCase()
}
