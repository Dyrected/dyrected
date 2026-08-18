/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft,
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
}

export function DetailHeader({ collection, doc, user: _user, schemas }: DetailHeaderProps) {
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
      <div className="dy-flex dy-items-center dy-justify-between">
        <div className="dy-flex dy-items-center dy-gap-2 dy-text-sm dy-text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/collections/${collection.slug}`)}
            className="dy-h-8 dy-px-2 dy-gap-1 dy-text-muted-foreground hover:dy-text-foreground"
          >
            <ChevronLeft className="dy-h-4 dy-w-4" />
            <span>{collectionLabel}</span>
          </Button>
          <span>/</span>
          <span className="dy-font-medium dy-text-foreground dy-truncate dy-max-w-xs sm:dy-max-w-md">
            {docTitle}
          </span>
        </div>

        <div className="dy-flex dy-items-center dy-gap-2">
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

      {/* Main Title, ID and Status Header */}
      <div className="dy-flex dy-flex-col sm:dy-flex-row sm:dy-items-center sm:dy-justify-between dy-gap-4">
        <div className="dy-space-y-1">
          <div className="dy-flex dy-items-center dy-gap-3">
            <h1 className="dy-text-xl sm:dy-text-2xl dy-font-bold dy-tracking-tight dy-text-foreground">
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
      </div>
    </div>
  )
}
