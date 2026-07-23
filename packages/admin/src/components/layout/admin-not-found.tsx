import { ArrowLeft, Compass, LayoutDashboard } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "../ui/button"
import { Skeleton } from "../ui/skeleton"
import { cn } from "../../lib/utils"

export function AdminNotFound({
  title = "Page not found",
  description = "The page you requested does not exist, has been hidden, or is no longer available in this admin.",
  backTo,
  backLabel = "Go back",
}: {
  title?: string
  description?: string
  backTo?: string
  backLabel?: string
}) {
  return (
    <div className="dy-flex dy-min-h-[60vh] dy-items-center dy-justify-center dy-px-4">
      <div className="dy-w-full dy-max-w-2xl dy-rounded-[28px] dy-border dy-border-border/60 dy-bg-card/80 dy-p-8 dy-shadow-sm sm:dy-p-10">
        <div className="dy-flex dy-items-start dy-gap-4">
          <div className="dy-flex dy-h-14 dy-w-14 dy-shrink-0 dy-items-center dy-justify-center dy-rounded-2xl dy-bg-primary/10 dy-text-primary">
            <Compass className="dy-h-6 dy-w-6" />
          </div>
          <div className="dy-min-w-0 dy-space-y-3">
            <p className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-[0.28em] dy-text-muted-foreground/60">
              Not Found
            </p>
            <h1 className="dy-text-2xl dy-font-serif dy-font-bold dy-tracking-tight dy-text-foreground sm:dy-text-3xl">
              {title}
            </h1>
            <p className="dy-max-w-xl dy-text-sm dy-leading-6 dy-text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="dy-mt-8 dy-flex dy-flex-col dy-gap-3 sm:dy-flex-row">
          <Button asChild className="dy-h-10 dy-rounded-xl dy-px-4">
            <Link to={backTo || "/"}>
              <LayoutDashboard className="dy-mr-2 dy-h-4 dy-w-4" />
              Open dashboard
            </Link>
          </Button>
          {backTo && (
            <Button asChild variant="outline" className="dy-h-10 dy-rounded-xl dy-px-4">
              <Link to={backTo}>
                <ArrowLeft className="dy-mr-2 dy-h-4 dy-w-4" />
                {backLabel}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function AdminNotFoundSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("dy-flex dy-min-h-[60vh] dy-items-center dy-justify-center dy-px-4", className)}>
      <div className="dy-w-full dy-max-w-2xl dy-rounded-[28px] dy-border dy-border-border/60 dy-bg-card/80 dy-p-8 sm:dy-p-10">
        <div className="dy-flex dy-items-start dy-gap-4">
          <Skeleton className="dy-h-14 dy-w-14 dy-rounded-2xl" />
          <div className="dy-flex-1 dy-space-y-3">
            <Skeleton className="dy-h-3 dy-w-24" />
            <Skeleton className="dy-h-10 dy-w-64 max-sm:dy-w-3/4" />
            <Skeleton className="dy-h-4 dy-w-full" />
            <Skeleton className="dy-h-4 dy-w-5/6" />
          </div>
        </div>
        <div className="dy-mt-8 dy-flex dy-flex-col dy-gap-3 sm:dy-flex-row">
          <Skeleton className="dy-h-10 dy-w-40 dy-rounded-xl" />
          <Skeleton className="dy-h-10 dy-w-32 dy-rounded-xl" />
        </div>
      </div>
    </div>
  )
}
