/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { resolveDocumentTitle } from "../lib/document-title"

export interface UseAdjacentDocumentsOptions {
  client: any
  collection: any
  doc: any
  schemas?: any
  enableKeyboardShortcuts?: boolean
}

export function useAdjacentDocuments({
  client,
  collection,
  doc,
  schemas,
  enableKeyboardShortcuts = true,
}: UseAdjacentDocumentsOptions) {
  const navigate = useNavigate()
  const slug = collection?.slug
  const docId = doc?.id
  const createdAt = doc?.createdAt

  const { data: prevDoc } = useQuery({
    queryKey: ["collections", slug, "adjacent-prev", docId, createdAt],
    queryFn: async () => {
      if (!slug || !client || !docId) return null
      try {
        const filter = createdAt ? { createdAt: { less_than: createdAt } } : {}
        const res = await client.collection(slug).find({
          where: filter,
          sort: "-createdAt",
          limit: 1,
        })
        const item = res?.docs?.[0]
        return item && item.id !== docId ? item : null
      } catch {
        return null
      }
    },
    enabled: Boolean(slug && docId && client),
    staleTime: 30_000,
  })

  const { data: nextDoc } = useQuery({
    queryKey: ["collections", slug, "adjacent-next", docId, createdAt],
    queryFn: async () => {
      if (!slug || !client || !docId) return null
      try {
        const filter = createdAt ? { createdAt: { greater_than: createdAt } } : {}
        const res = await client.collection(slug).find({
          where: filter,
          sort: "createdAt",
          limit: 1,
        })
        const item = res?.docs?.[0]
        return item && item.id !== docId ? item : null
      } catch {
        return null
      }
    },
    enabled: Boolean(slug && docId && client),
    staleTime: 30_000,
  })

  const prevTitle = prevDoc
    ? resolveDocumentTitle({
        entry: prevDoc,
        collection,
        collections: schemas?.collections,
      }) || prevDoc?.title || prevDoc?.name || String(prevDoc.id)
    : null

  const nextTitle = nextDoc
    ? resolveDocumentTitle({
        entry: nextDoc,
        collection,
        collections: schemas?.collections,
      }) || nextDoc?.title || nextDoc?.name || String(nextDoc.id)
    : null

  // Keyboard navigation shortcuts (J = next, K = previous)
  useEffect(() => {
    if (!enableKeyboardShortcuts || !slug) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable ||
        target?.getAttribute("role") === "textbox"

      if (isInput) return

      if ((e.key === "j" || e.key === "J") && nextDoc?.id) {
        navigate(`/collections/${slug}/${nextDoc.id}/detail`)
      } else if ((e.key === "k" || e.key === "K") && prevDoc?.id) {
        navigate(`/collections/${slug}/${prevDoc.id}/detail`)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enableKeyboardShortcuts, slug, nextDoc?.id, prevDoc?.id, navigate])

  return {
    prevDoc,
    nextDoc,
    prevTitle,
    nextTitle,
  }
}
