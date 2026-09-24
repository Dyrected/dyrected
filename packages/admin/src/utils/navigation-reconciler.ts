import type {
  CompiledNavGroup,
  CompiledNavItem,
  CompiledNavTree,
} from "@dyrected/core"
import {
  DEFAULT_USER_NAV_PREFERENCES,
  type UserNavigationPreferences,
} from "../types/preferences"

export interface ReconciledNavTree extends CompiledNavTree {
  pinnedItems: CompiledNavItem[]
}

const normalizeKey = (val?: string) => (val || "").toLowerCase().replace(/[^a-z0-9]/g, "-")

/**
 * Reconciles developer-defined navigation tree from code (`baseTree`)
 * with operator personal/role preferences (`prefs`), ensuring:
 * 1. Sparse delta merging (newly deployed code resources are never dropped).
 * 2. User-created custom groups and operational workspaces are injected.
 * 3. User visibility overrides (`hidden`) are respected.
 * 4. User ordering overrides (`groupOrder`, `itemOrder`) are applied.
 * 5. Pinned favorite shortcuts are extracted.
 * 6. Tombstone shielding: deleted collections/views don't crash the sidebar.
 */
export function reconcileNavigation(
  baseTree: CompiledNavTree | null | undefined,
  prefs: UserNavigationPreferences | null | undefined,
  schemas?: { collections?: Array<{ slug: string; [key: string]: unknown }>; globals?: Array<{ slug: string; [key: string]: unknown }> }
): ReconciledNavTree {
  if (!baseTree) {
    return {
      groups: [],
      ungrouped: [],
      pinnedItems: [],
    }
  }

  const effectivePrefs = prefs || DEFAULT_USER_NAV_PREFERENCES
  const hiddenSet = new Set(effectivePrefs.hidden || [])
  const knownCollectionSlugs = new Set((schemas?.collections || []).map((c) => c.slug))
  const knownGlobalSlugs = new Set((schemas?.globals || []).map((g) => g.slug))

  // Clone base groups and items to avoid mutating input objects
  const groupsList: CompiledNavGroup[] = []

  const findGroup = (query: string): CompiledNavGroup | undefined => {
    const qNorm = normalizeKey(query)
    return groupsList.find(
      (g) =>
        g.id === query ||
        g.slug === query ||
        g.name === query ||
        normalizeKey(g.id) === qNorm ||
        normalizeKey(g.slug) === qNorm ||
        normalizeKey(g.name) === qNorm
    )
  }

  for (const g of baseTree.groups || []) {
    groupsList.push({
      ...g,
      items: (g.items || []).map((item) => ({ ...item })),
    })
  }

  // 1. Inject user-created groups from preferences
  for (const ug of effectivePrefs.groups || []) {
    const existing = findGroup(ug.slug || ug.name)
    if (!existing) {
      groupsList.push({
        id: ug.slug ? `group_${ug.slug}` : `group_${normalizeKey(ug.name)}`,
        name: ug.name,
        slug: ug.slug || normalizeKey(ug.name),
        icon: ug.icon || "Folder",
        defaultExpanded: ug.defaultExpanded ?? true,
        order: ug.order ?? 100,
        items: [],
      })
    }
  }

  // 2. Inject user-created nav items from preferences
  for (const itemOpt of effectivePrefs.items || []) {
    const targetGroup = typeof itemOpt.group === "object" ? itemOpt.group?.name : itemOpt.group
    const groupKey = targetGroup || "Custom"

    let group = findGroup(groupKey)
    if (!group) {
      group = {
        id: `group_${normalizeKey(groupKey)}`,
        name: groupKey,
        slug: normalizeKey(groupKey),
        icon: "Folder",
        defaultExpanded: true,
        order: 99,
        items: [],
      }
      groupsList.push(group)
    }

    const itemId = itemOpt.slug ? `workspace_${itemOpt.slug}` : (itemOpt.collection ? `collection_${itemOpt.collection}` : `custom_${Math.random()}`)

    // Check if item already exists in this group
    const existingIndex = group.items.findIndex((i) => i.id === itemId || i.slug === itemOpt.slug)
    const compiledItem: CompiledNavItem = {
      id: itemId,
      type: itemOpt.slug ? "workspace" : (itemOpt.collection ? "collection" : (itemOpt.global ? "global" : "workspace")),
      slug: itemOpt.slug || itemOpt.collection || itemOpt.global || "item",
      label: itemOpt.label || itemOpt.slug || "Item",
      icon: (itemOpt.icon as string) || "Briefcase",
      group: group.name,
      order: itemOpt.order ?? 100,
      views: itemOpt.views || [],
      collection: itemOpt.collection,
      global: itemOpt.global,
      badge: itemOpt.badge,
      access: itemOpt.access,
    }

    if (existingIndex >= 0) {
      group.items[existingIndex] = compiledItem
    } else {
      group.items.push(compiledItem)
    }
  }

  // 3. Mark Tombstones & filter hidden items/groups
  const allAvailableItems: CompiledNavItem[] = []
  const reconciledGroups: CompiledNavGroup[] = []

  for (const group of groupsList) {
    if (hiddenSet.has(group.id) || (group.slug && hiddenSet.has(group.slug)) || hiddenSet.has(group.name)) {
      continue
    }

    const visibleItems: CompiledNavItem[] = []
    for (const item of group.items) {
      if (hiddenSet.has(item.id) || (item.slug && hiddenSet.has(item.slug))) {
        continue
      }

      // Tombstone check: if schemas are provided and item references an unknown collection/global
      let isTombstone = false
      if (schemas && schemas.collections && schemas.collections.length > 0) {
        if (item.collection && !knownCollectionSlugs.has(item.collection)) {
          isTombstone = true
        }
      }
      if (schemas && schemas.globals && schemas.globals.length > 0) {
        if (item.global && !knownGlobalSlugs.has(item.global)) {
          isTombstone = true
        }
      }

      const processedItem = isTombstone ? { ...item, isTombstone: true } : item
      visibleItems.push(processedItem)
      allAvailableItems.push(processedItem)
    }

    // 4. Sort items within the group according to effectivePrefs.itemOrder or original order
    const groupKey = group.slug || group.name
    const itemOrderList = effectivePrefs.itemOrder?.[group.id] || effectivePrefs.itemOrder?.[groupKey]

    if (itemOrderList && itemOrderList.length > 0) {
      visibleItems.sort((a, b) => {
        const aIdx = itemOrderList.indexOf(a.id) >= 0 ? itemOrderList.indexOf(a.id) : (a.slug ? itemOrderList.indexOf(a.slug) : -1)
        const bIdx = itemOrderList.indexOf(b.id) >= 0 ? itemOrderList.indexOf(b.id) : (b.slug ? itemOrderList.indexOf(b.slug) : -1)
        if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx
        if (aIdx >= 0) return -1
        if (bIdx >= 0) return 1
        return (a.order ?? 100) - (b.order ?? 100)
      })
    } else {
      visibleItems.sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
    }

    reconciledGroups.push({
      ...group,
      items: visibleItems,
    })
  }

  // 5. Sort groups according to effectivePrefs.groupOrder or group.order
  if (effectivePrefs.groupOrder && effectivePrefs.groupOrder.length > 0) {
    reconciledGroups.sort((a, b) => {
      const aIdx = effectivePrefs.groupOrder!.indexOf(a.id) >= 0 ? effectivePrefs.groupOrder!.indexOf(a.id) : (a.slug ? effectivePrefs.groupOrder!.indexOf(a.slug) : effectivePrefs.groupOrder!.indexOf(a.name))
      const bIdx = effectivePrefs.groupOrder!.indexOf(b.id) >= 0 ? effectivePrefs.groupOrder!.indexOf(b.id) : (b.slug ? effectivePrefs.groupOrder!.indexOf(b.slug) : effectivePrefs.groupOrder!.indexOf(b.name))
      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx
      if (aIdx >= 0) return -1
      if (bIdx >= 0) return 1
      return (a.order ?? 100) - (b.order ?? 100)
    })
  } else {
    reconciledGroups.sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
  }

  // 6. Filter ungrouped items
  const reconciledUngrouped = (baseTree.ungrouped || [])
    .filter((item) => !hiddenSet.has(item.id) && (!item.slug || !hiddenSet.has(item.slug)))
    .map((item) => {
      allAvailableItems.push(item)
      return item
    })

  // 7. Extract pinned items
  const pinnedItems: CompiledNavItem[] = []
  for (const pin of effectivePrefs.pinned || []) {
    // Find matching item in all available items
    const match = allAvailableItems.find((i) => i.slug === pin.slug || i.id === pin.slug)
    if (match) {
      pinnedItems.push({
        ...match,
        id: `pin_${match.id}`,
        label: pin.label || match.label,
        icon: pin.icon || match.icon,
      })
    } else {
      // Pinned item was custom or direct link
      pinnedItems.push({
        id: `pin_${pin.slug}`,
        type: pin.type,
        slug: pin.slug,
        label: pin.label || pin.slug,
        icon: pin.icon || "Star",
        order: 0,
        views: [],
      })
    }
  }

  return {
    groups: reconciledGroups,
    ungrouped: reconciledUngrouped,
    pinnedItems,
  }
}
