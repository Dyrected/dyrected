import { useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight } from "lucide-react"

export interface DetailFooterNavigationProps {
  collection: any
  prevDoc?: any
  nextDoc?: any
  prevTitle?: string | null
  nextTitle?: string | null
}

export function DetailFooterNavigation({
  collection,
  prevDoc,
  nextDoc,
  prevTitle,
  nextTitle,
}: DetailFooterNavigationProps) {
  const navigate = useNavigate()
  const slug = collection?.slug
  const singularLabel = collection?.labels?.singular || collection?.slug || "Record"

  if (!prevDoc && !nextDoc) return null

  return (
    <nav
      aria-label="Adjacent record navigation"
      className="dy-pt-8 dy-mt-10 dy-border-t dy-border-border/60 dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 dy-gap-4"
    >
      {/* Previous Record Card */}
      {prevDoc ? (
        <button
          type="button"
          onClick={() => navigate(`/collections/${slug}/${prevDoc.id}`)}
          className="dy-group dy-flex dy-flex-col dy-items-start dy-gap-1 dy-p-4 dy-rounded-2xl dy-border dy-border-border/60 dy-bg-card hover:dy-bg-muted/30 hover:dy-border-border/90 dy-transition-all dy-text-left dy-shadow-xs"
        >
          <div className="dy-flex dy-items-center dy-gap-1.5 dy-text-[11px] dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground group-hover:dy-text-primary dy-transition-colors">
            <ArrowLeft className="dy-h-3.5 dy-w-3.5 dy-transition-transform group-hover:dy--translate-x-1" />
            <span>Previous {singularLabel}</span>
          </div>
          <span className="dy-text-sm dy-font-semibold dy-text-foreground dy-truncate dy-w-full">
            {prevTitle || "Previous document"}
          </span>
        </button>
      ) : (
        <div className="dy-hidden sm:dy-block" />
      )}

      {/* Next Record Card */}
      {nextDoc ? (
        <button
          type="button"
          onClick={() => navigate(`/collections/${slug}/${nextDoc.id}`)}
          className="dy-group dy-flex dy-flex-col dy-items-end dy-gap-1 dy-p-4 dy-rounded-2xl dy-border dy-border-border/60 dy-bg-card hover:dy-bg-muted/30 hover:dy-border-border/90 dy-transition-all dy-text-right dy-shadow-xs sm:dy-ml-auto dy-w-full"
        >
          <div className="dy-flex dy-items-center dy-gap-1.5 dy-text-[11px] dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground group-hover:dy-text-primary dy-transition-colors">
            <span>Next {singularLabel}</span>
            <ArrowRight className="dy-h-3.5 dy-w-3.5 dy-transition-transform group-hover:dy-translate-x-1" />
          </div>
          <span className="dy-text-sm dy-font-semibold dy-text-foreground dy-truncate dy-w-full">
            {nextTitle || "Next document"}
          </span>
        </button>
      ) : (
        <div className="dy-hidden sm:dy-block" />
      )}
    </nav>
  )
}
