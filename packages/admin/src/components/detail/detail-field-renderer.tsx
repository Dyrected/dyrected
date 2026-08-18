/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react"
import { Link } from "react-router-dom"
import {
  Copy,
  ExternalLink,
  Mail,
  Phone,
  Check,
  Star,
  Download,
  Folder,
  Layers,
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
import type { DisplayFieldOptions, DisplayVariant } from "@dyrected/core"

export interface DetailFieldRendererProps {
  fieldDef?: any
  value: any
  doc: any
  options?: DisplayFieldOptions
  client?: any
  schemas?: any
}

function humanizeLabel(fieldName: string): string {
  if (!fieldName) return ""
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_.]/g, " ")
    .trim()
    .replace(/^./, (str) => str.toUpperCase())
}

export function DetailFieldRenderer({
  fieldDef,
  value,
  doc: _doc,
  options,
  client: _client,
  schemas: _schemas,
}: DetailFieldRendererProps) {
  const displayVariant: DisplayVariant | undefined = options?.display

  const hideLabel = options?.hideLabel === true || (options as any)?.label === false || (options as any)?.label === ""
  const label = hideLabel ? null : ((options as any)?.label ?? fieldDef?.label ?? (fieldDef?.name ? humanizeLabel(fieldDef.name) : ""))
  const description = (options as any)?.description ?? fieldDef?.description
  const placeholder = (options as any)?.placeholder ?? "-"

  const renderValue = () => {
    // 1. Explicit Display Variant Handling
    if (displayVariant === "copyable") {
      const text = value != null ? String(value) : ""
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
      const num = Number(value)
      if (Number.isNaN(num) || value == null) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <span className="dy-font-semibold dy-tabular-nums dy-text-foreground">
          {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num)}
        </span>
      )
    }

    if (displayVariant === "percent") {
      const num = Number(value)
      if (Number.isNaN(num) || value == null) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <span className="dy-font-semibold dy-tabular-nums dy-text-foreground">
          {formatNumber(num, { type: "percent", scale: false } as any)}
        </span>
      )
    }

    if (displayVariant === "badge") {
      if (value == null || value === "") return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      const badgeText = typeof value === "object" ? resolveDocumentTitle({ entry: value, collection: fieldDef }) : String(value)
      return (
        <Badge variant="secondary" className="dy-font-medium dy-text-xs">
          {badgeText}
        </Badge>
      )
    }

    if (displayVariant === "badges" || displayVariant === "tags") {
      const list = Array.isArray(value) ? value : value ? [value] : []
      if (list.length === 0) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <div className="dy-flex dy-flex-wrap dy-gap-1.5">
          {list.map((item, idx) => {
            const itemText = typeof item === "object" ? resolveDocumentTitle({ entry: item, collection: fieldDef }) : String(item)
            return (
              <Badge key={idx} variant="outline" className="dy-text-xs dy-font-normal">
                {itemText}
              </Badge>
            )
          })}
        </div>
      )
    }

    if (displayVariant === "star") {
      const num = Number(value) || 0
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
                  : "dy-fill-muted dy-text-muted-foreground/30",
              )}
            />
          ))}
          <span className="dy-text-xs dy-text-muted-foreground dy-ml-1.5 dy-tabular-nums">
            {ratingSpec.value}/{ratingSpec.max}
          </span>
        </div>
      )
    }

    if (displayVariant === "progress") {
      const num = Math.min(100, Math.max(0, Number(value) || 0))
      return (
        <div className="dy-flex dy-items-center dy-gap-3 dy-w-full dy-max-w-xs">
          <div className="dy-w-full dy-bg-muted dy-h-2 dy-rounded-full dy-overflow-hidden">
            <div
              className="dy-bg-primary dy-h-full dy-rounded-full dy-transition-all"
              style={{ width: `${num}%` }}
            />
          </div>
          <span className="dy-text-xs dy-font-medium dy-tabular-nums dy-text-muted-foreground">
            {num}%
          </span>
        </div>
      )
    }

    if (displayVariant === "boolean") {
      return (
        <Badge
          variant={value ? "default" : "secondary"}
          className="dy-text-xs"
        >
          {value ? "Yes" : "No"}
        </Badge>
      )
    }

    if (displayVariant === "date" || displayVariant === "datetime" || displayVariant === "time" || displayVariant === "relative") {
      const dateType: "date" | "datetime" | "time" = displayVariant === "relative" ? "date" : displayVariant
      const formatted = formatDate(value, displayVariant === "relative" ? "relative" : undefined, dateType)
      return <span className="dy-text-sm dy-text-foreground">{formatted || placeholder}</span>
    }

    if (displayVariant === "url") {
      if (!value) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-sm dy-text-primary hover:dy-underline"
        >
          <span className="dy-truncate dy-max-w-xs">{String(value)}</span>
          <ExternalLink className="dy-h-3.5 dy-w-3.5" />
        </a>
      )
    }

    if (displayVariant === "email") {
      if (!value) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <a
          href={`mailto:${String(value)}`}
          className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-sm dy-text-primary hover:dy-underline"
        >
          <Mail className="dy-h-3.5 dy-w-3.5" />
          <span>{String(value)}</span>
        </a>
      )
    }

    if (displayVariant === "phone") {
      if (!value) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <a
          href={`tel:${String(value)}`}
          className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-sm dy-text-primary hover:dy-underline"
        >
          <Phone className="dy-h-3.5 dy-w-3.5" />
          <span>{String(value)}</span>
        </a>
      )
    }

    if (displayVariant === "image" || displayVariant === "avatar") {
      const src = typeof value === "object" ? value?.url || value?.src : value
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
            alt={label}
            className="dy-h-full dy-w-full dy-object-cover"
          />
        </div>
      )
    }

    if (displayVariant === "color") {
      if (!value) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <div className="dy-flex dy-items-center dy-gap-2">
          <div
            className="dy-h-6 dy-w-6 dy-rounded-md dy-border dy-border-border/80 dy-shadow-inner"
            style={{ backgroundColor: String(value) }}
          />
          <span className="dy-font-mono dy-text-xs dy-text-foreground">{String(value)}</span>
        </div>
      )
    }

    if (displayVariant === "color-swatches") {
      const swatches = Array.isArray(value) ? value : [value]
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

    // 2. Key-Value 2-Column Table Display for Objects/JSON maps
    if (displayVariant === "key-value" || (typeof value === "object" && value !== null && !Array.isArray(value) && !fieldDef?.type)) {
      if (typeof value !== "object" || value === null) {
        return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      }
      const entries = Object.entries(value)
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

    // 3. Default Rendering by Field Type
    const fieldType = fieldDef?.type

    if (fieldType === "richText") {
      const htmlContent = typeof value === "string" ? value : value?.html || JSON.stringify(value)
      return (
        <div
          className="dy-prose dy-prose-sm dark:dy-prose-invert dy-max-w-none dy-text-foreground/90"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      )
    }

    if (fieldType === "relationship") {
      if (Array.isArray(value)) {
        return (
          <div className="dy-flex dy-flex-wrap dy-gap-2">
            {value.map((item, i) => {
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

      if (value && typeof value === "object" && value.id) {
        const title = value.title || value.name || value.slug || value.id
        const targetSlug = fieldDef?.relationTo
        if (targetSlug) {
          return (
            <Link
              to={`/collections/${targetSlug}/${value.id}`}
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
      const docs = Array.isArray(value) ? value : value?.docs || []
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
      if (value == null) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <pre className="dy-bg-muted/40 dy-p-3 dy-rounded-xl dy-text-xs dy-font-mono dy-text-foreground dy-overflow-x-auto dy-max-h-60">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }

    if (fieldType === "select") {
      const option = fieldDef?.options?.find?.((opt: any) =>
        (typeof opt === "object" ? opt.value : opt) === value,
      )
      const selectLabel = typeof option === "object" ? option.label : option || value
      return <span className="dy-text-sm dy-font-medium dy-text-foreground">{selectLabel ?? placeholder}</span>
    }

    if (fieldType === "boolean") {
      return (
        <div className="dy-flex dy-items-center dy-gap-1.5">
          {value ? (
            <Check className="dy-h-4 dy-w-4 dy-text-emerald-600" />
          ) : (
            <span className="dy-text-muted-foreground/60">-</span>
          )}
          <span className="dy-text-sm dy-font-medium dy-text-foreground">{value ? "Yes" : "No"}</span>
        </div>
      )
    }

    if (fieldType === "upload") {
      const uploadDoc = value
      const url = typeof uploadDoc === "object" ? uploadDoc?.url : uploadDoc
      if (!url) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-sm dy-font-medium dy-text-primary hover:dy-underline"
        >
          <Download className="dy-h-4 dy-w-4" />
          <span>Download Attachment</span>
        </a>
      )
    }

    if (
      fieldType === "blocks" ||
      fieldDef?.type === "blocks" ||
      (Array.isArray(value) && value.some((v: any) => v && typeof v === "object" && "blockType" in v))
    ) {
      const blocks = Array.isArray(value) ? value : []
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
                    {entries.map(([key, val]) => {
                      const fieldSchema = blockDef?.fields?.find?.((f: any) => f.name === key)
                      const fieldLabel = fieldSchema?.label || key

                      let renderedVal = ""
                      if (typeof val === "object") {
                        if (Array.isArray(val)) {
                          renderedVal = `${val.length} item${val.length === 1 ? "" : "s"}`
                        } else {
                          renderedVal =
                            Object.values(val)
                              .filter((v) => typeof v === "string" || typeof v === "number")
                              .join(" - ") || JSON.stringify(val)
                        }
                      } else {
                        renderedVal = String(val)
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

    if (value === null || value === undefined || value === "") {
      return <span className="dy-text-muted-foreground/60">{placeholder}</span>
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="dy-text-muted-foreground/60">{placeholder}</span>
      return (
        <ul className="dy-space-y-1.5 dy-text-sm dy-text-foreground">
          {value.map((item: any, idx: number) => {
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

    if (typeof value === "object") {
      const entries = Object.entries(value).filter(
        ([k, v]) => k !== "_meta" && k !== "id" && v !== undefined && v !== null && v !== "",
      )
      if (entries.length === 0) return <span className="dy-text-muted-foreground/60">{placeholder}</span>

      return (
        <div className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 dy-gap-3 dy-p-3 dy-bg-muted/15 dy-border dy-border-border/60 dy-rounded-xl dy-w-full">
          {entries.map(([subKey, subVal]) => {
            const subFieldDef = fieldDef?.fields?.find?.((f: any) => f.name === subKey)
            const subLabel = subFieldDef?.label || subKey

            let displayVal = ""
            if (typeof subVal === "object") {
              if (Array.isArray(subVal)) {
                displayVal = `${subVal.length} item${subVal.length === 1 ? "" : "s"}`
              } else {
                displayVal =
                  Object.values(subVal)
                    .filter((v) => typeof v === "string" || typeof v === "number")
                    .join(" - ") || JSON.stringify(subVal)
              }
            } else {
              displayVal = String(subVal)
            }

            return (
              <div key={subKey} className="dy-space-y-0.5">
                <span className="dy-text-[11px] dy-font-medium dy-uppercase dy-tracking-wider dy-text-muted-foreground/80">
                  {subLabel}
                </span>
                <p className="dy-text-xs dy-text-foreground dy-leading-relaxed dy-break-words">
                  {displayVal}
                </p>
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <span className="dy-text-sm dy-text-foreground dy-leading-relaxed">
        {String(value)}
      </span>
    )
  }

  const PrefixIcon = (options as any)?.prefix ? resolveAdminIcon((options as any).prefix, Folder) : null
  const SuffixIcon = (options as any)?.suffix ? resolveAdminIcon((options as any).suffix, Folder) : null

  return (
    <div className="dy-space-y-1.5 dy-w-full">
      {label && (
        <label className="dy-text-xs dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground/80">
          {label}
        </label>
      )}
      <div className="dy-flex dy-items-center dy-gap-2">
        {PrefixIcon && React.createElement(PrefixIcon, { className: "dy-h-4 dy-w-4 dy-text-muted-foreground" })}
        <div className="dy-flex-1 dy-min-w-0">{renderValue()}</div>
        {SuffixIcon && React.createElement(SuffixIcon, { className: "dy-h-4 dy-w-4 dy-text-muted-foreground" })}
      </div>
      {description && (
        <p className="dy-text-xs dy-text-muted-foreground/70">{description}</p>
      )}
    </div>
  )
}
