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

interface DataTableRelationshipFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  relationTo: string
  multiple?: boolean
}

/**
 * Multi-select relationship filter popover with:
 * 1. Infinite scrolling pagination (list dynamically grows as you scroll or search).
 * 2. Guaranteed selected-value hydration (selected documents are fetched directly by ID so
 *    they never look empty or disappear when outside the first page).
 * 3. 100% visual consistency with DataTableFacetedFilter.
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

  // Local cache of known documents by ID to guarantee instant label rendering
  const docCacheRef = React.useRef<Map<string, Record<string, any>>>(new Map())

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const columnFilterValue = column?.getFilterValue()
  const selectedValues = React.useMemo(() => {
    if (!columnFilterValue) return new Set<string>()
    if (Array.isArray(columnFilterValue)) return new Set(columnFilterValue.map(String))
    return new Set([String(columnFilterValue)])
  }, [columnFilterValue])

  const selectedIds = React.useMemo(() => Array.from(selectedValues), [selectedValues])

  // Resolve display title field for the related collection
  const relatedCollection = (schemas?.collections as Array<any> | undefined)?.find(
    (c) => c.slug === relationTo,
  )
  const displayField = relatedCollection?.admin?.useAsTitle || "title"

  const getDocLabel = React.useCallback(
    (item: Record<string, any>) => {
      return String(item[displayField] || item.name || item.slug || item.id || "")
    },
    [displayField],
  )

  // 1. Dedicated hydration query: fetches all currently selected documents directly by ID.
  // Guarantees that selected items ALWAYS resolve to their human-readable title,
  // regardless of which page they reside on or what the current search filter is.
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
            docCacheRef.current.set(String(doc.id), doc)
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
            docCacheRef.current.get(id) ??
            queryClient.getQueryData<Record<string, any>>(["relationship-doc", relationTo, id]),
        )
        .filter(Boolean) as Record<string, any>[]
      return cached.length > 0 ? cached : undefined
    },
    enabled: Boolean(client && relationTo && selectedIds.length > 0),
    staleTime: 60_000,
  })

  // 2. Infinite query for browsable / searchable options.
  // Automatically loads more pages as the user scrolls, growing the list dynamically.
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
      let qb = (client as any).collection(relationTo).find({ limit: PAGE_SIZE, page: pageParam })
      if (debouncedSearch) {
        qb = qb.where({ [displayField]: { like: `%${debouncedSearch}%` } })
      }
      const res = await qb.exec()
      for (const doc of res?.docs ?? []) {
        if (doc?.id) {
          docCacheRef.current.set(String(doc.id), doc)
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

  // Merge hydrated selected docs and browsed docs, removing duplicate IDs
  const combinedOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; label: string; doc?: Record<string, any> }>()

    // 1. Add browsed / searched documents in view first
    for (const doc of browsedDocs) {
      const id = String(doc.id ?? "")
      if (id) {
        docCacheRef.current.set(id, doc)
        map.set(id, { id, label: getDocLabel(doc), doc })
      }
    }

    // 2. Add hydrated selected documents
    for (const doc of hydratedSelectedDocs) {
      const id = String(doc.id ?? "")
      if (id) {
        docCacheRef.current.set(id, doc)
        map.set(id, { id, label: getDocLabel(doc), doc })
      }
    }

    // 3. Fallback to docCache / queryClient for any selected IDs before falling back to raw id
    for (const id of selectedIds) {
      if (!map.has(id)) {
        const cached =
          docCacheRef.current.get(id) ??
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

  const onItemSelect = React.useCallback(
    (id: string, isSelected: boolean, doc?: Record<string, any>) => {
      if (!column) return

      if (doc) {
        docCacheRef.current.set(id, doc)
        queryClient.setQueryData(["relationship-doc", relationTo, id], doc)
      }

      if (multiple) {
        const next = new Set(selectedValues)
        if (isSelected) {
          next.delete(id)
        } else {
          next.add(id)
        }
        const filterValues = Array.from(next)
        column.setFilterValue(filterValues.length ? filterValues : undefined)
      } else {
        column.setFilterValue(isSelected ? undefined : [id])
        setOpen(false)
      }
    },
    [column, multiple, selectedValues, relationTo, queryClient],
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
          {selectedValues.size > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="dy-mx-0.5 data-[orientation=vertical]:dy-h-4"
              />
              <Badge
                variant="secondary"
                className="dy-hidden dy-rounded-sm dy-px-1 dy-font-normal lg:dy-inline-flex"
              >
                {selectedValues.size}
              </Badge>
              <Badge
                variant="secondary"
                className="dy-rounded-sm dy-px-1 dy-font-normal lg:dy-hidden"
              >
                {selectedValues.size} selected
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="dy-w-64 dy-p-0" align="start">
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
              <CommandGroup
                className="dy-max-h-[300px] dy-scroll-py-1 dy-overflow-y-auto dy-overflow-x-hidden"
                onScroll={handleScroll}
              >
                {combinedOptions.map((option) => {
                  const isSelected = selectedValues.has(option.id)

                  return (
                    <CommandItem
                      key={option.id}
                      className="[&>svg:last-child]:dy-hidden"
                      onSelect={() => onItemSelect(option.id, isSelected, option.doc)}
                    >
                      <div
                        className={cn(
                          "dy-flex dy-size-4 dy-items-center dy-justify-center dy-rounded-sm dy-border dy-border-primary",
                          isSelected
                            ? "dy-bg-primary dy-text-primary-foreground"
                            : "dy-opacity-50 [&_svg]:dy-invisible",
                        )}
                      >
                        <Check className="dy-h-3 dy-w-3" />
                      </div>
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
