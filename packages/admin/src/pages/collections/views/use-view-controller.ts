import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useDyrected } from "../../../providers/dyrected-context"
import {
  createViewController,
  type CollectionViewState,
  type ViewController,
  type ViewControllerHandlers,
  type ViewDocument,
} from "../../../providers/view-controller"
import type { SerializedAction, SerializedView } from "./types"

export interface UseViewControllerOptions {
  slug: string
  schema: any
  view: SerializedView
  actions: SerializedAction[]
  permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }
  hasDetail: boolean
  /** `"name::id,id"` keys of actions executing now, server actions and built-ins alike. */
  runningKeys: string[]
  /** Runs an action by object. With `input`, dialogs are skipped. */
  runAction: (action: SerializedAction, docs: ViewDocument[], input?: Record<string, unknown>) => Promise<boolean>
}

const EMPTY_DOCS: ViewDocument[] = []
const EMPTY_STRINGS: string[] = []

/**
 * Creates the per-view controller that every layout, built-in or custom, and
 * every extension slot reads through `useCollectionView()`.
 *
 * It owns what is the same for all layouts: actions, permissions, selection,
 * optimistic document updates, navigation and the search term. The data itself
 * (documents, paging) is published by whichever layout loaded it.
 */
export function useViewController(options: UseViewControllerOptions): ViewController {
  const { slug, schema, view, actions, permissions, hasDetail, runningKeys, runAction } = options
  const { client } = useDyrected()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get("search") ?? ""

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const controllerRef = useRef<ViewController | null>(null)

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
  }, [queryClient, slug])

  const setPage = useCallback(
    (next: number) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        if (next <= 1) params.delete("page")
        else params.set("page", String(next))
        return params.toString() === prev.toString() ? prev : params
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
        return params.toString() === prev.toString() ? prev : params
      })
    },
    [setSearchParams],
  )

  const updateDocument = useCallback<ViewControllerHandlers["updateDocument"]>(
    async (id, patch, updateOptions) => {
      if (!client) throw new Error("Dyrected client unavailable")
      // Show the change on every layout right away; drop it once the server
      // has answered, because the refetch then carries the real value.
      const release = controllerRef.current?.addPatch(id, patch)
      try {
        const updated = (await (client as any).collection(slug).update(id, patch)) as ViewDocument
        await queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
        await queryClient.invalidateQueries({ queryKey: ["admin-navigation-badges"] })
        return updated
      } catch (error: any) {
        if (!updateOptions?.silent) {
          toast.error("Could not save the change", { description: error?.message })
        }
        throw error
      } finally {
        release?.()
      }
    },
    [client, queryClient, slug],
  )

  const open = useCallback<ViewControllerHandlers["open"]>(
    (id, mode = "view") => {
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

  // Handlers read through refs so their identity never changes and they always
  // see the current documents, selection and actions.
  const selectedRef = useRef(selectedIds)
  selectedRef.current = selectedIds
  const actionsRef = useRef(actions)
  actionsRef.current = actions
  const runActionRef = useRef(runAction)
  runActionRef.current = runAction

  const run = useCallback<ViewControllerHandlers["runAction"]>(async (name, docs, input) => {
    const action = actionsRef.current.find((candidate) => candidate.name === name)
    if (!action) {
      console.warn(`[Dyrected Admin] useViewActions().run("${name}"): no such action on this view.`)
      return false
    }
    const current = controllerRef.current?.getState()
    const targets =
      docs ??
      (current?.documents ?? EMPTY_DOCS).filter((doc) => selectedRef.current.includes(String(doc.id)))
    return runActionRef.current(action, targets, input)
  }, [])

  const handlers = useMemo<ViewControllerHandlers>(
    () => ({
      refetch,
      setPage,
      setSort: () => {
        // Sorting is owned by the layout that loads the data and is a no-op otherwise.
      },
      setSearch,
      setFilters: () => {
        // Layout-owned filters need a layout that loads its own data.
      },
      setSelection: (ids) => setSelectedIds((prev) => (sameIds(prev, ids) ? prev : ids)),
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
      documents: EMPTY_DOCS,
      total: 0,
      isLoading: true,
      isFetching: false,
      error: undefined,
      isTruncated: false,
      pagination: { page: 1, pageSize: 0, totalPages: 1 },
      sort: view.sort,
      search,
      where: undefined,
      selectedIds,
      permissions,
      urls: { collection: `/collections/${slug}`, create: `/collections/${slug}/new` },
      actions,
      runningActions: runningKeys.length ? runningKeys : EMPTY_STRINGS,
    }),
    [schema, view.slug, view.sort, config, search, selectedIds, permissions, slug, actions, runningKeys],
  )

  // Created once from the first snapshot, so the first render of a layout
  // already sees the real identity, permissions and actions.
  if (!controllerRef.current) controllerRef.current = createViewController(state, handlers)
  const controller = controllerRef.current

  useLayoutEffect(() => {
    controller.publish(state, handlers)
  }, [controller, state, handlers])

  return controller
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}
