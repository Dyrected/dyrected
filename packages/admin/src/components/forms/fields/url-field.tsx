/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react"
import { useDyrected } from "../../../providers/dyrected-context"
import { Input } from "../../ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../../ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover"
import { Check, ExternalLink } from "lucide-react"
import { getLinkSpec } from "../../../lib/format"
import { cn, getSiteUrl } from "../../../lib/utils"
import type { Field as FieldSchema, UrlField as UrlFieldSchema } from "@dyrected/sdk"
import { interpolateUrlPattern } from "../../../lib/url-pattern"
import jexl from "jexl"

interface UrlFieldProps {
  schema: FieldSchema
  field: any
  disabled?: boolean
  context?: { user: any, schemas?: any, siblingData: any }
}

const parseValue = (val: any, siteUrl: string): { type: "custom" | "internal", url: string, relationTo?: string, value?: string, label?: string } => {
  if (!val) return { type: "custom", url: "" }

  if (typeof val === "string") {
    let url = val
    if (url.startsWith("/")) {
      url = `${siteUrl}${url}`
    }
    return { type: "custom", url }
  }

  if (typeof val === "object") {
    let url = val.url || ""
    if (url.startsWith("/")) {
      url = `${siteUrl}${url}`
    }
    return {
      type: val.type === "internal" ? "internal" : "custom",
      url,
      relationTo: val.relationTo,
      value: val.value,
      label: val.label,
    }
  }

  return { type: "custom", url: String(val) }
}

export function UrlField({ schema, field, disabled }: UrlFieldProps) {
  const { client, schemas } = useDyrected()
  const siteUrl = React.useMemo(() => getSiteUrl(schemas?.admin?.siteUrl), [schemas?.admin?.siteUrl])
  const [openPopover, setOpenPopover] = React.useState(false)
  const [documents, setDocuments] = React.useState<any[]>([])
  const [docsLoading, setDocsLoading] = React.useState(false)

  const currentData = parseValue(field.value, siteUrl)
  const [urlValue, setUrlValue] = React.useState(currentData.url)
  const [labelValue, setLabelValue] = React.useState(currentData.label || "")
  const [collectionValue, setCollectionValue] = React.useState(currentData.relationTo || "")
  const [docValue, setDocValue] = React.useState(currentData.value || "")

  // Synchronize internal state with changes in field.value (e.g. on load / async populate)
  React.useEffect(() => {
    const next = parseValue(field.value, siteUrl)
    Promise.resolve().then(() => {
      setUrlValue((prev) => prev === next.url ? prev : next.url)
      setLabelValue((prev) => prev === next.label ? prev : (next.label || ""))
      setCollectionValue((prev) => prev === next.relationTo ? prev : (next.relationTo || ""))
      setDocValue((prev) => prev === next.value ? prev : (next.value || ""))
    })
  }, [field.value, siteUrl])


  // Get all available collections from schemas
  const collections = React.useMemo(() => schemas?.collections || [], [schemas?.collections])

  // Load documents for all collections that have a previewUrl
  React.useEffect(() => {
    if (!client || !schemas?.collections) return

    const eligibleCollections = collections.filter((c: any) => c.admin?.previewUrl)
    if (eligibleCollections.length === 0) return

    let active = true

    // Defer state update slightly to avoid synchronous setState inside render/effect loop warning
    Promise.resolve().then(() => {
      if (!active) return
      setDocsLoading(true)
      setDocuments([])
    })

    Promise.all(
      eligibleCollections.map((col: any) =>
        client
          .collection(col.slug)
          .find({ limit: 50 })
          .exec()
          .then((res: any) => ({
            collection: col,
            docs: res.docs || [],
          }))
          .catch((err: any) => {
            console.error(`Failed to load documents for ${col.slug}:`, err)
            return { collection: col, docs: [] }
          })
      )
    )
      .then((results) => {
        if (!active) return
        const allDocs = results.flatMap((r) =>
          r.docs.map((doc: any) => ({
            ...doc,
            __collectionSlug: r.collection.slug,
            __collectionLabel: r.collection.labels?.plural || r.collection.slug,
            __previewUrl: r.collection.admin?.previewUrl,
          }))
        )
        setDocuments(allDocs)
      })
      .catch((err) => {
        console.error("Failed to load documents:", err)
      })
      .finally(() => {
        if (active) {
          setDocsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [client, schemas, collections])

  const handleUpdate = (url: string, label: string, relationTo?: string, docId?: string) => {
    const isInternal = !!(relationTo && docId)
    let cleanedUrl = url
    if (isInternal && cleanedUrl.startsWith(siteUrl)) {
      cleanedUrl = cleanedUrl.substring(siteUrl.length)
    }
    const newValue = {
      type: isInternal ? "internal" : "custom",
      url: cleanedUrl || undefined,
      relationTo: isInternal ? relationTo : undefined,
      value: isInternal ? docId : undefined,
      label: label || undefined,
    }
    field.onChange(newValue)
  }

  const handleUrlInputChange = (value: string) => {
    setUrlValue(value)
    setCollectionValue("")
    setDocValue("")
    handleUpdate(value, labelValue)
  }

  const handleLabelInputChange = (value: string) => {
    setLabelValue(value)
    handleUpdate(urlValue, value, collectionValue, docValue)
  }

  const handleDocumentSelect = (doc: any) => {
    setDocValue(doc.id)
    setCollectionValue(doc.__collectionSlug)
    setOpenPopover(false)
    const urlPattern = doc.__previewUrl
    let resolvedUrl: string | undefined = undefined

    if (urlPattern) {
      if (typeof urlPattern === "function") {
        resolvedUrl = urlPattern(doc, { locale: "en" })
      } else if (typeof urlPattern === "string") {
        if (urlPattern.includes("{{")) {
          resolvedUrl = urlPattern.replace(/{{(.*?)}}/g, (_, key) => String(doc[key.trim()] || ""))
        } else {
          try {
            const context = { ...doc, siteUrl }
            if (urlPattern.includes("+") || urlPattern.includes("?") || urlPattern.includes("==") || urlPattern.includes("siteUrl")) {
              resolvedUrl = jexl.evalSync(urlPattern, context)
            } else {
              resolvedUrl = interpolateUrlPattern(urlPattern, doc)
            }
          } catch {
            resolvedUrl = interpolateUrlPattern(urlPattern, doc)
          }
        }
      }
    }

    if (typeof resolvedUrl === "string" && resolvedUrl.startsWith("/")) {
      resolvedUrl = `${siteUrl}${resolvedUrl}`
    }

    const finalUrl = resolvedUrl || ""
    setUrlValue(finalUrl)
    handleUpdate(finalUrl, labelValue, doc.__collectionSlug, doc.id)
  }

  // Get display field from collection schema
  const getCollectionDisplayField = React.useCallback((collectionSlug: string): string => {
    const col = collections.find((c: any) => c.slug === collectionSlug)
    return col?.admin?.useAsTitle || "title"
  }, [collections])

  // Get document display value
  const getDocumentDisplay = React.useCallback((doc: any, collectionSlug: string): string => {
    const displayField = getCollectionDisplayField(collectionSlug)
    return doc[displayField] || doc.name || doc.slug || doc.id
  }, [getCollectionDisplayField])

  const filteredDocs = React.useMemo(() => {
    if (!urlValue) return documents
    const query = urlValue.toLowerCase()
    return documents.filter((doc) => {
      const display = getDocumentDisplay(doc, doc.__collectionSlug).toLowerCase()
      const slug = String(doc.slug || "").toLowerCase()
      return display.includes(query) || slug.includes(query)
    })
  }, [documents, urlValue, getDocumentDisplay])

  const selectedDoc = documents.find((d: any) => d.id === docValue && d.__collectionSlug === collectionValue)
  const selectedCollectionLabel = collections.find((c: any) => c.slug === collectionValue)?.labels?.singular || collectionValue
  const linkSpec = getLinkSpec(urlValue, (schema as UrlFieldSchema).admin?.format, "url")

  return (
    <div className="dy-gap-3 dy-w-full dy-flex dy-flex-col md:dy-flex-row md:dy-justify-between">
      <div className="md:dy-w-2/3">

        <span className="dy-text-xs dy-font-semibold dy-text-muted-foreground dy-uppercase dy-tracking-wider dy-block dy-mb-2">
          Link
        </span>
        <div className="dy-flex dy-items-stretch dy-gap-2">
          <Popover open={openPopover && !disabled} onOpenChange={setOpenPopover}>
            <PopoverTrigger asChild>
              <div className="dy-w-full">
                <Input
                  id={field.id}
                  type="text"
                  value={urlValue}
                  onChange={(e) => handleUrlInputChange(e.target.value)}
                  onFocus={() => setOpenPopover(true)}
                  placeholder="Type or paste a URL, or search pages..."
                  disabled={disabled}
                  className="dy-bg-background dy-border-border/50 dy-h-11 dy-w-full"
                />
              </div>
            </PopoverTrigger>
            <PopoverContent
              className="dy-p-0 dy-w-[var(--radix-popover-trigger-width)] dy-max-h-60 dy-overflow-y-auto"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command className="dy-border-none" shouldFilter={false}>
                <CommandList>
                  <CommandEmpty className="dy-py-2.5 dy-px-3 dy-text-xs dy-text-muted-foreground">
                    {docsLoading ? "Loading pages..." : "No matching pages found. Press Enter to use as custom link."}
                  </CommandEmpty>

                  {urlValue && (
                    <CommandGroup heading="Custom Link">
                      <CommandItem
                        value={`custom-${urlValue}`}
                        onSelect={() => {
                          handleUrlInputChange(urlValue)
                          setOpenPopover(false)
                        }}
                        className="dy-text-primary"
                      >
                        Use link "{urlValue}"
                      </CommandItem>
                    </CommandGroup>
                  )}

                  {(() => {
                    const grouped: Record<string, any[]> = {}
                    filteredDocs.forEach((doc: any) => {
                      const key = doc.__collectionLabel
                      if (!grouped[key]) grouped[key] = []
                      grouped[key].push(doc)
                    })

                    return Object.entries(grouped).map(([groupName, docs]) => (
                      <CommandGroup key={groupName} heading={groupName}>
                        {docs.map((doc: any) => (
                          <CommandItem
                            key={`${doc.__collectionSlug}-${doc.id}`}
                            value={`${doc.__collectionSlug}-${doc.id}-${getDocumentDisplay(doc, doc.__collectionSlug)}`}
                            onSelect={() => handleDocumentSelect(doc)}
                          >
                            <Check
                              className={cn(
                                "dy-mr-2 dy-h-4 dy-w-4",
                                docValue === doc.id && collectionValue === doc.__collectionSlug ? "dy-opacity-100" : "dy-opacity-0"
                              )}
                            />
                            <span className="dy-flex-1">
                              {getDocumentDisplay(doc, doc.__collectionSlug)}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))
                  })()}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {linkSpec && (
            <a
              href={linkSpec.href}
              target={linkSpec.newTab ? "_blank" : undefined}
              rel={linkSpec.newTab ? "noreferrer" : undefined}
              aria-disabled={disabled ? true : undefined}
              className={cn(
                "dy-inline-flex dy-h-11 dy-w-11 dy-items-center dy-justify-center dy-rounded-xl dy-border dy-border-border/50 dy-bg-background dy-text-muted-foreground dy-shadow-sm dy-transition-all hover:dy-bg-muted hover:dy-text-foreground",
                disabled && "dy-pointer-events-none dy-opacity-50"
              )}
              title="Open link"
            >
              <ExternalLink className="dy-h-4 dy-w-4" />
            </a>
          )}
        </div>

        {selectedDoc && (
          <p className="dy-text-[11px] dy-text-muted-foreground dy-mt-1.5">
            Linked to internal page: <span className="dy-font-medium dy-text-foreground">{selectedCollectionLabel}: {getDocumentDisplay(selectedDoc, collectionValue)}</span>
          </p>
        )}
      </div>

      <div className="md:dy-w-1/3">
        <span className="dy-text-xs dy-font-semibold dy-text-muted-foreground dy-uppercase dy-tracking-wider dy-block dy-mb-2">
          Label (Optional)
        </span>
        <Input
          type="text"
          value={labelValue}
          onChange={(e) => handleLabelInputChange(e.target.value)}
          placeholder="e.g., Learn More"
          disabled={disabled}
          className="dy-bg-background dy-border-border/50"
        />
      </div>
    </div>
  )
}
