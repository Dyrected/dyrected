/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { resolveDocumentTitle } from "../../lib/document-title"
import { resolvePublishingStatus, resolveWorkflowState } from "../../lib/workflow-ui"
import { getWorkflowBadgePresentation } from "../../lib/workflow-badge"
import { resolvePreviewUrl } from "../../lib/preview-url"

export interface DetailHeaderProps {
  collection: any
  doc: any
  user?: any
  schemas?: any
  prevDoc?: any
  nextDoc?: any
  prevTitle?: string | null
  nextTitle?: string | null
}

export function DetailHeader({
  collection,
  doc,
  user: _user,
  schemas,
  prevDoc,
  nextDoc,
  prevTitle,
  nextTitle,
}: DetailHeaderProps) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const docTitle =
    resolveDocumentTitle({
      entry: doc,
      collection,
      collections: schemas?.collections,
    }) || doc?.title || doc?.name || String(doc?.id || "")
  const collectionLabel = collection?.labels?.plural || collection?.labels?.singular || collection?.slug

  const handleCopyId = () => {
    if (doc?.id) {
      navigator.clipboard.writeText(String(doc.id))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Workflow State or Publishing Status badge
  const workflowState = resolveWorkflowState(collection?.workflow, doc?._workflow)
  const publishingStatus = resolvePublishingStatus(collection, doc)
  const workflowPresentation = workflowState
    ? getWorkflowBadgePresentation(workflowState.color)
    : null

  const previewUrl = resolvePreviewUrl(
    collection?.admin?.previewUrl,
    doc,
    schemas?.admin?.siteUrl || "",
  )

  return (
    <div className="dy-space-y-4 dy-pb-6 dy-border-b dy-border-border/60">
      {/* Top breadcrumb navigation */}
      <div className="dy-flex dy-items-center dy-justify-between dy-gap-3">
        <div className="dy-flex dy-items-center dy-gap-2 dy-text-sm dy-text-muted-foreground dy-min-w-0">
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate(`/collections/${collection.slug}`)}
            className="dy-h-8 dy-pr-2 dy-pl-0 dy-gap-1 dy-text-muted-foreground hover:dy-text-foreground dy-shrink-0"
          >
            <ChevronLeft className="dy-h-4 dy-w-4" />
            <span className="dy-truncate dy-max-w-[120px] sm:dy-max-w-none">{collectionLabel}</span>
          </Button>
          <span className="dy-text-muted-foreground/60"><ChevronRight className="dy-h-3 dy-w-3" /></span>
          <span className="dy-font-medium dy-text-foreground dy-truncate dy-max-w-[140px] xs:dy-max-w-[200px] sm:dy-max-w-md">
            {docTitle}
          </span>
        </div>

        <div className="dy-flex dy-items-center dy-gap-2 dy-shrink-0">
          {previewUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="dy-h-8 dy-gap-1.5"
            >
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="dy-h-3.5 dy-w-3.5" />
                <span className="dy-hidden sm:dy-inline">Preview</span>
              </a>
            </Button>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={() => navigate(`/collections/${collection.slug}/${doc.id}/edit`)}
            className="dy-h-8 dy-gap-1.5 dy-font-semibold"
          >
            <Pencil className="dy-h-3.5 dy-w-3.5" />
            <span>Edit</span>
          </Button>
        </div>
      </div>

      {/* Main Title, ID, Status and Stepper Header */}
      <div className="dy-flex dy-items-center dy-justify-between dy-gap-4">
        <div className="dy-space-y-1.5 dy-min-w-0 dy-flex-1">
          <div className="dy-flex dy-items-center dy-gap-3 dy-flex-wrap">
            <h1 className="dy-text-xl sm:dy-text-2xl dy-font-bold dy-tracking-tight dy-text-foreground dy-truncate">
              {docTitle}
            </h1>
            {workflowPresentation && workflowState && (
              <Badge
                variant="secondary"
                className={`dy-font-semibold dy-text-xs ${workflowPresentation.className}`}
                style={workflowPresentation.style}
              >
                {workflowState.label || workflowState.name}
              </Badge>
            )}
            {!workflowPresentation && publishingStatus && (
              <Badge variant={publishingStatus.label === "Published" ? "default" : "secondary"}>
                {publishingStatus.label}
              </Badge>
            )}
          </div>

          <div className="dy-flex dy-items-center dy-gap-2 dy-text-xs dy-text-muted-foreground">
            <span>ID:</span>
            <code className="dy-font-mono dy-bg-muted/60 dy-px-1.5 dy-py-0.5 dy-rounded">
              {doc.id}
            </code>
            <button
              type="button"
              onClick={handleCopyId}
              className="hover:dy-text-foreground dy-transition-colors"
              title="Copy ID"
            >
              {copied ? <Check className="dy-h-3 dy-w-3 dy-text-emerald-600" /> : <Copy className="dy-h-3 dy-w-3" />}
            </button>
          </div>
        </div>

        {(prevDoc || nextDoc) && (
          <div className="dy-flex dy-items-center dy-gap-0.5 dy-border dy-border-border/60 dy-rounded-xl dy-p-1 dy-bg-muted/20 dy-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              disabled={!prevDoc}
              onClick={() => navigate(`/collections/${collection.slug}/${prevDoc.id}`)}
              className="dy-h-7 dy-w-7 dy-rounded-lg dy-text-muted-foreground hover:dy-text-foreground disabled:dy-opacity-25"
              title={prevTitle ? `Previous: ${prevTitle} (K)` : "No previous record"}
            >
              <ChevronLeft className="dy-h-4 dy-w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!nextDoc}
              onClick={() => navigate(`/collections/${collection.slug}/${nextDoc.id}`)}
              className="dy-h-7 dy-w-7 dy-rounded-lg dy-text-muted-foreground hover:dy-text-foreground disabled:dy-opacity-25"
              title={nextTitle ? `Next: ${nextTitle} (J)` : "No next record"}
            >
              <ChevronRight className="dy-h-4 dy-w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
