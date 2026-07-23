import { Skeleton } from "../ui/skeleton"
import { cn } from "../../lib/utils"

function SkeletonCard({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("dy-rounded-2xl dy-border dy-border-border/60 dy-bg-card/70", className)}>
      {children}
    </div>
  )
}

function SkeletonLines({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn("dy-space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "dy-h-4",
            index === lines - 1 ? "dy-w-2/3" : "dy-w-full",
          )}
        />
      ))}
    </div>
  )
}

export function AdminSplashSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "dy-flex dy-h-screen dy-w-full dy-items-center dy-justify-center dy-bg-background dy-px-6",
        className,
      )}
    >
      <div className="dy-w-full dy-max-w-3xl dy-space-y-6">
        <div className="dy-space-y-3">
          <Skeleton className="dy-h-4 dy-w-28" />
          <Skeleton className="dy-h-12 dy-w-64" />
          <Skeleton className="dy-h-4 dy-w-96 max-sm:dy-w-3/4" />
        </div>
        <div className="dy-grid dy-gap-4 lg:dy-grid-cols-[280px_minmax(0,1fr)]">
          <SkeletonCard className="dy-space-y-4 dy-p-5">
            <Skeleton className="dy-h-10 dy-w-full" />
            <Skeleton className="dy-h-10 dy-w-full" />
            <Skeleton className="dy-h-10 dy-w-5/6" />
            <Skeleton className="dy-h-10 dy-w-2/3" />
          </SkeletonCard>
          <SkeletonCard className="dy-space-y-5 dy-p-6">
            <Skeleton className="dy-h-5 dy-w-40" />
            <Skeleton className="dy-h-28 dy-w-full" />
            <div className="dy-grid dy-gap-4 md:dy-grid-cols-2">
              <Skeleton className="dy-h-20 dy-w-full" />
              <Skeleton className="dy-h-20 dy-w-full" />
            </div>
            <Skeleton className="dy-h-12 dy-w-44" />
          </SkeletonCard>
        </div>
      </div>
    </div>
  )
}

export function AdminPageSkeleton({
  className,
  showSidebar = false,
}: {
  className?: string
  showSidebar?: boolean
}) {
  return (
    <div className={cn("dy-space-y-6 lg:dy-space-y-8", className)}>
      <div className="dy-flex dy-flex-col dy-gap-4 lg:dy-flex-row lg:dy-items-end lg:dy-justify-between">
        <div className="dy-space-y-3">
          <Skeleton className="dy-h-4 dy-w-28" />
          <Skeleton className="dy-h-10 dy-w-64 max-sm:dy-w-48" />
          <Skeleton className="dy-h-4 dy-w-80 max-sm:dy-w-full" />
        </div>
        <div className="dy-flex dy-gap-2">
          <Skeleton className="dy-h-9 dy-w-28" />
          <Skeleton className="dy-h-9 dy-w-36" />
        </div>
      </div>

      <div className={cn("dy-grid dy-gap-6", showSidebar && "xl:dy-grid-cols-[minmax(0,1fr)_320px]")}>
        <SkeletonCard className="dy-overflow-hidden">
          <div className="dy-flex dy-flex-wrap dy-gap-3 dy-border-b dy-border-border/60 dy-p-4">
            <Skeleton className="dy-h-9 dy-flex-1 dy-min-w-[220px]" />
            <Skeleton className="dy-h-9 dy-w-28" />
            <Skeleton className="dy-h-9 dy-w-36" />
          </div>
          <div className="dy-space-y-3 dy-p-4">
            <div className="dy-grid dy-grid-cols-[1.2fr,1fr,1fr,120px] dy-gap-3 max-lg:dy-hidden">
              <Skeleton className="dy-h-4 dy-w-full" />
              <Skeleton className="dy-h-4 dy-w-full" />
              <Skeleton className="dy-h-4 dy-w-full" />
              <Skeleton className="dy-h-4 dy-w-full" />
            </div>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="dy-grid dy-items-center dy-gap-3 dy-rounded-xl dy-border dy-border-border/50 dy-p-4 lg:dy-grid-cols-[1.2fr,1fr,1fr,120px]">
                <Skeleton className="dy-h-5 dy-w-3/4" />
                <Skeleton className="dy-h-4 dy-w-2/3" />
                <Skeleton className="dy-h-4 dy-w-1/2" />
                <Skeleton className="dy-h-8 dy-w-full" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        {showSidebar && (
          <SkeletonCard className="dy-space-y-4 dy-p-5">
            <Skeleton className="dy-h-5 dy-w-36" />
            <SkeletonLines lines={4} />
            <Skeleton className="dy-h-24 dy-w-full" />
          </SkeletonCard>
        )}
      </div>
    </div>
  )
}

export function AdminEditorSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("dy-space-y-6", className)}>
      <div className="dy-flex dy-items-center dy-gap-2 dy-border-b dy-border-border/50 dy-bg-background dy-px-3 dy-py-2">
        <Skeleton className="dy-h-9 dy-w-9 dy-rounded-lg" />
        <div className="dy-space-y-2">
          <Skeleton className="dy-h-5 dy-w-40" />
          <Skeleton className="dy-h-3 dy-w-24" />
        </div>
        <div className="dy-ml-auto dy-flex dy-gap-2">
          <Skeleton className="dy-h-9 dy-w-9 dy-rounded-lg" />
          <Skeleton className="dy-h-9 dy-w-24 dy-rounded-lg" />
        </div>
      </div>

      <div className="dy-grid dy-gap-6 xl:dy-grid-cols-[minmax(0,1fr)_320px]">
        <SkeletonCard className="dy-space-y-5 dy-p-5">
          <div className="dy-grid dy-gap-5 md:dy-grid-cols-2">
            <div className="dy-space-y-2">
              <Skeleton className="dy-h-4 dy-w-24" />
              <Skeleton className="dy-h-11 dy-w-full" />
            </div>
            <div className="dy-space-y-2">
              <Skeleton className="dy-h-4 dy-w-20" />
              <Skeleton className="dy-h-11 dy-w-full" />
            </div>
          </div>
          <div className="dy-space-y-2">
            <Skeleton className="dy-h-4 dy-w-28" />
            <Skeleton className="dy-h-32 dy-w-full" />
          </div>
          <div className="dy-grid dy-gap-5 md:dy-grid-cols-2">
            <Skeleton className="dy-h-24 dy-w-full" />
            <Skeleton className="dy-h-24 dy-w-full" />
          </div>
          <Skeleton className="dy-h-40 dy-w-full" />
        </SkeletonCard>

        <SkeletonCard className="dy-space-y-4 dy-p-5">
          <Skeleton className="dy-h-5 dy-w-32" />
          <SkeletonLines lines={5} />
          <Skeleton className="dy-h-28 dy-w-full" />
        </SkeletonCard>
      </div>
    </div>
  )
}

export function AdminMediaSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("dy-space-y-6 lg:dy-space-y-8", className)}>
      <div className="dy-flex dy-flex-col dy-gap-4 lg:dy-flex-row lg:dy-items-end lg:dy-justify-between">
        <div className="dy-space-y-3">
          <Skeleton className="dy-h-4 dy-w-24" />
          <Skeleton className="dy-h-10 dy-w-56" />
          <Skeleton className="dy-h-4 dy-w-80 max-sm:dy-w-full" />
        </div>
        <Skeleton className="dy-h-9 dy-w-36" />
      </div>

      <SkeletonCard className="dy-space-y-4 dy-p-4">
        <div className="dy-flex dy-flex-col dy-gap-3 lg:dy-flex-row">
          <Skeleton className="dy-h-10 dy-flex-1" />
          <Skeleton className="dy-h-10 dy-w-full lg:dy-w-44" />
          <Skeleton className="dy-h-10 dy-w-24" />
        </div>
        <div className="dy-grid dy-grid-cols-2 dy-gap-3 sm:dy-grid-cols-3 lg:dy-grid-cols-4 xl:dy-grid-cols-5 2xl:dy-grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="dy-space-y-2">
              <Skeleton className="dy-aspect-square dy-w-full" />
              <Skeleton className="dy-h-4 dy-w-4/5" />
              <Skeleton className="dy-h-3 dy-w-1/2" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  )
}

export function AdminSectionSkeleton({
  className,
  rows = 4,
}: {
  className?: string
  rows?: number
}) {
  return (
    <div className={cn("dy-space-y-3", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="dy-rounded-xl dy-border dy-border-border/50 dy-p-4">
          <SkeletonLines lines={3} />
        </div>
      ))}
    </div>
  )
}

export function AdminCommandListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dy-space-y-1 dy-p-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="dy-rounded-lg dy-px-3 dy-py-2">
          <Skeleton className="dy-h-4 dy-w-full" />
        </div>
      ))}
    </div>
  )
}
