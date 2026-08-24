import * as React from "react"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-context"
import { Button } from "../../ui/button"
import { Badge } from "../../ui/badge"
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
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"
import { cn, getMediaUrl } from "../../../lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog"
import type { FieldSchema } from "../form-engine"

const FormEngine = React.lazy(async () => {
  const module = await import("../form-engine")
  return { default: module.FormEngine }
})

const PAGE_SIZE = 50

interface RelationshipPickerProps {
  id?: string
  value?: string | string[]
  onChange: (value: string | string[]) => void
  label?: string
  relationTo: string
  multiple?: boolean
  disabled?: boolean
}

interface DBCollection {
  slug: string
  upload?: boolean
  labels?: { singular?: string; plural?: string }
  label?: string
  admin?: { useAsTitle?: string }
  fields: FieldSchema[]
}

export function RelationshipPicker({ id, value, onChange, label, relationTo, multiple, disabled }: RelationshipPickerProps) {
  const { client, schemas } = useDyrected()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)

  const collections = schemas?.collections as DBCollection[] | undefined
  const relatedCollection = collections?.find((c) => c.slug === relationTo)
  if (!relationTo) console.warn("[RelationshipPicker] No relationTo/collection defined for field:", label)
  const isUpload = !!relatedCollection?.upload
  const displayField = relatedCollection?.admin?.useAsTitle || "title"

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["collection", relationTo, "picker", search],
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === "number" ? pageParam : 1
      let qb = client!.collection(relationTo).find({ limit: PAGE_SIZE, page })
      if (search) {
        qb = qb.where({ [displayField]: { like: `%${search}%` } })
      }
      return qb.exec()
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: { hasNextPage?: boolean; page?: number; docs?: unknown[] }) => {
      if (lastPage.hasNextPage) return lastPage.page + 1
      if (lastPage.docs?.length === PAGE_SIZE) return (lastPage.page ?? 1) + 1
      return undefined
    },
    enabled: !!client && !!relationTo,
  })

  const allDocs = (data?.pages.flatMap((page) => (page as { docs?: unknown[] }).docs || []) ?? []) as Array<Record<string, unknown>>

  const getDisplayLabel = (item: Record<string, unknown>) => {
    return String(item[displayField] || item.name || item.slug || item.id || "")
  }

  const values = Array.isArray(value) ? value : value ? [value] : []
  const selectedItems = values.map(v => allDocs.find((item) => String(item.id || "") === v)).filter(Boolean)

  const trimmedSearch = search.trim()
  const hasExactMatch = allDocs.some(
    (item) => getDisplayLabel(item).toLowerCase() === trimmedSearch.toLowerCase()
  )
  const showCreateOption = trimmedSearch !== "" && !hasExactMatch && relatedCollection

  const defaultValues = { [displayField]: trimmedSearch }

  const handleCreateSubmit = async (formData: Record<string, unknown>) => {
    try {
      const created = await client!.collection(relationTo).create(formData) as { id: string }
      setCreateDialogOpen(false)
      if (multiple) {
        onChange([...values, created.id])
      } else {
        onChange(created.id)
        setOpen(false)
      }
      setSearch("")
      queryClient.invalidateQueries({ queryKey: ["collection", relationTo] })
    } catch (err: unknown) {
      console.error("Failed to create referenced document:", err)
    }
  }

  return (
    <div className="dy-flex dy-flex-col dy-gap-2">
      {label && <span className="dy-text-sm dy-font-medium dy-leading-none">{label}</span>}
      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="dy-w-full dy-justify-between dy-font-normal"
          >
            {isLoading ? (
              "Loading..."
            ) : selectedItems.length > 0 ? (
              <div className="dy-flex dy-flex-wrap dy-gap-1">
                {selectedItems.map((item) => (
                  <Badge key={String(item.id || "")} variant="secondary" className="dy-text-[10px] dy-h-5 dy-px-1.5">
                    {getDisplayLabel(item)}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="dy-text-muted-foreground">Select {relationTo}...</span>
            )}
            <ChevronsUpDown className="dy-ml-2 dy-h-4 dy-w-4 dy-shrink-0 dy-opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="dy-w-[calc(100vw-2rem)] sm:dy-w-[400px] dy-p-0" align="start">
          <Command>
            <CommandInput
              placeholder={`Search ${relationTo}...`}
              onValueChange={setSearch}
            />
            <CommandList>
              {showCreateOption && (
                <CommandGroup heading="Custom Option">
                  <CommandItem
                    value={search}
                    onSelect={() => {
                      setCreateDialogOpen(true)
                      setOpen(false)
                    }}
                    className="dy-rounded-lg dy-py-2.5 dy-text-primary dy-font-medium"
                  >
                    <Plus className="dy-mr-2 dy-h-4 dy-w-4" />
                    <span>Create new "{trimmedSearch}"</span>
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandEmpty>{isLoading ? "Searching..." : "No item found."}</CommandEmpty>
              <CommandGroup>
                {allDocs.map((item) => (
                  <CommandItem
                    key={String(item.id || "")}
                    value={String(item.id || "")}
                    onSelect={() => {
                      if (multiple) {
                        const newValues = values.includes(String(item.id || ""))
                          ? values.filter(v => v !== String(item.id || ""))
                          : [...values, String(item.id || "")]
                        onChange(newValues)
                      } else {
                        onChange(String(item.id || "") === value ? "" : String(item.id || ""))
                        setOpen(false)
                      }
                    }}
                  >
                    <div className="dy-flex dy-items-center dy-gap-3 dy-flex-1">
                      {isUpload && (
                        <div className="dy-h-6 dy-w-6 dy-rounded dy-border dy-bg-muted dy-overflow-hidden dy-flex-shrink-0">
                          <img
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            src={getMediaUrl(item as any, client?.getBaseUrl() || "")}
                            className="dy-h-full dy-w-full dy-object-cover"
                            alt=""
                          />
                        </div>
                      )}
                      <span className="dy-flex-1">{getDisplayLabel(item)}</span>
                      <Check
                        className={cn(
                          "dy-h-4 dy-w-4",
                          values.includes(String(item.id || "")) ? "dy-opacity-100" : "dy-opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {hasNextPage && (
                <div className="dy-p-1 dy-border-t dy-border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="dy-w-full dy-text-xs dy-text-muted-foreground"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <><Loader2 className="dy-h-3 dy-w-3 dy-animate-spin dy-mr-1" /> Loading more...</>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {relatedCollection && (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="dy-max-w-xl dy-overflow-y-auto dy-max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create New {relatedCollection.labels?.singular || relatedCollection.label || relationTo}</DialogTitle>
            </DialogHeader>
            <div className="dy-pt-4">
              <React.Suspense fallback={<div className="dy-h-40 dy-rounded-md dy-border dy-border-dashed dy-border-border/70 dy-bg-muted/20" />}>
                <FormEngine
                  collection={relationTo}
                  fields={relatedCollection.fields}
                  defaultValues={defaultValues}
                  onSubmit={handleCreateSubmit}
                  submitLabel="Create"
                />
              </React.Suspense>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
