/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  Copy,
  ExternalLink,
  Mail,
  Phone,
  Check,
  Star,
  Download,
  Layers,
  Pencil,
  Loader2,
  FileText,
} from "lucide-react"
import { Badge } from "../ui/badge"
import { resolveAdminIcon } from "../../lib/admin-icons"
import {
  formatNumber,
  formatDate,
  getRatingSpec,
} from "../../lib/format"
import { resolveDocumentTitle } from "../../lib/document-title"
import { cn } from "../../lib/utils"
import { resolveBadgePresentation } from "../../lib/badge-colors"
import type { DisplayFieldOptions, DisplayVariant } from "@dyrected/core"

export interface DetailFieldRendererProps {
  fieldDef?: any
  value: any
  doc: any
  collection?: any
  options?: DisplayFieldOptions
  client?: any
  schemas?: any
  onUpdate?: (fieldName: string, newValue: any) => Promise<void> | void
}

function humanizeLabel(fieldName: string): string {
  if (!fieldName) return ""
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_.]/g, " ")
    .trim()
    .replace(/^./, (str) => str.toUpperCase())
}

/**
 * Robustly resolves a human-readable label for a select/radio option value.
 */
function resolveOptionLabel(val: any, options?: any[]): string {
  if (val == null || val === "") return ""
  if (Array.isArray(options)) {
    for (const opt of options) {
      if (typeof opt === "string" || typeof opt === "number" || typeof opt === "boolean") {
        if (opt === val || String(opt) === String(val)) return String(opt)
      } else if (opt && typeof opt === "object") {
        const optVal = opt.value !== undefined ? opt.value : opt.id
        if (optVal === val || String(optVal) === String(val)) {
          return opt.label ?? opt.name ?? opt.title ?? String(optVal)
        }
      }
    }
  }
  if (typeof val === "object") {
    return val.label ?? val.name ?? val.title ?? val.value ?? val.id ?? JSON.stringify(val)
  }
  return String(val)
}

/**
 * Checks if a value or relationship target represents an upload / media asset.
 */
function isMediaValue(val: any, fieldDef?: any, schemas?: any): boolean {
  if (!val) return false
  if (fieldDef?.type === "upload") return true

  // Check if relationTo points to an upload collection
  if (fieldDef?.type === "relationship" && fieldDef?.relationTo) {
    const targetCol = schemas?.collections?.find((c: any) => c.slug === fieldDef.relationTo)
    if (targetCol?.upload) return true
  }

  // Check value properties
  if (typeof val === "object") {
    if (val.mimeType || (typeof val.url === "string" && val.url.length > 0)) return true
  } else if (typeof val === "string") {
    if (val.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|mp4|webm|pdf)(\?.*)?$/i)) return true
  }

  return false
}

export function DetailFieldRenderer({
  fieldDef,
  value,
  doc,
  collection,
  options,
  client,
  schemas,
  onUpdate,
}: DetailFieldRendererProps) {
  const displayVariant: DisplayVariant | undefined = options?.display

  const [draftValue, setDraftValue] = useState(value)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const hideLabel = options?.hideLabel === true || (options as any)?.label === false || (options as any)?.label === ""
  const label = hideLabel ? null : ((options as any)?.label ?? fieldDef?.label ?? (fieldDef?.name ? humanizeLabel(fieldDef.name) : ""))
  const description = (options as any)?.description ?? fieldDef?.description
  const placeholder = (options as any)?.placeholder ?? "-"

  const fieldName = fieldDef?.name
  const fieldType = fieldDef?.type

  // Check if field is empty
  const isEmptyValue =
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && Object.keys(value).length === 0 && !isMediaValue(value, fieldDef, schemas))

  if (options?.hideIfEmpty && isEmptyValue && !isEditing) {
    return null
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      if (onUpdate && fieldName) {
        await onUpdate(fieldName, draftValue)
      } else if (client && doc?.id && fieldName) {
        const collectionSlug = collection?.slug || fieldDef?.collectionSlug || doc?._meta?.collection
        if (collectionSlug) {
          await client.collection(collectionSlug).update(doc.id, { [fieldName]: draftValue })
        } else if (doc?._meta?.global || doc?.slug) {
          await client.updateGlobal(doc.slug || doc._meta.global, { [fieldName]: draftValue })
        }
      }
      setIsEditing(false)
      toast.success(`${label || "Field"} updated`)
    } catch (err: any) {
      toast.error(err?.message || "Failed to update field")
    } finally {
      setIsSaving(false)
    }
  }

  const renderEditorInput = () => {
    if (fieldType === "textarea" || (fieldType === "text" && (options as any)?.multiline)) {
      return (
        <textarea
          value={draftValue ?? ""}
          onChange={(e) => setDraftValue(e.target.value)}
          rows={3}
          className="dy-w-full dy-rounded-xl dy-border dy-border-input dy-bg-background dy-p-3 dy-text-sm dy-text-foreground focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-ring"
          placeholder={`Enter ${label || "value"}...`}
        />
      )
    }

    if (fieldType === "select" || fieldType === "radio" || Array.isArray(fieldDef?.options)) {
      const opts: any[] = fieldDef?.options || []
      return (
        <select
          value={draftValue ?? ""}
          onChange={(e) => setDraftValue(e.target.value)}
          className="dy-w-full dy-h-10 dy-rounded-xl dy-border dy-border-input dy-bg-background dy-px-3 dy-text-sm dy-text-foreground focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-ring"
        >
          <option value="">-- Select {label || "option"} --</option>
          {opts.map((opt, i) => {
            const optVal = typeof opt === "object" ? (opt.value ?? opt.id) : opt
            const optLabel = typeof opt === "object" ? (opt.label ?? opt.name ?? opt.value) : opt
            return (
              <option key={i} value={String(optVal)}>
                {String(optLabel)}
              </option>
            )
          })}
        </select>
      )
    }

    if (fieldType === "boolean" || displayVariant === "boolean") {
      return (
        <label className="dy-flex dy-items-center dy-gap-2 dy-cursor-pointer dy-py-1">
          <input
            type="checkbox"
            checked={Boolean(draftValue)}
            onChange={(e) => setDraftValue(e.target.checked)}
            className="dy-h-4 dy-w-4 dy-rounded dy-border-input dy-text-primary focus:dy-ring-ring"
          />
          <span className="dy-text-sm dy-font-medium dy-text-foreground">
            {draftValue ? "Yes (Enabled)" : "No (Disabled)"}
          </span>
        </label>
      )
    }

    if (fieldType === "number" || displayVariant === "currency" || displayVariant === "percent") {
      return (
        <input
          type="number"
          value={draftValue ?? ""}
          onChange={(e) => setDraftValue(e.target.value === "" ? null : Number(e.target.value))}
          className="dy-w-full dy-h-10 dy-rounded-xl dy-border dy-border-input dy-bg-background dy-px-3 dy-text-sm dy-text-foreground focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-ring"
          placeholder={`Enter ${label || "number"}...`}
        />
      )
    }

    if (fieldType === "date" || displayVariant === "date") {
      return (
        <input
          type="date"
          value={typeof draftValue === "string" ? draftValue.slice(0, 10) : ""}
          onChange={(e) => setDraftValue(e.target.value)}
          className="dy-w-full dy-h-10 dy-rounded-xl dy-border dy-border-input dy-bg-background dy-px-3 dy-text-sm dy-text-foreground focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-ring"
        />
      )
    }

    if (fieldType === "datetime" || displayVariant === "datetime") {
      return (
        <input
          type="datetime-local"
          value={typeof draftValue === "string" ? draftValue.slice(0, 16) : ""}
          onChange={(e) => setDraftValue(e.target.value)}
          className="dy-w-full dy-h-10 dy-rounded-xl dy-border dy-border-input dy-bg-background dy-px-3 dy-text-sm dy-text-foreground focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-ring"
        />
      )
    }

    if (displayVariant === "color") {
      return (
        <div className="dy-flex dy-items-center dy-gap-2">
          <input
            type="color"
            value={draftValue || "#000000"}
            onChange={(e) => setDraftValue(e.target.value)}
            className="dy-h-10 dy-w-14 dy-rounded-lg dy-border dy-border-input dy-cursor-pointer"
          />
          <input
            type="text"
            value={draftValue ?? ""}
            onChange={(e) => setDraftValue(e.target.value)}
            className="dy-flex-1 dy-h-10 dy-rounded-xl dy-border dy-border-input dy-bg-background dy-px-3 dy-font-mono dy-text-sm dy-text-foreground focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-ring"
            placeholder="#000000"
          />
        </div>
      )
    }

    // Default text input
    return (
      <input
        type="text"
        value={draftValue ?? ""}
        onChange={(e) => setDraftValue(e.target.value)}
        className="dy-w-full dy-h-10 dy-rounded-xl dy-border dy-border-input dy-bg-background dy-px-3 dy-text-sm dy-text-foreground focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-ring"
        placeholder={`Enter ${label || "value"}...`}
      />
    )
  }

  const renderSingleMediaItem = (item: any, keyIdx?: number) => {
    const url = typeof item === "string" ? item : item?.url
    if (!url) return null
    const filename = typeof item === "object" ? item?.filename || item?.name || item?.title : ""
    const mimeType = typeof item === "object" ? item?.mimeType : ""
    const isImage = mimeType?.startsWith("image/") || url.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i)
    const isVideo = mimeType?.startsWith("video/") || url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)

    if (isImage) {
      return (
        <div
          key={keyIdx}
          className="dy-flex dy-items-start dy-gap-3.5 dy-p-3 dy-bg-muted/20 dy-border dy-border-border/60 dy-rounded-xl dy-max-w-md dy-transition-all hover:dy-border-border hover:dy-bg-muted/30"
        >
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="dy-relative dy-h-20 dy-w-20 dy-rounded-lg dy-overflow-hidden dy-border dy-border-border/60 dy-bg-muted/40 dy-shrink-0 dy-group/media"
            title="Click to view full image"
          >
            <img
              src={url}
              alt={filename || label || "Media asset"}
              className="dy-h-full dy-w-full dy-object-cover dy-transition-transform group-hover/media:dy-scale-105"
            />
          </a>
          <div className="dy-flex-1 dy-min-w-0 dy-space-y-1">
            <p className="dy-text-xs dy-font-semibold dy-text-foreground dy-truncate">{filename || "Image asset"}</p>
            {mimeType && <p className="dy-text-[11px] dy-text-muted-foreground">{mimeType}</p>}
            <div className="dy-flex dy-items-center dy-gap-2 dy-pt-1">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="dy-inline-flex dy-items-center dy-gap-1 dy-text-xs dy-font-medium dy-text-primary hover:dy-underline"
              >
                <span>Open image</span>
                <ExternalLink className="dy-h-3 dy-w-3" />
              </a>
            </div>
          </div>
        </div>
      )
    }

    if (isVideo) {
      return (
        <div key={keyIdx} className="dy-space-y-2 dy-max-w-md">
          <video
            src={url}
            controls
            className="dy-w-full dy-rounded-xl dy-border dy-border-border/60 dy-bg-black"
          />
          {filename && <p className="dy-text-xs dy-text-muted-foreground dy-truncate">{filename}</p>}
        </div>
      )
    }

    return (
      <a
        key={keyIdx}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="dy-inline-flex dy-items-center dy-gap-2.5 dy-px-3.5 dy-py-2.5 dy-rounded-xl dy-bg-muted/30 hover:dy-bg-muted/60 dy-border dy-border-border/60 dy-text-xs dy-font-medium dy-text-foreground dy-transition-colors"
      >
        <FileText className="dy-h-4 dy-w-4 dy-text-primary" />
        <span className="dy-truncate dy-max-w-[220px]">{filename || "Download File"}</span>
        <Download className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground" />
      </a>
    )
  }

  const renderValue = () => {
    const val = value

    // 1. Explicit Display Variant Handling
    if (displayVariant === "copyable") {
      const text = val != null ? String(val) : ""
      return (
        <div className="dy-flex dy-items-center dy-gap-2">
          <span className="dy-font-mono dy-text-sm dy-text-foreground">{text || placeholder}</span>
          {text && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(text)}
              className="dy-p-1 dy-rounded hover:dy-bg-muted/80 dy-text-muted-foreground hover:dy-text-foreground dy-transition-colors"
              title="Copy"
            >
              <Copy className="dy-h-3.5 dy-w-3.5" />
            </button>
          )}
        </div>
      )
    }

    if (displayVariant === "currency") {
      const currency = options?.currency || "USD"
      const num = Number(val)
      if (Number.isNaN(num) || val == null) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <span className="dy-font-semibold dy-tabular-nums dy-text-foreground">
          {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num)}
        </span>
      )
    }

    if (displayVariant === "percent") {
      const num = Number(val)
      if (Number.isNaN(num) || val == null) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <span className="dy-font-semibold dy-tabular-nums dy-text-foreground">
          {formatNumber(num, { type: "percent", scale: false } as any)}
        </span>
      )
    }

    if (displayVariant === "badge") {
      if (val == null || val === "") return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      const resolvedLabel = resolveOptionLabel(val, fieldDef?.options)
      const badgeText = resolvedLabel || (typeof val === "object" ? resolveDocumentTitle({ entry: val, collection: fieldDef }) : String(val))
      const presentation = resolveBadgePresentation({
        value: val,
        badgeText,
        badgeColors: options?.badgeColors,
        fieldDef,
        defaultVariant: "secondary",
        baseClassName: "dy-font-medium dy-text-xs",
      })
      return (
        <Badge
          variant={presentation.variant}
          className={presentation.className}
          style={presentation.style}
        >
          {badgeText}
        </Badge>
      )
    }

    if (displayVariant === "badges" || displayVariant === "tags") {
      const list = Array.isArray(val) ? val : val ? [val] : []
      if (list.length === 0) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <div className="dy-flex dy-flex-wrap dy-gap-1.5">
          {list.map((item, idx) => {
            const itemLabel = resolveOptionLabel(item, fieldDef?.options)
            const itemText = itemLabel || (typeof item === "object" ? resolveDocumentTitle({ entry: item, collection: fieldDef }) : String(item))
            const presentation = resolveBadgePresentation({
              value: item,
              badgeText: itemText,
              badgeColors: options?.badgeColors,
              fieldDef,
              defaultVariant: "outline",
              baseClassName: "dy-text-xs dy-font-normal",
            })
            return (
              <Badge
                key={idx}
                variant={presentation.variant}
                className={presentation.className}
                style={presentation.style}
              >
                {itemText}
              </Badge>
            )
          })}
        </div>
      )
    }

    if (displayVariant === "code") {
      if (val == null || val === "") return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      const text = typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)
      return (
        <pre className="dy-bg-muted/40 dy-p-3 dy-rounded-xl dy-text-xs dy-font-mono dy-text-foreground dy-overflow-x-auto dy-border dy-border-border/60">
          <code>{text}</code>
        </pre>
      )
    }

    if (displayVariant === "code-badge") {
      if (val == null || val === "") return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <code className="dy-inline-block dy-px-2 dy-py-0.5 dy-rounded-md dy-bg-muted/60 dy-font-mono dy-text-xs dy-text-foreground dy-border dy-border-border/60">
          {String(val)}
        </code>
      )
    }

    if (displayVariant === "star" || displayVariant === "star-rating") {
      const num = Number(val) || 0
      const ratingSpec = getRatingSpec(num, { type: "rating", max: (options as any)?.max || 5 } as any)
      if (!ratingSpec) return <span className="dy-text-muted-foreground/60">{placeholder}</span>

      return (
        <div className="dy-flex dy-items-center dy-gap-1">
          {Array.from({ length: ratingSpec.max }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "dy-h-4 dy-w-4",
                i < ratingSpec.value
                  ? "dy-fill-amber-400 dy-text-amber-400"
                  : "dy-fill-muted/40 dy-text-muted-foreground/30",
              )}
            />
          ))}
          <span className="dy-ml-1.5 dy-text-xs dy-font-medium dy-text-muted-foreground">
            {ratingSpec.value}/{ratingSpec.max}
          </span>
        </div>
      )
    }

    if (displayVariant === "progress") {
      const num = Number(val) || 0
      const clamped = Math.min(Math.max(num, 0), 100)
      return (
        <div className="dy-space-y-1.5 dy-w-full dy-max-w-xs">
          <div className="dy-h-2 dy-w-full dy-bg-muted/60 dy-rounded-full dy-overflow-hidden">
            <div
              className="dy-h-full dy-bg-primary dy-rounded-full dy-transition-all"
              style={{ width: `${clamped}%` }}
            />
          </div>
          <span className="dy-text-xs dy-font-medium dy-text-muted-foreground">{clamped}%</span>
        </div>
      )
    }

    if (displayVariant === "date" || displayVariant === "datetime" || displayVariant === "time" || displayVariant === "relative") {
      if (!val) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      const dateVal = typeof val === "string" || typeof val === "number" ? new Date(val) : val
      const fieldCategory = displayVariant === "time" ? "time" : displayVariant === "datetime" ? "datetime" : "date"
      return <span className="dy-text-sm dy-text-foreground">{formatDate(dateVal, { type: displayVariant } as any, fieldCategory)}</span>
    }

    if (displayVariant === "boolean") {
      const isTrue = Boolean(val)
      return (
        <div className="dy-flex dy-items-center dy-gap-1.5">
          <span
            className={cn(
              "dy-inline-flex dy-h-2 dy-w-2 dy-rounded-full",
              isTrue ? "dy-bg-emerald-500" : "dy-bg-rose-500",
            )}
          />
          <span className="dy-text-sm dy-font-medium dy-text-foreground">{isTrue ? "Yes" : "No"}</span>
        </div>
      )
    }

    if (displayVariant === "link" || displayVariant === "url") {
      if (!val) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      const href = String(val)
      return (
        <a
          href={href.startsWith("http") ? href : `https://${href}`}
          target="_blank"
          rel="noopener noreferrer"
          className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-sm dy-font-medium dy-text-primary hover:dy-underline"
        >
          <span>{href}</span>
          <ExternalLink className="dy-h-3.5 dy-w-3.5" />
        </a>
      )
    }

    if (displayVariant === "email") {
      if (!val) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <a
          href={`mailto:${String(val)}`}
          className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-sm dy-text-primary hover:dy-underline"
        >
          <Mail className="dy-h-3.5 dy-w-3.5" />
          <span>{String(val)}</span>
        </a>
      )
    }

    if (displayVariant === "phone") {
      if (!val) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <a
          href={`tel:${String(val)}`}
          className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-sm dy-text-primary hover:dy-underline"
        >
          <Phone className="dy-h-3.5 dy-w-3.5" />
          <span>{String(val)}</span>
        </a>
      )
    }

    if (displayVariant === "image" || displayVariant === "avatar") {
      const src = typeof val === "object" ? val?.url || val?.src : val
      if (!src) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <div
          className={cn(
            "dy-overflow-hidden dy-bg-muted/30 dy-border dy-border-border/60",
            displayVariant === "avatar"
              ? "dy-h-12 dy-w-12 dy-rounded-full"
              : "dy-h-24 dy-w-36 dy-rounded-xl",
          )}
        >
          <img
            src={src}
            alt={label || "Image"}
            className="dy-h-full dy-w-full dy-object-cover"
          />
        </div>
      )
    }

    if (displayVariant === "color") {
      if (!val) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <div className="dy-flex dy-items-center dy-gap-2">
          <div
            className="dy-h-6 dy-w-6 dy-rounded-md dy-border dy-border-border/80 dy-shadow-inner"
            style={{ backgroundColor: String(val) }}
          />
          <span className="dy-font-mono dy-text-xs dy-text-foreground">{String(val)}</span>
        </div>
      )
    }

    if (displayVariant === "color-swatches") {
      const swatches = Array.isArray(val) ? val : [val]
      if (swatches.length === 0) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <div className="dy-flex dy-flex-wrap dy-gap-2">
          {swatches.map((color, i) => (
            <div
              key={i}
              className="dy-h-7 dy-w-7 dy-rounded-lg dy-border dy-border-border/80 dy-shadow-sm hover:dy-scale-110 dy-transition-transform"
              style={{ backgroundColor: String(color) }}
              title={String(color)}
            />
          ))}
        </div>
      )
    }

    // 2. Media / Image Handling (Uploads or Upload Relationships)
    if (isMediaValue(val, fieldDef, schemas)) {
      if (Array.isArray(val)) {
        if (val.length === 0) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
        return (
          <div className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 dy-gap-3">
            {val.map((item, idx) => renderSingleMediaItem(item, idx))}
          </div>
        )
      }
      return renderSingleMediaItem(val)
    }

    // 3. Key-Value 2-Column Table Display for Objects/JSON maps
    if (displayVariant === "key-value" || (typeof val === "object" && val !== null && !Array.isArray(val) && !fieldDef?.type)) {
      if (typeof val !== "object" || val === null) {
        return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      }
      const entries = Object.entries(val)
      if (entries.length === 0) {
        return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      }

      const keyHeader = options?.keyLabel || "Key"
      const valHeader = options?.valueLabel || "Value"

      return (
        <div className="dy-w-full dy-border dy-border-border/60 dy-rounded-xl dy-overflow-hidden dy-bg-card">
          <table className="dy-w-full dy-text-sm dy-text-left">
            <thead className="dy-bg-muted/50 dy-text-xs dy-uppercase dy-text-muted-foreground dy-border-b dy-border-border/60">
              <tr>
                <th className="dy-px-4 dy-py-2.5 dy-font-semibold">{keyHeader}</th>
                <th className="dy-px-4 dy-py-2.5 dy-font-semibold">{valHeader}</th>
              </tr>
            </thead>
            <tbody className="dy-divide-y dy-divide-border/40">
              {entries.map(([k, v], idx) => (
                <tr key={idx} className="hover:dy-bg-muted/20 dy-transition-colors">
                  <td className="dy-px-4 dy-py-2 dy-font-medium dy-text-foreground dy-whitespace-nowrap dy-w-1/3">
                    {k}
                  </td>
                  <td className="dy-px-4 dy-py-2 dy-text-muted-foreground">
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    // 4. Default Rendering by Field Type

    if (fieldType === "richText") {
      const htmlContent = typeof val === "string" ? val : val?.html || JSON.stringify(val)
      return (
        <div
          className="dy-prose dy-prose-sm dark:dy-prose-invert dy-max-w-none dy-text-foreground/90"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      )
    }

    if (fieldType === "relationship") {
      if (Array.isArray(val)) {
        return (
          <div className="dy-flex dy-flex-wrap dy-gap-2">
            {val.map((item, i) => {
              if (item && typeof item === "object" && item.id) {
                const title = item.title || item.name || item.slug || item.id
                const targetSlug = fieldDef.relationTo
                return (
                  <Link
                    key={i}
                    to={`/collections/${targetSlug}/${item.id}`}
                    className="dy-inline-flex dy-items-center dy-gap-1 dy-text-xs dy-font-medium dy-bg-primary/10 dy-text-primary hover:dy-bg-primary/20 dy-rounded-md dy-px-2.5 dy-py-1 dy-transition-colors"
                  >
                    <span>{title}</span>
                    <ExternalLink className="dy-h-3 dy-w-3" />
                  </Link>
                )
              }
              return (
                <span key={i} className="dy-text-xs dy-text-muted-foreground">
                  {String(item)}
                </span>
              )
            })}
          </div>
        )
      }

      if (val && typeof val === "object" && val.id) {
        const title = val.title || val.name || val.slug || val.id
        const targetSlug = fieldDef?.relationTo
        if (targetSlug) {
          return (
            <Link
              to={`/collections/${targetSlug}/${val.id}`}
              className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-sm dy-font-medium dy-text-primary hover:dy-underline"
            >
              <span>{title}</span>
              <ExternalLink className="dy-h-3.5 dy-w-3.5" />
            </Link>
          )
        }
      }
    }

    if (fieldType === "join") {
      const docs = Array.isArray(val) ? val : val?.docs || []
      if (docs.length === 0) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <div className="dy-space-y-1.5">
          {docs.map((d: any, idx: number) => (
            <div key={idx} className="dy-text-sm dy-text-foreground">
              {d.title || d.name || d.id || JSON.stringify(d)}
            </div>
          ))}
        </div>
      )
    }

    if (fieldType === "json") {
      if (val == null) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <pre className="dy-bg-muted/40 dy-p-3 dy-rounded-xl dy-text-xs dy-font-mono dy-text-foreground dy-overflow-x-auto dy-max-h-60">
          {JSON.stringify(val, null, 2)}
        </pre>
      )
    }

    if (fieldType === "select" || fieldType === "radio" || Array.isArray(fieldDef?.options)) {
      if (val == null || val === "") return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      const selectLabel = resolveOptionLabel(val, fieldDef?.options)

      if (options?.badgeColors || fieldDef?.admin?.format?.type === "badge" || fieldDef?.format?.type === "badge") {
        const presentation = resolveBadgePresentation({
          value: val,
          badgeText: selectLabel ? String(selectLabel) : undefined,
          badgeColors: options?.badgeColors,
          fieldDef,
          defaultVariant: "secondary",
          baseClassName: "dy-font-medium dy-text-xs",
        })
        return (
          <Badge
            variant={presentation.variant}
            className={presentation.className}
            style={presentation.style}
          >
            {selectLabel || placeholder}
          </Badge>
        )
      }
      return <span className="dy-text-sm dy-font-medium dy-text-foreground">{selectLabel || placeholder}</span>
    }

    if (fieldType === "boolean") {
      return (
        <div className="dy-flex dy-items-center dy-gap-1.5">
          {val ? (
            <Check className="dy-h-4 dy-w-4 dy-text-emerald-600" />
          ) : (
            <span className="dy-text-muted-foreground/60">-</span>
          )}
          <span className="dy-text-sm dy-font-medium dy-text-foreground">{val ? "Yes" : "No"}</span>
        </div>
      )
    }

    if (fieldType === "upload") {
      const uploadDoc = val
      const url = typeof uploadDoc === "object" ? uploadDoc?.url : uploadDoc
      if (!url) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return renderSingleMediaItem(uploadDoc)
    }

    if (
      fieldType === "blocks" ||
      fieldDef?.type === "blocks" ||
      (Array.isArray(val) && val.some((v: any) => v && typeof v === "object" && "blockType" in v))
    ) {
      const blocks = Array.isArray(val) ? val : []
      if (blocks.length === 0) return <span className="dy-text-muted-foreground/60">{placeholder}</span>

      return (
        <div className="dy-space-y-3 dy-w-full">
          {blocks.map((block: any, idx: number) => {
            const blockType = block?.blockType || `Block ${idx + 1}`
            const blockDef = fieldDef?.blocks?.find?.((b: any) => b.slug === block?.blockType)
            const blockLabel = blockDef?.labels?.singular || blockDef?.label || blockType
            const BlockIcon = blockDef?.admin?.icon ? resolveAdminIcon(blockDef.admin.icon, Layers) : Layers

            const entries = Object.entries(block).filter(
              ([k]) => k !== "blockType" && k !== "id" && k !== "_meta" && block[k] != null && block[k] !== "",
            )

            return (
              <div
                key={block?.id || idx}
                className="dy-p-4 dy-bg-muted/15 dy-border dy-border-border/60 dy-rounded-xl dy-space-y-3"
              >
                <div className="dy-flex dy-items-center dy-justify-between">
                  <div className="dy-flex dy-items-center dy-gap-2">
                    <div className="dy-p-1.5 dy-rounded-md dy-bg-primary/10 dy-text-primary">
                      {React.createElement(BlockIcon, { className: "dy-h-4 dy-w-4" })}
                    </div>
                    <span className="dy-text-sm dy-font-semibold dy-text-foreground">{blockLabel}</span>
                  </div>
                  <Badge variant="outline" className="dy-text-xs dy-font-mono">
                    #{idx + 1}
                  </Badge>
                </div>

                {entries.length > 0 && (
                  <div className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 md:dy-grid-cols-3 dy-gap-3 dy-pt-2 dy-border-t dy-border-border/40">
                    {entries.map(([key, itemVal]) => {
                      const fieldSchema = blockDef?.fields?.find?.((f: any) => f.name === key)
                      const fieldLabel = fieldSchema?.label || key

                      let renderedVal = ""
                      if (typeof itemVal === "object") {
                        if (Array.isArray(itemVal)) {
                          renderedVal = `${itemVal.length} item${itemVal.length === 1 ? "" : "s"}`
                        } else {
                          renderedVal =
                            Object.values(itemVal)
                              .filter((v) => typeof v === "string" || typeof v === "number")
                              .join(" - ") || JSON.stringify(itemVal)
                        }
                      } else {
                        renderedVal = String(itemVal)
                      }

                      return (
                        <div key={key} className="dy-space-y-0.5">
                          <span className="dy-text-[11px] dy-font-medium dy-uppercase dy-tracking-wider dy-text-muted-foreground/80">
                            {fieldLabel}
                          </span>
                          <p className="dy-text-xs dy-text-foreground dy-line-clamp-2">{renderedVal}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    if (val === null || val === undefined || val === "") {
      return <span className="dy-text-muted-foreground/60">{placeholder}</span>
    }

    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <ul className="dy-space-y-1.5 dy-text-sm dy-text-foreground">
          {val.map((item: any, idx: number) => {
            let itemText = ""
            if (item == null) {
              itemText = "-"
            } else if (typeof item === "object") {
              itemText =
                item.benefit ||
                item.title ||
                item.label ||
                item.name ||
                item.text ||
                item.value ||
                Object.values(item)
                  .filter((v) => typeof v === "string" || typeof v === "number")
                  .join(" - ") ||
                JSON.stringify(item)
            } else {
              itemText = String(item)
            }
            return (
              <li key={idx} className="dy-flex dy-items-start dy-gap-2">
                <span className="dy-inline-block dy-h-1.5 dy-w-1.5 dy-rounded-full dy-bg-primary/60 dy-mt-2 dy-shrink-0" />
                <span className="dy-flex-1 dy-leading-relaxed">{itemText}</span>
              </li>
            )
          })}
        </ul>
      )
    }

    if (typeof val === "object") {
      const entries = Object.entries(val).filter(
        ([k, v]) => k !== "_meta" && k !== "id" && v !== undefined && v !== null && v !== "",
      )
      if (entries.length === 0) return <span className="dy-text-muted-foreground/60">{placeholder}</span>

      return (
        <div className="dy-space-y-1.5 dy-text-xs">
          {entries.map(([k, v]) => (
            <div key={k} className="dy-flex dy-items-baseline dy-gap-2">
              <span className="dy-font-semibold dy-text-muted-foreground dy-capitalize">{k}:</span>
              <span className="dy-text-foreground">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
      )
    }

    return <span className="dy-text-sm dy-font-medium dy-text-foreground">{String(val)}</span>
  }

  return (
    <div className="dy-space-y-1.5 dy-group/field dy-relative">
      {label && (
        <div className="dy-flex dy-items-center dy-justify-between dy-gap-2">
          <div className="dy-flex dy-items-center dy-gap-1.5">
            <span className="dy-text-xs dy-font-medium dy-text-muted-foreground/80 dy-tracking-wide">
              {label}
            </span>
            {options?.editable && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  setDraftValue(value)
                  setIsEditing(true)
                }}
                className="dy-opacity-0 group-hover/field:dy-opacity-100 focus:dy-opacity-100 dy-text-muted-foreground/70 hover:dy-text-foreground dy-p-0.5 dy-rounded dy-transition-all"
                title={`Edit ${label}`}
                aria-label={`Edit ${label}`}
              >
                <Pencil className="dy-h-3 dy-w-3" />
              </button>
            )}
          </div>
        </div>
      )}
      {description && <p className="dy-text-xs dy-text-muted-foreground/70">{description}</p>}

      {isEditing ? (
        <div className="dy-space-y-2 dy-p-3 dy-bg-muted/30 dy-border dy-border-border dy-rounded-xl dy-shadow-sm">
          {renderEditorInput()}
          <div className="dy-flex dy-items-center dy-justify-end dy-gap-1.5 dy-pt-1">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsEditing(false)
              }}
              className="dy-px-2.5 dy-py-1 dy-rounded-lg dy-text-xs dy-font-medium dy-text-muted-foreground hover:dy-bg-muted/80 dy-transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="dy-px-3 dy-py-1 dy-rounded-lg dy-text-xs dy-font-medium dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary/90 dy-transition-colors dy-flex dy-items-center dy-gap-1.5"
            >
              {isSaving ? <Loader2 className="dy-h-3 dy-w-3 dy-animate-spin" /> : <Check className="dy-h-3 dy-w-3" />}
              <span>Save</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="dy-pt-0.5">{renderValue()}</div>
      )}
    </div>
  )
}
