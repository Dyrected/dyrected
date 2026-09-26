import { useState } from "react"
import {
  RotateCcw,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Mail,
  Check,
  X,
  Calendar,
  FileText,
  Copy,
  CheckCheck,
  Archive,
} from "lucide-react"
import type { CollectionConfig } from "@dyrected/core"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "../../components/ui/sheet"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import type { TrashEntrySnapshot } from "./trash-types"

interface TrashPreviewSheetProps {
  entry: TrashEntrySnapshot | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestore: (entry: TrashEntrySnapshot) => Promise<void> | void
  isRestoring?: boolean
  collections?: CollectionConfig[]
}

function parseSafeDate(val: unknown): Date | null {
  if (val === null || val === undefined || val === "") return null
  if (typeof val === "number") {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof val === "string") {
    const trimmed = val.trim()
    if (/^\d+$/.test(trimmed)) {
      const d = new Date(Number(trimmed))
      return isNaN(d.getTime()) ? null : d
    }
    const d = new Date(trimmed)
    return isNaN(d.getTime()) ? null : d
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val
  }
  return null
}

function formatFriendlyDateTime(val: unknown): string {
  const d = parseSafeDate(val)
  if (!d) return "—"
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatRelativeTime(val: unknown): string {
  const d = parseSafeDate(val)
  if (!d) return ""
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000)
  if (Math.abs(diffSec) < 60) return "just now"
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.round(diffHr / 24)
  if (diffDays === 1) return "yesterday"
  if (diffDays < 30) return `${diffDays} days ago`
  const diffMonths = Math.round(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} mo ago`
  return `${Math.round(diffMonths / 12)} yr ago`
}

function formatCountdown(purgeAt: number | string | null | undefined): {
  text: string
  detail: string
  variant: "default" | "warning" | "destructive" | "secondary"
} {
  if (purgeAt === null || purgeAt === undefined || purgeAt === "") {
    return {
      text: "Kept indefinitely",
      detail: "Exempt from automatic cleanup",
      variant: "secondary",
    }
  }

  const d = parseSafeDate(purgeAt)
  if (!d) {
    return {
      text: "Kept indefinitely",
      detail: "Exempt from automatic cleanup",
      variant: "secondary",
    }
  }

  const diffMs = d.getTime() - Date.now()
  if (diffMs <= 0) {
    return {
      text: "Purge overdue",
      detail: "Eligible for permanent deletion on next cleanup run",
      variant: "destructive",
    }
  }

  const hours = Math.ceil(diffMs / (60 * 60 * 1000))
  if (hours < 24) {
    return {
      text: `Purges in ${hours}h`,
      detail: `Scheduled for deletion in ${hours} hour${hours === 1 ? "" : "s"}`,
      variant: hours <= 6 ? "warning" : "default",
    }
  }

  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
  return {
    text: `Purges in ${days} day${days === 1 ? "" : "s"}`,
    detail: `Scheduled for deletion in ${days} day${days === 1 ? "" : "s"}`,
    variant: days <= 3 ? "warning" : "default",
  }
}

function humanizeKey(key: string): string {
  if (!key) return ""
  const unhyphenated = key.replace(/[-_]/g, " ")
  const spaced = unhyphenated.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  return spaced
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function isImageUrl(url: unknown): boolean {
  if (typeof url !== "string") return false
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) return false
  return (
    /\.(jpeg|jpg|png|webp|gif|svg|avif)(\?.*)?$/i.test(trimmed) ||
    /images\.unsplash\.com/i.test(trimmed) ||
    /res\.cloudinary\.com/i.test(trimmed) ||
    /imgix\.net/i.test(trimmed)
  )
}

function isEmail(val: unknown): boolean {
  if (typeof val !== "string") return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
}

function isWebUrl(val: unknown): boolean {
  if (typeof val !== "string") return false
  return /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(val.trim())
}

function isIsoDateString(val: unknown): boolean {
  if (typeof val !== "string") return false
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val.trim())
}

export function TrashPreviewSheet({
  entry,
  open,
  onOpenChange,
  onRestore,
  isRestoring = false,
  collections = [],
}: TrashPreviewSheetProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  if (!entry) return null

  const snapshot = entry.snapshot || {}
  const keys = Object.keys(snapshot).filter((k) => !k.startsWith("_") && k !== "password")

  const targetCollection = collections.find((c) => c.slug === entry.collection)
  const collectionLabel =
    targetCollection?.labels?.singular ||
    targetCollection?.labels?.plural ||
    humanizeKey(entry.collection)

  const purgeInfo = formatCountdown(entry.purgeAt)

  const copyToClipboard = (key: string, value: unknown) => {
    try {
      const text = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)
      navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      // ignore clipboard error
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:dy-max-w-2xl dy-w-full dy-flex dy-flex-col dy-h-full dy-overflow-hidden dy-p-0"
      >
        {/* Header with generous padding */}
        <SheetHeader className="dy-p-6 dy-pb-5 dy-border-b dy-border-border/60 dy-bg-muted/10">
          <div className="dy-flex dy-items-center dy-gap-2.5 dy-mb-1.5">
            <Badge variant="outline" className="dy-px-2.5 dy-py-0.5 dy-text-xs dy-font-medium">
              {collectionLabel}
            </Badge>
            <Badge
              variant="secondary"
              className="dy-px-2.5 dy-py-0.5 dy-text-xs dy-font-medium dy-gap-1 dy-bg-amber-500/10 dy-text-amber-700 dark:dy-text-amber-300 dy-border dy-border-amber-500/20"
            >
              <Archive className="dy-h-3 dy-w-3" />
              <span>In Trash</span>
            </Badge>
          </div>

          <SheetTitle className="dy-text-xl dy-font-semibold dy-tracking-tight dy-text-foreground dy-truncate">
            {entry.title || entry.docId}
          </SheetTitle>

          <SheetDescription className="dy-text-xs dy-text-muted-foreground dy-flex dy-items-center dy-gap-2">
            <span>Original Record ID:</span>
            <code className="dy-px-1.5 dy-py-0.5 dy-rounded dy-bg-muted dy-font-mono dy-text-foreground font-semibold">
              {entry.docId}
            </code>
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="dy-flex-1 dy-overflow-y-auto dy-p-6 dy-space-y-5">
          {/* Concise explanation banner */}
          <div className="dy-px-3.5 dy-py-2.5 dy-rounded-lg dy-border dy-border-border/60 dy-bg-muted/30 dy-flex dy-items-center dy-gap-2.5 dy-text-xs">
            <FileText className="dy-h-4 dy-w-4 dy-text-primary dy-shrink-0" />
            <span className="dy-text-muted-foreground">
              Read-only archive snapshot. Restore at any time to publish back to <strong className="dy-text-foreground">{collectionLabel}</strong>.
            </span>
          </div>

          {/* Clean Lifecycle & Deletion Metadata Card */}
          <div className="dy-p-4 dy-rounded-xl dy-border dy-border-border/60 dy-bg-card dy-space-y-3.5">
            <div className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 dy-gap-4">
              {/* Deleted At */}
              <div className="dy-space-y-0.5">
                <span className="dy-text-[11px] dy-font-medium dy-text-muted-foreground dy-flex dy-items-center dy-gap-1.5">
                  <Clock className="dy-h-3.5 dy-w-3.5" />
                  Deleted At
                </span>
                <div className="dy-text-sm dy-font-medium dy-text-foreground">
                  {formatFriendlyDateTime(entry.deletedAt)}
                </div>
                {formatRelativeTime(entry.deletedAt) && (
                  <div className="dy-text-xs dy-text-muted-foreground/80">
                    {formatRelativeTime(entry.deletedAt)}
                  </div>
                )}
              </div>

              {/* Deleted By */}
              <div className="dy-space-y-0.5">
                <span className="dy-text-[11px] dy-font-medium dy-text-muted-foreground dy-flex dy-items-center dy-gap-1.5">
                  <User className="dy-h-3.5 dy-w-3.5" />
                  Deleted By
                </span>
                <div className="dy-flex dy-items-center dy-gap-2">
                  <span className="dy-inline-flex dy-items-center dy-justify-center dy-h-6 dy-w-6 dy-rounded-full dy-bg-primary/10 dy-text-[11px] dy-font-semibold dy-text-primary">
                    {(entry.deletedBy || "U").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="dy-text-sm dy-font-medium dy-text-foreground">
                    {entry.deletedBy ? `User (${entry.deletedBy})` : "System / Automated"}
                  </span>
                </div>
              </div>
            </div>

            {/* Retention & Purge Status */}
            <div
              className={`dy-px-3.5 dy-py-2.5 dy-rounded-lg dy-border dy-flex dy-items-center dy-justify-between dy-gap-3 ${
                entry.purgeAt === null
                  ? "dy-border-emerald-500/20 dy-bg-emerald-500/5"
                  : purgeInfo.variant === "destructive"
                    ? "dy-border-red-500/20 dy-bg-red-500/5"
                    : "dy-border-amber-500/20 dy-bg-amber-500/5"
              }`}
            >
              <div className="dy-flex dy-items-center dy-gap-2 dy-text-xs">
                {entry.purgeAt === null ? (
                  <ShieldCheck className="dy-h-4 dy-w-4 dy-text-emerald-600 dark:dy-text-emerald-400 dy-shrink-0" />
                ) : (
                  <AlertTriangle
                    className={`dy-h-4 dy-w-4 dy-shrink-0 ${
                      purgeInfo.variant === "destructive"
                        ? "dy-text-red-600 dark:dy-text-red-400"
                        : "dy-text-amber-600 dark:dy-text-amber-400"
                    }`}
                  />
                )}
                <span className="dy-font-medium dy-text-foreground">
                  {entry.purgeAt === null
                    ? "Kept indefinitely (exempt from purge)"
                    : `Purges permanently on ${formatFriendlyDateTime(entry.purgeAt)}`}
                </span>
              </div>
              <Badge
                variant={entry.purgeAt === null ? "secondary" : "outline"}
                className="dy-text-[11px] dy-font-medium dy-shrink-0"
              >
                {purgeInfo.text}
              </Badge>
            </div>
          </div>

          {/* Stored Document Fields Section */}
          <div className="dy-space-y-3">
            <div className="dy-flex dy-items-center dy-justify-between">
              <h4 className="dy-text-sm dy-font-semibold dy-text-foreground">
                Stored Content
              </h4>
              <Badge variant="outline" className="dy-text-[11px]">
                {keys.length} field{keys.length === 1 ? "" : "s"}
              </Badge>
            </div>

            <div className="dy-space-y-3">
              {keys.map((key) => {
                const val = snapshot[key]
                const fieldDef = targetCollection?.fields?.find((f) => f.name === key)
                const fieldLabel = fieldDef?.label || humanizeKey(key)
                const isObject = val !== null && typeof val === "object"
                const isImg = isImageUrl(val)
                const isMail = isEmail(val)
                const isUrl = !isImg && !isMail && isWebUrl(val)
                const isIsoDate = !isImg && !isMail && !isUrl && isIsoDateString(val)

                return (
                  <div
                    key={key}
                    className="dy-p-4 dy-rounded-xl dy-border dy-border-border/60 dy-bg-card hover:dy-border-border dy-transition-colors dy-space-y-2"
                  >
                    {/* Field Header */}
                    <div className="dy-flex dy-items-center dy-justify-between">
                      <div className="dy-flex dy-items-center dy-gap-2">
                        <span className="dy-text-xs dy-font-semibold dy-text-foreground">
                          {fieldLabel}
                        </span>
                        {fieldLabel.toLowerCase() !== key.toLowerCase() && (
                          <span className="dy-font-mono dy-text-[10px] dy-text-muted-foreground/60">
                            {key}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(key, val)}
                        className="dy-p-1 dy-rounded dy-text-muted-foreground hover:dy-text-foreground hover:dy-bg-muted dy-transition-colors"
                        title="Copy field value"
                      >
                        {copiedKey === key ? (
                          <CheckCheck className="dy-h-3.5 dy-w-3.5 dy-text-emerald-500" />
                        ) : (
                          <Copy className="dy-h-3.5 dy-w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Field Value Renderer */}
                    <div className="dy-pt-1">
                      {isObject ? (
                        Array.isArray(val) && val.every((item) => typeof item === "string" || typeof item === "number") ? (
                          <div className="dy-flex dy-flex-wrap dy-gap-1.5">
                            {val.map((item, idx) => (
                              <Badge key={idx} variant="secondary" className="dy-text-xs">
                                {String(item)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <pre className="dy-text-xs dy-font-mono dy-bg-muted/40 dy-p-3 dy-rounded-lg dy-overflow-x-auto dy-text-foreground/90 dy-border dy-border-border/40">
                            {JSON.stringify(val, null, 2)}
                          </pre>
                        )
                      ) : isImg ? (
                        <div className="dy-space-y-2.5">
                          <div className="dy-relative dy-h-48 dy-w-full dy-overflow-hidden dy-rounded-lg dy-border dy-border-border/60 dy-bg-muted/20">
                            <img
                              src={String(val)}
                              alt={fieldLabel}
                              className="dy-h-full dy-w-full dy-object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="dy-flex dy-items-center dy-justify-between dy-text-xs">
                            <span className="dy-font-mono dy-text-muted-foreground/70 dy-truncate dy-max-w-[320px]">
                              {String(val)}
                            </span>
                            <a
                              href={String(val)}
                              target="_blank"
                              rel="noreferrer"
                              className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-primary hover:dy-underline dy-font-medium"
                            >
                              <span>View full size</span>
                              <ExternalLink className="dy-h-3.5 dy-w-3.5" />
                            </a>
                          </div>
                        </div>
                      ) : isMail ? (
                        <a
                          href={`mailto:${String(val)}`}
                          className="dy-inline-flex dy-items-center dy-gap-2 dy-text-primary hover:dy-underline dy-font-medium dy-text-sm"
                        >
                          <Mail className="dy-h-4 dy-w-4" />
                          <span>{String(val)}</span>
                        </a>
                      ) : isUrl ? (
                        <a
                          href={String(val)}
                          target="_blank"
                          rel="noreferrer"
                          className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-primary hover:dy-underline dy-font-medium dy-text-sm dy-break-all"
                        >
                          <span>{String(val)}</span>
                          <ExternalLink className="dy-h-3.5 dy-w-3.5 dy-shrink-0" />
                        </a>
                      ) : isIsoDate ? (
                        <div className="dy-flex dy-items-center dy-gap-2 dy-text-sm">
                          <Calendar className="dy-h-4 dy-w-4 dy-text-muted-foreground" />
                          <span className="dy-font-medium dy-text-foreground">
                            {formatFriendlyDateTime(val)}
                          </span>
                          <span className="dy-text-xs dy-text-muted-foreground/80">
                            ({formatRelativeTime(val)})
                          </span>
                        </div>
                      ) : typeof val === "boolean" ? (
                        val ? (
                          <span className="dy-inline-flex dy-items-center dy-gap-1.5 dy-px-3 dy-py-1 dy-rounded-md dy-text-xs dy-font-semibold dy-bg-emerald-500/10 dy-text-emerald-700 dark:dy-text-emerald-300 dy-border dy-border-emerald-500/20">
                            <Check className="dy-h-3.5 dy-w-3.5" />
                            <span>Yes</span>
                          </span>
                        ) : (
                          <span className="dy-inline-flex dy-items-center dy-gap-1.5 dy-px-3 dy-py-1 dy-rounded-md dy-text-xs dy-font-semibold dy-bg-muted dy-text-muted-foreground dy-border dy-border-border/60">
                            <X className="dy-h-3.5 dy-w-3.5" />
                            <span>No</span>
                          </span>
                        )
                      ) : val === undefined || val === null || val === "" ? (
                        <span className="dy-text-muted-foreground/60 dy-italic dy-text-xs">
                          No value recorded
                        </span>
                      ) : (
                        <div className="dy-text-sm dy-text-foreground dy-leading-relaxed dy-break-words">
                          {String(val)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer with generous padding & clear actions */}
        <SheetFooter className="dy-p-5 dy-border-t dy-border-border/60 dy-bg-background/95 dy-backdrop-blur dy-flex dy-items-center dy-justify-between dy-gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="dy-px-5"
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={async () => {
              await onRestore(entry)
              onOpenChange(false)
            }}
            disabled={isRestoring}
            className="dy-gap-2 dy-px-5 dy-font-medium"
          >
            <RotateCcw className={`dy-h-4 dy-w-4 ${isRestoring ? "dy-animate-spin" : ""}`} />
            <span>Restore Document</span>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
