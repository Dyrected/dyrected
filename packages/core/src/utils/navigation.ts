import type {
  DyrectedConfig,
  CollectionConfig,
  GlobalConfig,
  DefineWorkspaceOptions,
  ViewConfig,
  NavGroup,
  CompiledNavItem,
  CompiledNavGroup,
  CompiledNavTree,
} from "../types/index.js";

import { resolveTrashConfig } from "../trash.js";

/**
 * System route prefixes reserved by Dyrected.
 * Cannot be used as operational workspace slugs.
 */
export const RESERVED_NAVIGATION_SLUGS = new Set([
  "collections",
  "globals",
  "setup",
  "api",
  "login",
  "logout",
  "settings",
  "admin",
  "preferences",
  "auth",
  "trash",
]);

/**
 * Validates that no navigation item uses a reserved system route slug.
 */
export function assertValidNavigationSlugs(navigation: DefineWorkspaceOptions[]): void {
  for (const item of navigation) {
    if (item.dashboard || item.trash) continue;
    if (item.slug) {
      const normalizedSlug = item.slug.toLowerCase().trim().replace(/^\//, "");
      if (RESERVED_NAVIGATION_SLUGS.has(normalizedSlug)) {
        throw new Error(
          `[Dyrected Config] The slug '${item.slug}' in navigation item '${item.label || item.slug}' is a reserved system path and cannot be used as an operational workspace slug.`,
        );
      }
    }
  }
}

/**
 * Extracts a group name and group metadata from an item's group property.
 */
function resolveGroupMeta(
  groupProp: string | NavGroup | undefined,
  defaultGroupName = "Collections",
): { name: string; meta?: NavGroup } {
  if (!groupProp) {
    return { name: defaultGroupName };
  }
  if (typeof groupProp === "string") {
    return { name: groupProp };
  }
  return { name: groupProp.name, meta: groupProp };
}

/**
 * Compile the complete admin navigation tree from DyrectedConfig.
 *
 * Implements a deterministic 5-step compilation pipeline:
 * 1. Discover all collections, globals, and media resources.
 * 2. Apply explicit navigation overrides from `config.admin.navigation`.
 * 3. Evaluate `before` and `after` anchors via relative splicing.
 * 4. Sort groups and items by `order` and `position: 'first' | 'last'`.
 * 5. Auto-merge unmentioned resources into fallback sections.
 */
export function compileNavigation(
  config:
    | DyrectedConfig<any>
    | {
        collections?: readonly any[];
        globals?: readonly any[];
        admin?: { navigation?: DefineWorkspaceOptions[] };
      },
): CompiledNavTree {
  const collections = ((config.collections || []) as unknown) as CollectionConfig[];
  const globals = ((config.globals || []) as unknown) as GlobalConfig[];
  const explicitNav = config.admin?.navigation || [];

  // Validate reserved route slugs
  assertValidNavigationSlugs(explicitNav);

  const collectionsBySlug = new Map<string, CollectionConfig>();
  for (const col of collections) {
    collectionsBySlug.set(col.slug, col);
  }

  const globalsBySlug = new Map<string, GlobalConfig>();
  for (const gl of globals) {
    globalsBySlug.set(gl.slug, gl);
  }

  // Track which collections and globals were explicitly mentioned in config.admin.navigation
  const mentionedCollections = new Set<string>();
  const mentionedGlobals = new Set<string>();

  // Map to collect injected views from `addToCollection`
  const injectedViewsByCollection = new Map<string, ViewConfig[]>();

  for (const item of explicitNav) {
    if (item.addToCollection) {
      const existing = injectedViewsByCollection.get(item.addToCollection) || [];
      if (item.views && item.views.length > 0) {
        injectedViewsByCollection.set(item.addToCollection, [...existing, ...item.views]);
      }
    }
    if (item.collection) mentionedCollections.add(item.collection);
    if (item.global) mentionedGlobals.add(item.global);
  }

  const groupMetadataMap = new Map<string, NavGroup>();
  const itemsByGroup = new Map<string, CompiledNavItem[]>();
  const ungroupedItems: CompiledNavItem[] = [];

  const registerItem = (groupName: string | undefined, item: CompiledNavItem) => {
    if (!groupName) {
      ungroupedItems.push(item);
    } else {
      const list = itemsByGroup.get(groupName) || [];
      list.push(item);
      itemsByGroup.set(groupName, list);
    }
  };

  // Step 2: Process explicit navigation items (skipping pure addToCollection items)
  for (const item of explicitNav) {
    if (item.addToCollection && !item.slug && !item.collection && !item.global && !item.dashboard && !item.href) {
      // Pure injection item: already handled above
      continue;
    }

    const { name: groupName, meta: groupMeta } = resolveGroupMeta(item.group, undefined);
    if (groupName && groupMeta) {
      groupMetadataMap.set(groupName, { ...(groupMetadataMap.get(groupName) || {}), ...groupMeta });
    }

    if (item.dashboard) {
      registerItem(groupName, {
        id: "dashboard",
        type: "dashboard",
        slug: "dashboard",
        label: item.label || "Dashboard",
        icon: (item.icon as string) || "LayoutDashboard",
        group: groupName,
        order: item.order ?? 0,
        views: [],
        access: item.access,
      });
      continue;
    }

    if (item.trash) {
      registerItem(groupName, {
        id: "trash",
        type: "trash",
        slug: "trash",
        label: item.label || "Trash",
        icon: (item.icon as string) || "Trash2",
        group: groupName,
        order: item.order ?? 950,
        views: [],
        badge: item.badge,
        access: item.access,
      });
      continue;
    }

    if (item.collection) {
      const col = collectionsBySlug.get(item.collection);
      const combinedViews = [
        ...(col?.views || []),
        ...(injectedViewsByCollection.get(item.collection) || []),
        ...(item.views || []),
      ];

      registerItem(groupName, {
        id: item.slug || `collection_${item.collection}`,
        type: item.slug ? "workspace" : "collection",
        slug: item.slug || item.collection,
        collection: item.collection,
        label: item.label || col?.labels?.plural || item.collection,
        icon: (item.icon as string) || (col?.admin?.icon as string) || "Folder",
        group: groupName,
        order: item.order ?? ((col?.admin as any)?.order as number) ?? 100,
        views: combinedViews,
        badge: item.badge,
        access: item.access || col?.access?.read as any,
      });
      continue;
    }

    if (item.global) {
      const gl = globalsBySlug.get(item.global);
      registerItem(groupName, {
        id: item.slug || `global_${item.global}`,
        type: "global",
        slug: item.slug || item.global,
        global: item.global,
        label: item.label || gl?.label || item.global,
        icon: (item.icon as string) || "Settings",
        group: groupName,
        order: item.order ?? 100,
        views: [],
        badge: item.badge,
        access: item.access,
      });
      continue;
    }

    if (item.href) {
      registerItem(groupName, {
        id: `link_${item.slug || item.href}`,
        type: "link",
        slug: item.slug || "link",
        label: item.label || "Link",
        href: item.href,
        icon: (item.icon as string) || "ExternalLink",
        group: groupName,
        order: item.order ?? 100,
        views: [],
        badge: item.badge,
        access: item.access,
      });
      continue;
    }

    // Standalone operational workspace item
    const workspaceSlug = item.slug || "workspace";
    registerItem(groupName, {
      id: `workspace_${workspaceSlug}`,
      type: "workspace",
      slug: workspaceSlug,
      label: item.label || workspaceSlug,
      icon: (item.icon as string) || "Briefcase",
      group: groupName,
      order: item.order ?? 100,
      views: item.views || [],
      badge: item.badge,
      access: item.access,
    });
  }

  // Step 5 (part a): Auto-merge unmentioned collections
  for (const col of collections) {
    if (mentionedCollections.has(col.slug)) continue;
    if (col.admin?.hidden) continue;

    const groupProp = col.admin?.group;
    const { name: groupName, meta: groupMeta } = resolveGroupMeta(groupProp, "Collections");
    if (groupMeta) {
      groupMetadataMap.set(groupName, { ...(groupMetadataMap.get(groupName) || {}), ...groupMeta });
    }

    const combinedViews = [
      ...(col.views || []),
      ...(injectedViewsByCollection.get(col.slug) || []),
    ];

    registerItem(groupName, {
      id: `collection_${col.slug}`,
      type: "collection",
      slug: col.slug,
      collection: col.slug,
      label: col.labels?.plural || col.slug,
      icon: (col.admin?.icon as string) || "Folder",
      group: groupName,
      order: ((col?.admin as any)?.order as number) ?? 100,
      views: combinedViews,
      access: col.access?.read as any,
    });
  }

  // Step 5 (part b): Auto-merge unmentioned globals
  for (const gl of globals) {
    if (mentionedGlobals.has(gl.slug)) continue;
    const groupName = "Configuration";
    registerItem(groupName, {
      id: `global_${gl.slug}`,
      type: "global",
      slug: gl.slug,
      global: gl.slug,
      label: gl.label || gl.slug,
      icon: "Settings",
      group: groupName,
      order: 100,
      views: [],
    });
  }

  // Step 5 (part c): Auto-merge Trash system item if any collection has trash enabled
  const mentionedTrash = explicitNav.some((i) => i.trash || i.slug === "trash");
  if (!mentionedTrash) {
    const hasTrash = collections.some(
      (col) => !col.slug.startsWith("__") && resolveTrashConfig(col, config as any).enabled,
    );
    if (hasTrash) {
      registerItem(undefined, {
        id: "trash",
        type: "trash",
        slug: "trash",
        label: "Trash",
        icon: "Trash2",
        order: 950,
        views: [],
      });
    }
  }

  // Helper to apply relative splicing (`before` / `after`) and sorting on an item array
  const sortAndSpliceItems = (items: CompiledNavItem[]): CompiledNavItem[] => {
    // 1. Initial sort by explicit order
    const sorted = [...items].sort((a, b) => a.order - b.order);

    // 2. Relative anchoring pass: find explicit before/after options
    const explicitMap = new Map<string, DefineWorkspaceOptions>();
    for (const opt of explicitNav) {
      if (opt.slug) explicitMap.set(opt.slug, opt);
      if (opt.collection) explicitMap.set(opt.collection, opt);
      if (opt.global) explicitMap.set(opt.global, opt);
    }

    for (const opt of explicitNav) {
      const itemKey = opt.slug || opt.collection || opt.global;
      if (!itemKey) continue;

      if (opt.after) {
        const itemIdx = sorted.findIndex((i) => i.slug === itemKey);
        const targetIdx = sorted.findIndex((i) => i.slug === opt.after);
        if (itemIdx !== -1 && targetIdx !== -1 && itemIdx !== targetIdx) {
          const [moved] = sorted.splice(itemIdx, 1);
          const newTargetIdx = sorted.findIndex((i) => i.slug === opt.after);
          sorted.splice(newTargetIdx + 1, 0, moved);
        }
      } else if (opt.before) {
        const itemIdx = sorted.findIndex((i) => i.slug === itemKey);
        const targetIdx = sorted.findIndex((i) => i.slug === opt.before);
        if (itemIdx !== -1 && targetIdx !== -1 && itemIdx !== targetIdx) {
          const [moved] = sorted.splice(itemIdx, 1);
          const newTargetIdx = sorted.findIndex((i) => i.slug === opt.before);
          sorted.splice(newTargetIdx, 0, moved);
        }
      } else if (opt.position === "first") {
        const itemIdx = sorted.findIndex((i) => i.slug === itemKey);
        if (itemIdx > 0) {
          const [moved] = sorted.splice(itemIdx, 1);
          sorted.unshift(moved);
        }
      } else if (opt.position === "last") {
        const itemIdx = sorted.findIndex((i) => i.slug === itemKey);
        if (itemIdx !== -1 && itemIdx < sorted.length - 1) {
          const [moved] = sorted.splice(itemIdx, 1);
          sorted.push(moved);
        }
      }
    }

    return sorted;
  };

  // Build compiled groups
  const compiledGroups: CompiledNavGroup[] = [];

  for (const [groupName, rawItems] of itemsByGroup.entries()) {
    const meta = groupMetadataMap.get(groupName);
    const sortedItems = sortAndSpliceItems(rawItems);

    compiledGroups.push({
      id: `group_${groupName.toLowerCase().replace(/\s+/g, "_")}`,
      name: groupName,
      slug: meta?.slug || groupName.toLowerCase().replace(/\s+/g, "-"),
      icon: meta?.icon as string,
      defaultExpanded: meta?.defaultExpanded ?? true,
      order: meta?.order ?? 100,
      items: sortedItems,
    });
  }

  // Sort groups by group order
  compiledGroups.sort((a, b) => a.order - b.order);

  return {
    groups: compiledGroups,
    ungrouped: sortAndSpliceItems(ungroupedItems),
  };
}

/**
 * Filter compiled navigation based on user access rules.
 */
export function pruneNavigationForUser(
  tree: CompiledNavTree,
  user?: any,
): CompiledNavTree {
  const userRoles = new Set<string>();
  if (user?.role) userRoles.add(user.role);
  if (Array.isArray(user?.roles)) {
    for (const r of user.roles) userRoles.add(r);
  }

  const isAllowed = (item: CompiledNavItem): boolean => {
    if (!item.access) return true;
    if (Array.isArray(item.access)) {
      if (item.access.length === 0) return true;
      return item.access.some((role) => userRoles.has(role));
    }
    // If access is a function or custom AccessRule, allow for client pruning
    return true;
  };

  const prunedGroups: CompiledNavGroup[] = [];
  for (const group of tree.groups) {
    const visibleItems = group.items.filter(isAllowed);
    if (visibleItems.length > 0) {
      prunedGroups.push({
        ...group,
        items: visibleItems,
      });
    }
  }

  return {
    groups: prunedGroups,
    ungrouped: tree.ungrouped.filter(isAllowed),
  };
}

/**
 * Resolves all operational views associated with a collection, combining:
 * 1. Views declared directly on the collection (`collection.views`)
 * 2. Views targeting this collection via `admin.navigation` (including `addToCollection`,
 *    explicit collection navigation items, and views inside standalone operational workspaces).
 */
export function resolveAllCollectionViews(
  collection: CollectionConfig,
  config?: Partial<DyrectedConfig> | null,
): ViewConfig[] {
  const views: ViewConfig[] = [...(collection.views ?? [])];
  const seenSlugs = new Set(views.map((v) => v.slug));

  const explicitNav = config?.admin?.navigation;
  if (Array.isArray(explicitNav)) {
    for (const item of explicitNav) {
      if (!item) continue;
      const itemCol = item.collection || item.addToCollection;
      if (Array.isArray(item.views)) {
        for (const view of item.views) {
          if (!view || !view.slug) continue;
          const targetCol = view.collection || itemCol;
          if (targetCol === collection.slug && !seenSlugs.has(view.slug)) {
            views.push(view);
            seenSlugs.add(view.slug);
          }
        }
      }
    }
  }

  return views;
}

export * from "./navigation-reconciler.js";

