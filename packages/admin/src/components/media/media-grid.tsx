import { MediaCard } from "./media-card"

interface MediaGridProps {
  items: any[]
  baseUrl: string
  onDelete: (id: string) => void
  slug: string
}

export function MediaGrid({ items, baseUrl, onDelete, slug }: MediaGridProps) {
  if (!items || items.length === 0) {
    return (
      <div className="dy-flex dy-flex-col dy-items-center dy-justify-center dy-h-[300px] dy-border-2 dy-border-dashed dy-border-border/60 dy-rounded-3xl dy-bg-muted/5">
        <p className="dy-text-sm dy-text-muted-foreground dy-font-medium">No media assets found</p>
      </div>
    )
  }

  return (
    <div className="dy-grid dy-grid-cols-2 sm:dy-grid-cols-3 md:dy-grid-cols-4 lg:dy-grid-cols-6 dy-gap-6">
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          baseUrl={baseUrl}
          onDelete={onDelete}
          editPath={`/collections/${slug}/edit/${item.id}`}
        />
      ))}
    </div>
  )
}
