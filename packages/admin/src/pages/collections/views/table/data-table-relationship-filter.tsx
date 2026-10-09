import * as React from "react"
import type { Column } from "@tanstack/react-table"
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Loader2, PlusCircle, XCircle } from "lucide-react"

import { Badge } from "../../../../components/ui/badge"
import { Button } from "../../../../components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../../../../components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover"
import { Separator } from "../../../../components/ui/separator"
import { useDyrected } from "../../../../providers/dyrected-context"
import { cn } from "../../../../lib/utils"

const PAGE_SIZE = 25

// Module-level document cache by ID across renders
const docCache = new Map<string, Record<string, any>>()

function getDocImage(doc?: Record<string, any>): string | null {
  if (!doc) return null
  if (typeof doc.thumbnailURL === "string" && doc.thumbnailURL) return doc.thumbnailURL
  if (
    typeof doc.url === "string" &&
    doc.url &&
    (doc.mimeType?.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.url) ||
      doc.url.startsWith("http"))
  ) {
    return doc.url
  }
  if (typeof doc.avatar === "string" && (doc.avatar.startsWith("http") || doc.avatar.startsWith("/")))
    return doc.avatar
  if (typeof doc.avatar === "object" && doc.avatar?.url) return doc.avatar.url
  if (typeof doc.image === "string" && (doc.image.startsWith("http") || doc.image.startsWith("/")))
    return doc.image
  if (typeof doc.image === "object" && doc.image?.url) return doc.image.url
  if (typeof doc.photo === "string" && doc.photo.startsWith("http")) return doc.photo
  if (typeof doc.logo === "string" && doc.logo.startsWith("http")) return doc.logo
  return null
}

interface DataTableRelationshipFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  relationTo: string
  multiple?: boolean
}

/**
 * Multi-select relationship filter popover with:
 * 1. Pinned selected section at the top of the popover.
 * 2. Human-readable descriptive trigger badges (shows title for 1-2 items).
 * 3. Multi-field server search across common candidate identifiers.
 * 4. Avatar and thumbnail rendering for media/visual records.
 * 5. Inclusion and negation operator support (Is any of / Is not).
 */
export function DataTableRelationshipFilter<TData, TValue>({
  column,
  title,
  relationTo,
  multiple = true,
}: DataTableRelationshipFilterProps<TData, TValue>) {
  const { client, schemas } = useDyrected()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const columnFilterValue = column?.getFilterValue()
  const { currentOperator, selectedIds } = React.useMemo(() => {
    if (!columnFilterValue) return { currentOperator: "in", selectedIds: [] as string[] }
    if (
      typeof columnFilterValue === "object" &&
      !Array.isArray(columnFilterValue) &&
      "operator" in (columnFilterValue as any)
    ) {
      const op = (columnFilterValue as any).operator || "in"
      const val = (columnFilterValue as any).value
      const ids = Array.isArray(val)
        ? val.map(String)
        : val !== undefined && val !== ""
          ? [String(val)]
          : []
      return { currentOperator: op, selectedIds: ids }
    }
    if (Array.isArray(columnFilterValue)) {
      return { currentOperator: "in", selectedIds: columnFilterValue.map(String) }
    }
    return { currentOperator: "in", selectedIds: [String(columnFilterValue)] }
  }, [columnFilterValue])

  const selectedValues = React.useMemo(() => new Set(selectedIds), [selectedIds])

  // Resolve display title field and searchable fields for the related collection
  const relatedCollection = (schemas?.collections as Array<any> | undefined)?.find(
    (c) => c.slug === relationTo,
  )
  const displayField = relatedCollection?.admin?.useAsTitle || "title"

  // const candidateSearchFields = React.useMemo(() => {
  //   const fields = (relatedCollection?.fields as Array<any> | undefined) ?? []
  //   const fieldNames = new Set(fields.map((f) => f.name))
  //   const potential = [displayField, "name", "title", "email", "slug", "username", "code"]
  //   const matches = Array.from(new Set(potential.filter((name) => fieldNames.has(name))))
  //   return matches.length > 0 ? matches : [displayField]
  // }, [relatedCollection, displayField])

  const getDocLabel = React.useCallback(
    (item: Record<string, any>) => {
      return String(item[displayField] || item.name || item.slug || item.id || "")
    },
    [displayField],
  )

  // 1. Dedicated hydration query: fetches all currently selected documents directly by ID.
  const { data: hydratedSelectedDocs = [] } = useQuery({
    queryKey: ["relationship-filter-hydrated", relationTo, selectedIds],
    queryFn: async () => {
      if (!client || !relationTo || selectedIds.length === 0) return []
      try {
        const res = await (client as any).collection(relationTo).find({
          where: { id: { in: selectedIds } },
          limit: Math.max(selectedIds.length, 10),
        })
        const docs = (res?.docs ?? []) as Record<string, any>[]
        for (const doc of docs) {
          if (doc?.id) {
            docCache.set(String(doc.id), doc)
            queryClient.setQueryData(["relationship-doc", relationTo, String(doc.id)], doc)
          }
        }
        return docs
      } catch {
        return []
      }
    },
    initialData: () => {
      const cached = selectedIds
        .map(
          (id) =>
            docCache.get(id) ??
            queryClient.getQueryData<Record<string, any>>(["relationship-doc", relationTo, id]),
        )
        .filter(Boolean) as Record<string, any>[]
      return cached.length > 0 ? cached : undefined
    },
    enabled: Boolean(client && relationTo && selectedIds.length > 0),
    staleTime: 60_000,
  })

  // 2. Infinite query for browsable / searchable options with multi-field search.
  const {
    data: infiniteData,
    isLoading: isSearchLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["relationship-filter-options", relationTo, debouncedSearch],
    queryFn: async ({ pageParam = 1 }) => {
      if (!client || !relationTo) return { docs: [], hasNextPage: false, page: 1 }
      const res = await (client as any)
        .collection(relationTo)
        .find({
          limit: PAGE_SIZE,
          page: pageParam,
          search: debouncedSearch || undefined,
        })
        .exec()
      for (const doc of res?.docs ?? []) {
        if (doc?.id) {
          docCache.set(String(doc.id), doc)
          queryClient.setQueryData(["relationship-doc", relationTo, String(doc.id)], doc)
        }
      }
      return res
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      if (lastPage?.hasNextPage) return allPages.length + 1
      if (lastPage?.docs?.length === PAGE_SIZE) return allPages.length + 1
      return undefined
    },
    enabled: Boolean(client && relationTo && open),
    staleTime: 30_000,
  })

  // Flatten browsed pages
  const browsedDocs = React.useMemo(() => {
    return (
      infiniteData?.pages?.flatMap(
        (page: any) => (page?.docs ?? []) as Record<string, any>[],
      ) ?? []
    )
  }, [infiniteData])

  // Sync discovered docs into docCache in a side effect, not during render
  React.useEffect(() => {
    for (const doc of hydratedSelectedDocs) {
      if (doc?.id) docCache.set(String(doc.id), doc)
    }
    for (const doc of browsedDocs) {
      if (doc?.id) docCache.set(String(doc.id), doc)
    }
  }, [hydratedSelectedDocs, browsedDocs])

  // Merge hydrated selected docs and browsed docs, removing duplicate IDs
  const combinedOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; label: string; doc?: Record<string, any> }>()

    // 1. Add browsed / searched documents in view first
    for (const doc of browsedDocs) {
      const id = String(doc.id ?? "")
      if (id) {
        map.set(id, { id, label: getDocLabel(doc), doc })
      }
    }

    // 2. Add hydrated selected documents
    for (const doc of hydratedSelectedDocs) {
      const id = String(doc.id ?? "")
      if (id) {
        map.set(id, { id, label: getDocLabel(doc), doc })
      }
    }

    // 3. Fallback to docCache / queryClient for any selected IDs before falling back to raw id
    for (const id of selectedIds) {
      if (!map.has(id)) {
        const cached =
          docCache.get(id) ??
          queryClient.getQueryData<Record<string, any>>(["relationship-doc", relationTo, id])
        if (cached) {
          map.set(id, { id, label: getDocLabel(cached), doc: cached })
        }
      }
    }

    // 4. Final fallback to raw ID ONLY if doc is completely unknown
    for (const id of selectedIds) {
      if (!map.has(id)) {
        map.set(id, { id, label: id })
      }
    }

    return Array.from(map.values())
  }, [hydratedSelectedDocs, browsedDocs, selectedIds, getDocLabel, queryClient, relationTo])

  // Split options into pinned selected and remaining options
  const { selectedOptions, unselectedOptions } = React.useMemo(() => {
    const selected: Array<{ id: string; label: string; doc?: Record<string, any> }> = []
    const unselected: Array<{ id: string; label: string; doc?: Record<string, any> }> = []

    for (const opt of combinedOptions) {
      if (selectedValues.has(opt.id)) {
        selected.push(opt)
      } else {
        unselected.push(opt)
      }
    }

    return { selectedOptions: selected, unselectedOptions: unselected }
  }, [combinedOptions, selectedValues])

  // Resolve human-readable labels for active trigger badges
  const selectedLabels = React.useMemo(() => {
    return selectedIds.map((id) => {
      const match =
        combinedOptions.find((o) => o.id === id) ??
        docCache.get(id)
      if (match) {
        return (match as any).label || getDocLabel(match as any)
      }
      return id
    })
  }, [selectedIds, combinedOptions, getDocLabel])

  const setFilterState = React.useCallback(
    (newIds: string[], newOp: string = currentOperator) => {
      if (!column) return
      if (newIds.length === 0) {
        column.setFilterValue(undefined)
        return
      }
      if (newOp === "in") {
        column.setFilterValue(newIds)
      } else {
        column.setFilterValue({ operator: newOp, value: newIds })
      }
    },
    [column, currentOperator],
  )

  const onItemSelect = React.useCallback(
    (id: string, isSelected: boolean, doc?: Record<string, any>) => {
      if (!column) return

      if (doc) {
        docCache.set(id, doc)
        queryClient.setQueryData(["relationship-doc", relationTo, id], doc)
      }

      if (multiple) {
        const next = new Set(selectedValues)
        if (isSelected) {
          next.delete(id)
        } else {
          next.add(id)
        }
        setFilterState(Array.from(next))
      } else {
        if (isSelected) {
          setFilterState([])
        } else {
          setFilterState([id])
          setOpen(false)
        }
      }
    },
    [column, multiple, selectedValues, relationTo, queryClient, setFilterState],
  )

  const onReset = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation()
      column?.setFilterValue(undefined)
    },
    [column],
  )

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    if (scrollHeight - scrollTop - clientHeight < 40 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="dy-border-dashed dy-font-normal">
          {selectedValues.size > 0 ? (
            <span
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              className="dy-rounded-sm dy-opacity-70 dy-transition-opacity hover:dy-opacity-100 focus-visible:dy-outline-none focus-visible:dy-ring-1 focus-visible:dy-ring-ring dy-cursor-pointer"
              onClick={onReset}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onReset(e as any)
                }
              }}
            >
              <XCircle />
            </span>
          ) : (
            <PlusCircle />
          )}
          {title}
          {currentOperator === "not_in" && (
            <span className="dy-text-[11px] dy-text-muted-foreground dy-lowercase">(not)</span>
          )}
          {selectedValues.size > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="dy-mx-0.5 data-[orientation=vertical]:dy-h-4"
              />
              {selectedValues.size === 1 ? (
                <Badge
                  variant="secondary"
                  className="dy-max-w-[140px] dy-truncate dy-rounded-sm dy-px-1.5 dy-font-normal"
                  title={selectedLabels[0]}
                >
                  {selectedLabels[0]}
                </Badge>
              ) : selectedValues.size === 2 ? (
                <Badge
                  variant="secondary"
                  className="dy-max-w-[200px] dy-truncate dy-rounded-sm dy-px-1.5 dy-font-normal"
                  title={selectedLabels.join(", ")}
                >
                  {selectedLabels.join(", ")}
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="dy-rounded-sm dy-px-1.5 dy-font-normal"
                >
                  {selectedValues.size} selected
                </Badge>
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="dy-w-64 dy-p-0" align="start">
        {/* Match mode header: Is any of / Is not */}
        <div className="dy-flex dy-items-center dy-justify-between dy-border-b dy-border-border/40 dy-px-3 dy-py-1.5 dy-text-xs">
          <span className="dy-font-medium dy-text-muted-foreground">Match:</span>
          <div className="dy-flex dy-items-center dy-gap-1">
            <button
              type="button"
              onClick={() => setFilterState(selectedIds, "in")}
              className={cn(
                "dy-rounded dy-px-1.5 dy-py-0.5 dy-text-xs dy-transition-colors",
                currentOperator === "in"
                  ? "dy-bg-primary dy-text-primary-foreground dy-font-medium"
                  : "dy-text-muted-foreground hover:dy-bg-accent hover:dy-text-accent-foreground",
              )}
            >
              Is any of
            </button>
            <button
              type="button"
              onClick={() => setFilterState(selectedIds, "not_in")}
              className={cn(
                "dy-rounded dy-px-1.5 dy-py-0.5 dy-text-xs dy-transition-colors",
                currentOperator === "not_in"
                  ? "dy-bg-primary dy-text-primary-foreground dy-font-medium"
                  : "dy-text-muted-foreground hover:dy-bg-accent hover:dy-text-accent-foreground",
              )}
            >
              Is not
            </button>
          </div>
        </div>

        <Command shouldFilter={false}>
          <CommandInput
            placeholder={title}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="dy-max-h-full">
            {isSearchLoading && combinedOptions.length === 0 ? (
              <div className="dy-flex dy-items-center dy-justify-center dy-gap-1.5 dy-py-6 dy-text-xs dy-text-muted-foreground">
                <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" />
                Loading...
              </div>
            ) : combinedOptions.length === 0 ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              <div
                className="dy-max-h-[300px] dy-scroll-py-1 dy-overflow-y-auto dy-overflow-x-hidden"
                onScroll={handleScroll}
              >
                {/* 1. Pinned Selected Section */}
                {selectedOptions.length > 0 && (
                  <CommandGroup heading={`Selected (${selectedOptions.length})`}>
                    {selectedOptions.map((option) => {
                      const imgUrl = getDocImage(option.doc)
                      return (
                        <CommandItem
                          key={`selected-${option.id}`}
                          className="[&>svg:last-child]:dy-hidden"
                          onSelect={() => onItemSelect(option.id, true, option.doc)}
                        >
                          <div className="dy-flex dy-size-4 dy-items-center dy-justify-center dy-rounded-sm dy-border dy-border-primary dy-bg-primary dy-text-primary-foreground">
                            <Check className="dy-h-3 dy-w-3" />
                          </div>
                          {imgUrl && (
                            <img
                              src={imgUrl}
                              alt=""
                              className="dy-mr-1.5 dy-size-4 dy-shrink-0 dy-rounded-full dy-object-cover dy-border dy-border-border/40"
                            />
                          )}
                          <span className="dy-truncate">{option.label}</span>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}

                {selectedOptions.length > 0 && unselectedOptions.length > 0 && (
                  <CommandSeparator />
                )}

                {/* 2. Options Section */}
                {unselectedOptions.length > 0 && (
                  <CommandGroup heading={selectedOptions.length > 0 ? "Options" : undefined}>
                    {unselectedOptions.map((option) => {
                      const imgUrl = getDocImage(option.doc)
                      return (
                        <CommandItem
                          key={`option-${option.id}`}
                          className="[&>svg:last-child]:dy-hidden"
                          onSelect={() => onItemSelect(option.id, false, option.doc)}
                        >
                          <div className="dy-flex dy-size-4 dy-items-center dy-justify-center dy-rounded-sm dy-border dy-border-primary dy-opacity-50 [&_svg]:dy-invisible">
                            <Check className="dy-h-3 dy-w-3" />
                          </div>
                          {imgUrl && (
                            <img
                              src={imgUrl}
                              alt=""
                              className="dy-mr-1.5 dy-size-4 dy-shrink-0 dy-rounded-full dy-object-cover dy-border dy-border-border/40"
                            />
                          )}
                          <span className="dy-truncate">{option.label}</span>
                        </CommandItem>
                      )
                    })}

                    {hasNextPage && (
                      <div className="dy-p-1 dy-text-center">
                        <button
                          type="button"
                          disabled={isFetchingNextPage}
                          onClick={() => fetchNextPage()}
                          className="dy-w-full dy-rounded dy-py-1 dy-text-xs dy-text-muted-foreground hover:dy-bg-accent hover:dy-text-accent-foreground"
                        >
                          {isFetchingNextPage ? (
                            <span className="dy-inline-flex dy-items-center dy-gap-1">
                              <Loader2 className="dy-h-3 dy-w-3 dy-animate-spin" />
                              Loading more...
                            </span>
                          ) : (
                            "Load more..."
                          )}
                        </button>
                      </div>
                    )}
                  </CommandGroup>
                )}
              </div>
            )}

            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onReset()}
                    className="dy-justify-center dy-text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
