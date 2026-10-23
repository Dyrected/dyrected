import * as React from "react"
import { useParams, Navigate } from "react-router-dom"
import { useDyrected } from "../../providers/dyrected-context"
import { usePreference } from "../../hooks/use-preferences"
import { isNavItemVisible } from "../../utils/nav-item-visibility"
import { reconcileNavigation } from "../../utils/navigation-reconciler"
import { DEFAULT_USER_NAV_PREFERENCES } from "../../types/preferences"
import { canReadSchema } from "../../utils/schema-access"
import { AdminNotFound, AdminNotFoundSkeleton } from "../../components/layout/admin-not-found"
import { OperationalViewPage } from "../collections/views/operational-view-page"
import type { CompiledNavItem } from "@dyrected/sdk"

/**
 * Finds a navigation item across all compiled groups, ungrouped items, and pinned items matching the given workspace slug.
 */
function findWorkspaceItem(navigation: any, slug: string): CompiledNavItem | undefined {
  if (!navigation) return undefined
  if (navigation.groups) {
    for (const group of navigation.groups) {
      if (group.items) {
        const match = group.items.find((item: CompiledNavItem) => item.slug === slug || item.id === slug)
        if (match) return match
      }
    }
  }
  if (navigation.ungrouped) {
    const match = navigation.ungrouped.find((item: CompiledNavItem) => item.slug === slug || item.id === slug)
    if (match) return match
  }
  if (navigation.pinnedItems) {
    const match = navigation.pinnedItems.find((item: CompiledNavItem) => item.slug === slug || item.id === slug)
    if (match) return match
  }
  return undefined
}

/**
 * Root workspace entrypoint (/:workspaceSlug).
 * Performs a client redirect to the workspace's default first view (/:workspaceSlug/:firstViewSlug).
 */
export function WorkspaceRedirectRoute() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
  const { navigation: baseTree, schemas, user } = useDyrected()
  const [userNavPrefs] = usePreference("admin:navigation", DEFAULT_USER_NAV_PREFERENCES, { scope: "auto" })

  const activeNavigation = React.useMemo(() => {
    return reconcileNavigation(baseTree, userNavPrefs, schemas as any, {
      includeHidden: true,
      allowUserItems: !baseTree?.locked,
    })
  }, [baseTree, userNavPrefs, schemas])

  if (!baseTree || !schemas) {
    return <AdminNotFoundSkeleton />
  }

  const foundItem = findWorkspaceItem(activeNavigation, workspaceSlug!)
  // A workspace injected from saved preferences must still point at something this user can read.
  const item = foundItem && isNavItemVisible(foundItem, schemas as any, user) ? foundItem : undefined

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
  const { navigation: baseTree, schemas, user } = useDyrected()
  const [userNavPrefs] = usePreference("admin:navigation", DEFAULT_USER_NAV_PREFERENCES, { scope: "auto" })

  const activeNavigation = React.useMemo(() => {
    return reconcileNavigation(baseTree, userNavPrefs, schemas as any, {
      includeHidden: true,
      allowUserItems: !baseTree?.locked,
    })
  }, [baseTree, userNavPrefs, schemas])

  if (!baseTree || !schemas) {
    return <AdminNotFoundSkeleton />
  }

  const foundItem = findWorkspaceItem(activeNavigation, workspaceSlug!)
  // A workspace injected from saved preferences must still point at something this user can read.
  const item = foundItem && isNavItemVisible(foundItem, schemas as any, user) ? foundItem : undefined

  if (!item) {
    return (
      <AdminNotFound
        title="Workspace not found"
        description={`We could not find an operational workspace called "${workspaceSlug}". It may have been renamed, hidden, or removed from this admin.`}
      />
    )
  }

  const view = item.views?.find((v: any) => v.slug === viewSlug)

  if (!view || !canReadSchema(view as any, user)) {
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
