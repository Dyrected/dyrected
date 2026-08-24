import { Skeleton } from "../../../components/ui/skeleton"
import { cn } from "../../../lib/utils"

/**
 * Content-shaped loading skeletons shared by every operational view layout.
 *
 * Each skeleton mirrors the geometry of what it stands in for, so boards,
 * tables and grids keep their structure while data is in flight instead of
 * collapsing into anonymous gray bars.
 */

/** A single text line. Vary widths so rows don't look stamped. */
export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn("dy-h-3", className)} />
}

/** Small pill row mimicking inline action buttons (View · Edit · …). */
export function SkeletonActionRow({ buttons = 3 }: { buttons?: number }) {
  return (
    <div className="dy-flex dy-items-center dy-gap-1.5">
      {Array.from({ length: buttons }, (_, i) => (
        <Skeleton key={i} className="dy-h-5 dy-rounded-sm" style={{ width: `${34 + (i % 3) * 10}px` }} />
      ))}
      <Skeleton className="dy-h-5 dy-w-5 dy-rounded-sm" />
    </div>
  )
}

/** Ghost kanban card: title, two meta lines, action row. */
export function SkeletonKanbanCard() {
  return (
    <div className="dy-space-y-2 dy-rounded-md dy-border dy-border-border/50 dy-bg-card dy-p-3 dy-shadow-sm">
      <SkeletonText className="dy-w-2/3" />
      <SkeletonText className="dy-w-1/3" />
      <div className="dy-pt-1">
        <SkeletonActionRow />
      </div>
    </div>
  )
}

/**
 * Full board skeleton. When group labels are known (schema-declared options)
 * they render as real headers so the board's shape matches what loads; pass
 * `columns` without labels for anonymous placeholder columns.
 */
export function SkeletonKanbanBoard({
  columns,
  perColumn = 3,
}: {
  columns: Array<{ label?: string; toneClass?: string }>
  perColumn?: number
}) {
  const resolved: Array<{ key: string; label?: string; toneClass?: string }> =
    columns.length > 0
      ? columns.map((column, index) => ({ key: `${column.label ?? "col"}-${index}`, ...column }))
      : Array.from({ length: 3 }, (_, index) => ({ key: `placeholder-${index}` }))

  return (
    <div className="dy-flex dy-w-full dy-gap-4 dy-overflow-x-auto dy-pb-2" aria-busy="true">
      {resolved.map((column) => (
        <div key={column.key} className="dy-flex dy-min-w-[260px] dy-max-w-md dy-flex-1 dy-flex-col dy-gap-2">
          <div className="dy-flex dy-items-center dy-gap-2 dy-px-1">
            <span className={cn("dy-h-2 dy-w-2 dy-rounded-full", column.toneClass ?? "dy-bg-muted/80")} />
            {column.label ? (
              <p className="dy-text-sm dy-font-semibold">{column.label}</p>
            ) : (
              <SkeletonText className="dy-w-20" />
            )}
            <Skeleton className="dy-h-4 dy-w-6 dy-rounded-full" />
          </div>
          <div className="dy-flex dy-min-h-24 dy-flex-col dy-gap-2 dy-rounded-md dy-border dy-border-border/60 dy-bg-muted/40 dy-p-2">
            {Array.from({ length: perColumn }, (_, i) => (
              <SkeletonKanbanCard key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Table skeleton sized by the real column count, including a checkbox gutter. */
export function SkeletonTable({ columns = 5, rows = 8 }: { columns?: number; rows?: number }) {
  return (
    <div className="dy-flex dy-w-full dy-flex-col dy-gap-2.5" aria-busy="true">
      <div className="dy-overflow-x-auto dy-rounded-2xl dy-border dy-border-border/50 dy-bg-card dy-shadow-sm">
        {/* Header */}
        <div className="dy-flex dy-gap-4 dy-border-b dy-border-border/40 dy-bg-muted/20 dy-px-4 dy-py-3">
          <Skeleton className="dy-h-3.5 dy-w-4 dy-shrink-0" />
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className="dy-h-3 dy-min-w-16" style={{ width: `${56 + ((i * 37) % 48)}px` }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="dy-flex dy-items-center dy-gap-4 dy-border-b dy-border-border/30 dy-px-4 dy-py-2.5 last:dy-border-b-0"
          >
            <Skeleton className="dy-h-4 dy-w-4 dy-shrink-0 dy-rounded-sm" />
            {Array.from({ length: columns }, (_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="dy-h-3.5"
                style={{ width: `${64 + (((rowIndex + colIndex) * 29) % 72)}px` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Gallery-card skeleton mirroring CardGridItem: cover, title, meta, actions. */
export function SkeletonCardGrid({ items = 8, withCover = true }: { items?: number; withCover?: boolean }) {
  return (
    <div
      className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 lg:dy-grid-cols-3 xl:dy-grid-cols-4 dy-gap-4"
      aria-busy="true"
    >
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="dy-overflow-hidden dy-rounded-lg dy-border dy-border-border/30">
          {withCover ? <Skeleton className="dy-aspect-video dy-w-full dy-rounded-none" /> : null}
          <div className="dy-space-y-2.5 dy-p-4">
            <SkeletonText className="dy-w-3/4" />
            <SkeletonText className="dy-w-1/2" />
            <SkeletonText className="dy-w-2/5" />
            <div className="dy-pt-1">
              <SkeletonActionRow buttons={2} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Calendar skeleton: toolbar strip plus a muted month grid. */
export function SkeletonCalendar() {
  return (
    <div className="dy-space-y-3" aria-busy="true">
      <div className="dy-flex dy-items-center dy-justify-between dy-gap-2">
        <SkeletonText className="dy-w-36" />
        <div className="dy-flex dy-items-center dy-gap-2">
          <Skeleton className="dy-h-8 dy-w-8 dy-rounded-md" />
          <Skeleton className="dy-h-8 dy-w-8 dy-rounded-md" />
          <Skeleton className="dy-h-8 dy-w-16 dy-rounded-md" />
        </div>
      </div>
      <div className="dy-overflow-hidden dy-rounded-2xl dy-border dy-border-border/50 dy-bg-card">
        <div className="dy-grid dy-grid-cols-7 dy-gap-px dy-border-b dy-border-border/40 dy-bg-muted/30 dy-py-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="dy-mx-auto dy-h-3 dy-w-10" />
          ))}
        </div>
        <div className="dy-grid dy-grid-cols-7 dy-gap-px dy-bg-muted/20">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="dy-min-h-[72px] dy-bg-card dy-p-1.5">
              <Skeleton className="dy-h-2.5 dy-w-5" />
              {i % 7 < 2 ? <Skeleton className="dy-mt-1.5 dy-h-4 dy-w-full" /> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Spreadsheet skeleton: header strip plus a bordered cell grid. */
export function SkeletonSpreadsheet({ columns = 6, rows = 12 }: { columns?: number; rows?: number }) {
  return (
    <div className="dy-overflow-hidden dy-rounded-xl dy-border dy-border-border/50 dy-bg-card dy-shadow-sm" aria-busy="true">
      <div className="dy-overflow-x-auto">
        <div className="dy-sticky dy-top-0 dy-z-10 dy-flex dy-w-max dy-min-w-full dy-border-b dy-border-border/60 dy-bg-muted/40">
          {Array.from({ length: columns }, (_, i) => (
            <div key={i} className="dy-flex dy-h-9 dy-w-[190px] dy-shrink-0 dy-items-center dy-border-e dy-border-border/30 dy-px-2.5">
              <Skeleton className="dy-h-3" style={{ width: `${52 + ((i * 31) % 60)}px` }} />
            </div>
          ))}
        </div>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="dy-flex dy-h-9 dy-w-max dy-min-w-full dy-border-b dy-border-border/30 last:dy-border-b-0"
          >
            {Array.from({ length: columns }, (_, colIndex) => (
              <div key={colIndex} className="dy-flex dy-h-9 dy-w-[190px] dy-shrink-0 dy-items-center dy-border-e dy-border-border/20 dy-px-2.5">
                <Skeleton
                  className="dy-h-3"
                  style={{ width: `${44 + (((rowIndex + colIndex) * 23) % 88)}px` }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
