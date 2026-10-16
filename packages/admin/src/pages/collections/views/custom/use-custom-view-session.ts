import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CUSTOM_VIEW_FETCH_ALL_LIMIT } from "@dyrected/core"

import { useDyrected } from "../../../../providers/dyrected-context"
import {
  createViewController,
  type CollectionViewState,
  type ViewController,
  type ViewControllerHandlers,
  type ViewDocument,
} from "../../../../providers/view-controller"
import { resolveViewSort } from "../resolve-view-filter"
import type { SerializedAction, SerializedView } from "../types"

/** The API caps a single `find()` at 100 documents. */
const API_PAGE_LIMIT = 100
const DEFAULT_PAGE_SIZE = 50

interface PageResult {
  docs: ViewDocument[]
  total: number
  totalPages: number
  isTruncated: boolean
}

export interface UseCustomViewSessionOptions {
  slug: string
  schema: any
  view: SerializedView
  /** Toolbar-derived `where` (view filter + metric chips + search). */
  toolbarWhere: Record<string, any> | undefined
  actions: SerializedAction[]
  permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }
  hasDetail: boolean
  runningKey: string | null
  runAction: (action: SerializedAction, docs: ViewDocument[], input?: Record<string, unknown>) => Promise<boolean>
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null"
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`
}

/**
 * Owns data, filters, selection and mutations for one custom-layout view and
 * publishes them to a subscribable {@link ViewController}. This is the layer
 * `useCollectionView()` reads, so a custom layout and the host never diverge.
 */
export function useCustomViewSession(options: UseCustomViewSessionOptions): {
  controller: ViewController
  state: CollectionViewState
} {
  const { slug, schema, view, toolbarWhere, actions, permissions, hasDetail, runningKey, runAction } = options
  const { client } = useDyrected()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const fetchAll = Boolean(view.data?.fetchAll)
  const pageSize = Math.min(Math.max(Number(view.data?.pageSize) || DEFAULT_PAGE_SIZE, 1), API_PAGE_LIMIT)
  const page = Math.max(Number(searchParams.get("page")) || 1, 1)
  const search = searchParams.get("search") ?? ""

  const [sort, setSort] = useState<CollectionViewState["sort"]>(() => view.sort)
  const [layoutWhere, setLayoutWhere] = useState<Record<string, any> | undefined>(undefined)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const where = useMemo(() => {
    if (toolbarWhere && layoutWhere) return { AND: [toolbarWhere, layoutWhere] }
    return toolbarWhere ?? layoutWhere
  }, [toolbarWhere, layoutWhere])
  const whereHash = stableStringify(where ?? null)
  const sortString = resolveViewSort(sort)

  const queryKey = useMemo(
    () => ["operational-view", slug, view.slug, "custom", whereHash, sortString ?? null, fetchAll ? "all" : page, pageSize],
    [slug, view.slug, whereHash, sortString, fetchAll, page, pageSize],
  )

  const query = useQuery({
    queryKey,
    enabled: !!client,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: async (): Promise<PageResult> => {
      if (!client) throw new Error("Dyrected client unavailable")
      const collection = (client as any).collection(slug)
      const find = (nextPage: number, limit: number) => collection.find({ where, sort: sortString, page: nextPage, limit })

      if (!fetchAll) {
        const result = await find(page, pageSize)
        const docs = (result?.docs ?? []) as ViewDocument[]
        const total = Number(result?.total ?? docs.length)
        return {
          docs,
          total,
          totalPages: Number(result?.totalPages ?? (Math.ceil(total / pageSize) || 1)),
          isTruncated: false,
        }
      }

      const docs: ViewDocument[] = []
      let total = 0
      for (let nextPage = 1; docs.length < CUSTOM_VIEW_FETCH_ALL_LIMIT; nextPage++) {
        const result = await find(nextPage, API_PAGE_LIMIT)
        const batch = (result?.docs ?? []) as ViewDocument[]
        total = Number(result?.total ?? batch.length)
        docs.push(...batch)
        if (!batch.length || docs.length >= total) break
      }
      return {
        docs: docs.slice(0, CUSTOM_VIEW_FETCH_ALL_LIMIT),
        total,
        totalPages: 1,
        isTruncated: total > CUSTOM_VIEW_FETCH_ALL_LIMIT,
      }
    },
  })

  const documents = query.data?.docs ?? EMPTY_DOCS

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
  }, [queryClient, slug])

  const setPage = useCallback(
    (next: number) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        if (next <= 1) params.delete("page")
        else params.set("page", String(next))
        return params
      })
    },
    [setSearchParams],
  )

  const setSearch = useCallback(
    (query: string) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        if (query.trim()) params.set("search", query)
        else params.delete("search")
        params.delete("page")
        return params
      })
    },
    [setSearchParams],
  )

  const updateDocument = useCallback(
    async (id: string, patch: Record<string, unknown>): Promise<ViewDocument> => {
      if (!client) throw new Error("Dyrected client unavailable")
      const previous = queryClient.getQueryData<PageResult>(queryKey)
      if (previous) {
        queryClient.setQueryData<PageResult>(queryKey, {
          ...previous,
          docs: previous.docs.map((doc) => (String(doc.id) === id ? { ...doc, ...patch } : doc)),
        })
      }
      try {
        const updated = (await (client as any).collection(slug).update(id, patch)) as ViewDocument
        await queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
        await queryClient.invalidateQueries({ queryKey: ["admin-navigation-badges"] })
        return updated
      } catch (error: any) {
        if (previous) queryClient.setQueryData<PageResult>(queryKey, previous)
        toast.error("Could not save the change", { description: error?.message })
        throw error
      }
    },
    [client, queryClient, queryKey, slug],
  )

  const open = useCallback(
    (id: string, mode: "view" | "edit" | "drawer" = "view") => {
      if (mode === "drawer") {
        setSearchParams((prev) => {
          const params = new URLSearchParams(prev)
          params.set("record", id)
          return params
        })
        return
      }
      const base = `/collections/${slug}/${encodeURIComponent(id)}`
      void navigate(mode === "edit" || !hasDetail ? `${base}/edit` : base)
    },
    [hasDetail, navigate, setSearchParams, slug],
  )

  const documentsRef = useRef(documents)
  documentsRef.current = documents
  const selectedRef = useRef(selectedIds)
  selectedRef.current = selectedIds
  const actionsRef = useRef(actions)
  actionsRef.current = actions
  const runActionRef = useRef(runAction)
  runActionRef.current = runAction

  const run = useCallback(
    async (name: string, docs?: ViewDocument[], input?: Record<string, unknown>): Promise<boolean> => {
      const action = actionsRef.current.find((candidate) => candidate.name === name)
      if (!action) {
        console.warn(`[Dyrected Admin] useViewActions().run("${name}"): no such action on this view.`)
        return false
      }
      const targets =
        docs ?? documentsRef.current.filter((doc) => selectedRef.current.includes(String(doc.id)))
      return runActionRef.current(action, targets, input)
    },
    [],
  )

  const handlers = useMemo<ViewControllerHandlers>(
    () => ({
      refetch,
      setPage,
      setSort: (next) => setSort(next),
      setSearch,
      setFilters: (next) => setLayoutWhere(next && Object.keys(next).length ? next : undefined),
      setSelection: (ids) => setSelectedIds(ids),
      updateDocument,
      open,
      runAction: run,
    }),
    [refetch, setPage, setSearch, updateDocument, open, run],
  )

  const config = useMemo(
    () => ({
      columns: view.columns,
      groupBy: (view as { groupBy?: string }).groupBy,
      options: view.options,
    }),
    [view],
  )

  const state = useMemo<CollectionViewState>(
    () => ({
      collection: schema,
      viewSlug: view.slug,
      config,
      documents,
      total: query.data?.total ?? 0,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      error: query.error ? (query.error as Error) : undefined,
      isTruncated: query.data?.isTruncated ?? false,
      pagination: { page: fetchAll ? 1 : page, pageSize, totalPages: query.data?.totalPages ?? 1 },
      sort,
      search,
      where,
      selectedIds,
      permissions,
      urls: { collection: `/collections/${slug}`, create: `/collections/${slug}/new` },
      actions,
      runningActions: runningKey ? [runningKey] : EMPTY_STRINGS,
    }),
    [
      schema, view.slug, config, documents, query.data, query.isLoading, query.isFetching, query.error,
      fetchAll, page, pageSize, sort, search, where, selectedIds, permissions, slug, actions, runningKey,
    ],
  )

  // The controller is created once, from the first real snapshot, so the first
  // render of the layout already sees data and never a placeholder state.
  const controllerRef = useRef<ViewController | null>(null)
  if (!controllerRef.current) controllerRef.current = createViewController(state, handlers)
  const controller = controllerRef.current

  useLayoutEffect(() => {
    controller.publish(state, handlers)
  }, [controller, state, handlers])

  return { controller, state }
}

const EMPTY_DOCS: ViewDocument[] = []
const EMPTY_STRINGS: string[] = []
