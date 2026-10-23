import type {
  CompiledNavGroup,
  CompiledNavItem,
  CompiledNavTree,
  NavigationRolePolicy,
  UserNavigationPreferences,
} from "../types/navigation.js";
import { CURRENT_NAV_PREFERENCES_VERSION } from "../types/navigation.js";
import { reconcileNavigation } from "./navigation-reconciler.js";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

const itemKeys = (item: CompiledNavItem): string[] => [item.id, ...(item.slug ? [item.slug] : [])];

const allTreeItems = (tree: CompiledNavTree): CompiledNavItem[] => [
  ...tree.groups.flatMap((g) => g.items),
  ...tree.ungrouped,
];

/**
 * Reduces a navigation preference to the parts that are safe to share as a
 * role or global default: ordering, hiding, groups, and regrouped items that
 * already exist in the server tree. Pinned shortcuts and any item the server
 * tree does not contain (the publisher's own workspaces) are dropped, so
 * publishing a layout can never smuggle the publisher's items to other users.
 */
export function sanitizeNavigationLayout(
  prefs: UserNavigationPreferences | null | undefined,
  tree: CompiledNavTree,
): UserNavigationPreferences {
  const known = new Set(allTreeItems(tree).flatMap(itemKeys));
  return {
    _version: CURRENT_NAV_PREFERENCES_VERSION,
    hidden: isStringArray(prefs?.hidden) ? prefs.hidden : [],
    groupOrder: isStringArray(prefs?.groupOrder) ? prefs.groupOrder : [],
    itemOrder: Object.fromEntries(
      Object.entries(prefs?.itemOrder ?? {}).filter(([, order]) => isStringArray(order)),
    ),
    groups: Array.isArray(prefs?.groups) ? prefs.groups : [],
    items: (Array.isArray(prefs?.items) ? prefs.items : []).filter((item) => {
      // A workspace is identified by its slug; only slugless entries are keyed by what they point at.
      if (item.slug) return known.has(item.slug) || known.has(`workspace_${item.slug}`);
      if (item.collection) return known.has(`collection_${item.collection}`);
      if (item.global) return known.has(`global_${item.global}`);
      return false;
    }),
  };
}

/**
 * Validates a stored or submitted role policy and returns a normalised copy,
 * or `null` when the value is not a policy.
 */
export function parseNavigationRolePolicy(
  value: unknown,
  tree: CompiledNavTree,
): NavigationRolePolicy | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.enforced !== "boolean" || !isStringArray(raw.allowed)) return null;
  const layout = sanitizeNavigationLayout(raw.layout as UserNavigationPreferences | undefined, tree);
  return {
    _version: CURRENT_NAV_PREFERENCES_VERSION,
    enforced: raw.enforced,
    allowed: raw.allowed,
    layout: {
      _version: layout._version,
      hidden: layout.hidden,
      groupOrder: layout.groupOrder,
      itemOrder: layout.itemOrder,
      groups: layout.groups,
      items: layout.items,
    },
  };
}

/**
 * Applies the role menu policies that govern a user to their access-pruned tree.
 *
 * `policies` has one entry per role the user holds: the role's policy, or `null`
 * when the role has none. The menu is locked only if every role has an enforced
 * policy; a role without one leaves the user unrestricted, because policy narrows
 * the menu and never grants access. A locked menu is the union of what the
 * enforced roles allow, arranged by the first policy's layout.
 *
 * `access` is applied before this runs, so a policy can never reveal an item the
 * user cannot access.
 */
export function applyNavigationRolePolicies(
  tree: CompiledNavTree,
  policies: Array<NavigationRolePolicy | null | undefined>,
): CompiledNavTree {
  const enforced = policies.filter((p): p is NavigationRolePolicy => !!p?.enforced);
  if (policies.length === 0 || enforced.length !== policies.length) return tree;

  const allowed = new Set(enforced.flatMap((p) => p.allowed));
  const isAllowed = (item: CompiledNavItem) => itemKeys(item).some((key) => allowed.has(key));

  const groups: CompiledNavGroup[] = tree.groups
    .map((g) => ({ ...g, items: g.items.filter(isAllowed) }))
    .filter((g) => g.items.length > 0);
  const filtered: CompiledNavTree = { groups, ungrouped: tree.ungrouped.filter(isAllowed) };

  const reconciled = reconcileNavigation(filtered, enforced[0].layout, undefined, { allowUserItems: false });
  return { groups: reconciled.groups, ungrouped: reconciled.ungrouped, locked: true };
}
