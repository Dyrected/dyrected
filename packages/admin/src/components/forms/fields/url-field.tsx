import * as React from "react"
import { useDyrected } from "../../../providers/dyrected-provider"
import { Input } from "../../ui/input"
import { Button } from "../../ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../ui/tabs"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "../../../lib/utils"
import type { Field as FieldSchema } from "@dyrected/sdk"

interface UrlValue {
  type: "custom" | "internal"
  url?: string
  relationTo?: string
  value?: string
  label?: string
}

interface UrlFieldProps {
  schema: FieldSchema
  field: any
  disabled?: boolean
  context?: { user: any, schemas?: any, siblingData: any }
}

export function UrlField({ schema, field, disabled, context: _context }: UrlFieldProps) {
  const { client, schemas } = useDyrected()
  const [openPopover, setOpenPopover] = React.useState(false)
  const [documents, setDocuments] = React.useState<any[]>([])
  const [docsLoading, setDocsLoading] = React.useState(false)

  // Parse the current value
  const parseValue = (val: any): { mode: "external" | "internal", data: UrlValue } => {
    if (!val) return { mode: "external", data: { type: "custom", url: "", label: "" } }

    if (typeof val === "string") {
      // Backward compatibility: simple strings are treated as external URLs
      return { mode: "external", data: { type: "custom", url: val, label: "" } }
    }

    if (typeof val === "object" && val.type) {
      const mode = val.type === "internal" ? "internal" : "external"
      return { mode, data: val as UrlValue }
    }

    return { mode: "external", data: { type: "custom", url: String(val), label: "" } }
  }

  const { mode: currentMode, data: currentData } = parseValue(field.value)
  const [mode, setMode] = React.useState<"external" | "internal">(currentMode)
  const [urlValue, setUrlValue] = React.useState(currentData.url || "")
  const [labelValue, setLabelValue] = React.useState(currentData.label || "")
  const [collectionValue, setCollectionValue] = React.useState(currentData.relationTo || "")
  const [docValue, setDocValue] = React.useState(currentData.value || "")
  const [docSearch, setDocSearch] = React.useState("")

  // Get all available collections from schemas
  const collections = schemas?.collections || []

  // Load documents when collection changes
  React.useEffect(() => {
    if (collectionValue && client) {
      setDocsLoading(true)
      setDocuments([])

      client
        .collection(collectionValue)
        .find({ limit: 50 })
        .exec()
        .then((res: any) => {
          setDocuments(res.docs || [])
        })
        .catch((err: any) => {
          console.error("Failed to load documents:", err)
          setDocuments([])
        })
        .finally(() => {
          setDocsLoading(false)
        })
    }
  }, [collectionValue, client])

  // Update field.value when any state changes
  const handleUpdate = (newMode: "external" | "internal", updates: Partial<UrlValue>) => {
    let newValue: any

    if (newMode === "external") {
      newValue = {
        type: "custom",
        url: updates.url || urlValue,
        label: updates.label !== undefined ? updates.label : labelValue,
      }
    } else {
      newValue = {
        type: "internal",
        url: updates.url || `/collections/${collectionValue}/${docValue}`,
        relationTo: updates.relationTo || collectionValue,
        value: updates.value || docValue,
        label: updates.label !== undefined ? updates.label : labelValue,
      }
    }

    field.onChange(newValue)
  }

  const handleModeChange = (newMode: "external" | "internal") => {
    setMode(newMode)
    if (newMode === "external") {
      setUrlValue(currentData.url || "")
      setLabelValue(currentData.label || "")
    } else {
      setCollectionValue(currentData.relationTo || "")
      setDocValue(currentData.value || "")
      setLabelValue(currentData.label || "")
    }
  }

  const handleExternalUrlChange = (value: string) => {
    setUrlValue(value)
    handleUpdate("external", { url: value })
  }

  const handleExternalLabelChange = (value: string) => {
    setLabelValue(value)
    handleUpdate("external", { label: value })
  }

  const handleCollectionChange = (value: string) => {
    setCollectionValue(value)
    setDocValue("")
  }

  const handleDocumentSelect = (docId: string) => {
    setDocValue(docId)
    setOpenPopover(false)
    handleUpdate("internal", { value: docId })
  }

  const handleInternalLabelChange = (value: string) => {
    setLabelValue(value)
    handleUpdate("internal", { label: value })
  }

  const displayLabel = schema.label || (schema?.name || '').charAt(0)?.toUpperCase() + (schema?.name || '').slice(1)

  // Get display field from collection schema
  const getCollectionDisplayField = (collectionSlug: string): string => {
    const col = collections.find((c: any) => c.slug === collectionSlug)
    return col?.admin?.useAsTitle || "title"
  }

  // Get document display value
  const getDocumentDisplay = (doc: any, collectionSlug: string): string => {
    const displayField = getCollectionDisplayField(collectionSlug)
    return doc[displayField] || doc.name || doc.slug || doc.id
  }

  const selectedDoc = documents.find((d: any) => d.id === docValue)
  const selectedCollectionLabel = collections.find((c: any) => c.slug === collectionValue)?.labels?.singular || collectionValue

  return (
    <div className="dy-space-y-3">
      <label className="dy-text-sm dy-font-medium dy-leading-none dy-peer-disabled:dy-cursor-not-allowed dy-peer-disabled:dy-opacity-70">
        {displayLabel}
      </label>

      <Tabs value={mode} onValueChange={(val) => handleModeChange(val as "external" | "internal")}>
        <TabsList className="dy-w-full dy-grid dy-grid-cols-2 dy-bg-muted dy-p-1 dy-rounded-lg dy-h-auto">
          <TabsTrigger value="external" disabled={disabled} className="dy-rounded-md">
            External Link
          </TabsTrigger>
          <TabsTrigger value="internal" disabled={disabled} className="dy-rounded-md">
            Internal Link
          </TabsTrigger>
        </TabsList>

        <TabsContent value="external" className="dy-space-y-3 dy-mt-3">
          <div>
            <label className="dy-text-xs dy-font-semibold dy-text-muted-foreground dy-uppercase dy-tracking-wider dy-block dy-mb-2">
              URL
            </label>
            <Input
              type="url"
              value={urlValue}
              onChange={(e) => handleExternalUrlChange(e.target.value)}
              placeholder="https://example.com"
              disabled={disabled}
              className="dy-bg-white dy-border-border/50"
            />
          </div>

          <div>
            <label className="dy-text-xs dy-font-semibold dy-text-muted-foreground dy-uppercase dy-tracking-wider dy-block dy-mb-2">
              Link Label (Optional)
            </label>
            <Input
              type="text"
              value={labelValue}
              onChange={(e) => handleExternalLabelChange(e.target.value)}
              placeholder="e.g., Learn More"
              disabled={disabled}
              className="dy-bg-white dy-border-border/50"
            />
          </div>
        </TabsContent>

        <TabsContent value="internal" className="dy-space-y-3 dy-mt-3">
          <div>
            <label className="dy-text-xs dy-font-semibold dy-text-muted-foreground dy-uppercase dy-tracking-wider dy-block dy-mb-2">
              Collection
            </label>
            <Select value={collectionValue} onValueChange={handleCollectionChange} disabled={disabled}>
              <SelectTrigger className="dy-bg-white dy-border-border/50">
                <SelectValue placeholder="Select a collection..." />
              </SelectTrigger>
              <SelectContent>
                {collections.map((col: any) => (
                  <SelectItem key={col.slug} value={col.slug}>
                    {col.labels?.plural || col.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {collectionValue && (
            <div>
              <label className="dy-text-xs dy-font-semibold dy-text-muted-foreground dy-uppercase dy-tracking-wider dy-block dy-mb-2">
                Document
              </label>
              <Popover open={disabled ? false : openPopover} onOpenChange={setOpenPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openPopover}
                    disabled={disabled}
                    className="dy-w-full dy-justify-between dy-font-normal dy-bg-white dy-border-border/50 dy-h-11"
                  >
                    {docsLoading ? (
                      "Loading..."
                    ) : selectedDoc ? (
                      <span className="dy-truncate">
                        {getDocumentDisplay(selectedDoc, collectionValue)}
                      </span>
                    ) : (
                      <span className="dy-text-muted-foreground">Select a document...</span>
                    )}
                    <ChevronsUpDown className="dy-ml-2 dy-h-4 dy-w-4 dy-shrink-0 dy-opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="dy-w-full dy-p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder={`Search ${selectedCollectionLabel}...`}
                      value={docSearch}
                      onValueChange={setDocSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {docsLoading ? "Searching..." : "No documents found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {documents
                          .filter((doc: any) => {
                            if (!docSearch) return true
                            const displayValue = getDocumentDisplay(doc, collectionValue)
                            return displayValue
                              .toLowerCase()
                              .includes(docSearch.toLowerCase())
                          })
                          .map((doc: any) => (
                            <CommandItem
                              key={doc.id}
                              value={doc.id}
                              onSelect={() => handleDocumentSelect(doc.id)}
                            >
                              <Check
                                className={cn(
                                  "dy-mr-2 dy-h-4 dy-w-4",
                                  docValue === doc.id ? "dy-opacity-100" : "dy-opacity-0"
                                )}
                              />
                              <span className="dy-flex-1">
                                {getDocumentDisplay(doc, collectionValue)}
                              </span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div>
            <label className="dy-text-xs dy-font-semibold dy-text-muted-foreground dy-uppercase dy-tracking-wider dy-block dy-mb-2">
              Link Label (Optional)
            </label>
            <Input
              type="text"
              value={labelValue}
              onChange={(e) => handleInternalLabelChange(e.target.value)}
              placeholder="e.g., Read More"
              disabled={disabled}
              className="dy-bg-white dy-border-border/50"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
