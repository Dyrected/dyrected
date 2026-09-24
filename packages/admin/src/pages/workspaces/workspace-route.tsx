import { useParams, Navigate } from "react-router-dom"
import { useDyrected } from "../../providers/dyrected-context"
import { AdminNotFound, AdminNotFoundSkeleton } from "../../components/layout/admin-not-found"
import { OperationalViewPage } from "../collections/views/operational-view-page"
import type { CompiledNavItem } from "@dyrected/sdk"

/**
 * Finds a navigation item across all compiled groups matching the given workspace slug.
 */
function findWorkspaceItem(navigation: any, slug: string): CompiledNavItem | undefined {
  if (!navigation?.groups) return undefined
  for (const group of navigation.groups) {
    if (group.items) {
      const match = group.items.find((item: CompiledNavItem) => item.slug === slug)
      if (match) return match
    }
  }
  return undefined
}

/**
 * Root workspace entrypoint (/:workspaceSlug).
 * Performs a client redirect to the workspace's default first view (/:workspaceSlug/:firstViewSlug).
 */
export function WorkspaceRedirectRoute() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
  const { navigation, schemas } = useDyrected()

  if (!navigation || !schemas) {
    return <AdminNotFoundSkeleton />
  }

  const item = findWorkspaceItem(navigation, workspaceSlug!)

  if (!item) {
    return (
      <AdminNotFound
        title="Workspace not found"
        description={`We could not find an operational workspace called "${workspaceSlug}". It may have been renamed or removed.`}
      />
    )
  }

  const defaultView = item.views?.[0]
  if (!defaultView) {
    return (
      <AdminNotFound
        title="No Views Configured"
        description={`Workspace "${workspaceSlug}" has no configured views.`}
      />
    )
  }

  return <Navigate to={`/${workspaceSlug}/${defaultView.slug}`} replace />
}

/**
 * Operational Workspace Interface mounted directly at /:workspaceSlug/:viewSlug.
 * Resolves the operational workspace navigation item, identifies the active view,
 * resolves the target collection schema, and renders OperationalViewPage.
 */
export function WorkspaceRoute() {
  const { workspaceSlug, viewSlug } = useParams<{ workspaceSlug: string; viewSlug: string }>()
  const { navigation, schemas } = useDyrected()

  if (!navigation || !schemas) {
    return <AdminNotFoundSkeleton />
  }

  const item = findWorkspaceItem(navigation, workspaceSlug!)

  if (!item) {
    return (
      <AdminNotFound
        title="Workspace not found"
        description={`We could not find an operational workspace called "${workspaceSlug}". It may have been renamed, hidden, or removed from this admin.`}
      />
    )
  }

  const view = item.views?.find((v: any) => v.slug === viewSlug)

  if (!view) {
    return (
      <AdminNotFound
        title="View not found"
        description={`We could not find a view called "${viewSlug}" within workspace "${workspaceSlug}".`}
      />
    )
  }

  const targetCollectionSlug = view.collection || item.collection
  if (!targetCollectionSlug) {
    return (
      <AdminNotFound
        title="Collection not configured"
        description={`View "${viewSlug}" in workspace "${workspaceSlug}" does not specify a target collection.`}
      />
    )
  }

  const schema = schemas.collections.find((c: any) => c.slug === targetCollectionSlug)

  if (!schema) {
    return (
      <AdminNotFound
        title="Collection not found"
        description={`The target collection "${targetCollectionSlug}" for this workspace was not found.`}
      />
    )
  }

  return (
    <OperationalViewPage
      key={`${workspaceSlug}:${viewSlug}`}
      slug={targetCollectionSlug}
      schema={schema}
      view={view}
      schemas={schemas}
    />
  )
}
