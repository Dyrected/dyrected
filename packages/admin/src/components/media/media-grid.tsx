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
      <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed border-border/60 rounded-3xl bg-muted/5">
        <p className="text-sm text-muted-foreground font-medium">No media assets found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
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
