/**
 * Component keys a schema references, grouped by the `AdminComponents`
 * registry that must supply them.
 *
 * Registration happens in the host app's admin bundle, so this scan is the
 * single source of truth for both type generation (CLI) and the admin's
 * unused-registration warning.
 */
export interface ReferencedComponentKeys {
  /** `field.admin.component` keys, resolved against `components.fields`. */
  fields: Set<string>;
  /** `admin.components.before/afterDashboard` keys. */
  dashboard: Set<string>;
  /** `collection.admin.components` list slots. */
  collectionList: Set<string>;
  /** Operational view slots (`collectionView` and per-view `components`). */
  collectionView: Set<string>;
  /** Reserved for custom document forms (spec 2). Empty until config can reference them. */
  forms: Set<string>;
  /** `component` of views with `layout: "custom"`. */
  viewLayouts: Set<string>;
  /** `admin.pages[].component` keys. */
  pages: Set<string>;
  /** `displayCustom(name)` keys used in Detail View layouts. */
  customComponents: Set<string>;
}

type Loose = Record<string, any>;

const DASHBOARD_SLOTS = ["beforeDashboard", "afterDashboard"] as const;
const LIST_SLOTS = ["beforeList", "beforeListTable", "afterListTable", "afterList"] as const;
const VIEW_SLOTS = ["beforeViewHeader", "afterViewHeader", "beforeViewContent", "afterViewContent"] as const;

function addKeys(target: Set<string>, value: unknown): void {
  for (const key of Array.isArray(value) ? value : [value]) {
    if (typeof key === "string" && key) target.add(key);
  }
}

function addSlots(target: Set<string>, slots: Loose | undefined, names: readonly string[]): void {
  if (!slots || typeof slots !== "object") return;
  for (const name of names) addKeys(target, slots[name]);
}

function scanFields(fields: unknown, keys: ReferencedComponentKeys): void {
  if (!Array.isArray(fields)) return;
  for (const field of fields as Loose[]) {
    if (!field || typeof field !== "object") continue;
    addKeys(keys.fields, field.admin?.component);
    scanFields(field.fields, keys);
    if (Array.isArray(field.blocks)) {
      for (const block of field.blocks) scanFields(block?.fields, keys);
    }
    if (Array.isArray(field.tabs)) {
      for (const tab of field.tabs) scanFields(tab?.fields, keys);
    }
  }
}

function scanDetail(items: unknown, keys: ReferencedComponentKeys): void {
  if (!Array.isArray(items)) return;
  for (const item of items as Loose[]) {
    if (!item || typeof item !== "object") continue;
    if (item.type === "custom") addKeys(keys.customComponents, item.name);
    scanDetail(item.items, keys);
    if (Array.isArray(item.tabs)) {
      for (const tab of item.tabs) scanDetail(tab?.items, keys);
    }
  }
}

function scanViews(views: unknown, keys: ReferencedComponentKeys): void {
  if (!Array.isArray(views)) return;
  for (const view of views as Loose[]) {
    addSlots(keys.collectionView, view?.components, VIEW_SLOTS);
    if (view?.layout === "custom") addKeys(keys.viewLayouts, view.component);
  }
}

/**
 * Collects every component key a schema (or a `DyrectedConfig`) references.
 * Tolerant of partial or unknown shapes: anything unrecognised is skipped.
 */
export function collectReferencedComponentKeys(schema: unknown): ReferencedComponentKeys {
  const keys: ReferencedComponentKeys = {
    fields: new Set(),
    dashboard: new Set(),
    collectionList: new Set(),
    collectionView: new Set(),
    forms: new Set(),
    viewLayouts: new Set(),
    pages: new Set(),
    customComponents: new Set(),
  };
  const root = schema as Loose | null | undefined;
  if (!root || typeof root !== "object") return keys;

  addSlots(keys.dashboard, root.admin?.components, DASHBOARD_SLOTS);

  if (Array.isArray(root.admin?.navigation)) {
    for (const item of root.admin.navigation as Loose[]) {
      if (item?.page) {
        if (typeof item.page === "string") {
          addKeys(keys.pages, item.page);
        } else if (item.page?.component) {
          addKeys(keys.pages, item.page.component);
        }
      }
    }
  }

  if (Array.isArray(root.admin?.pages)) {
    for (const page of root.admin.pages as Loose[]) addKeys(keys.pages, page?.component);
  }

  for (const block of (root.blocks ?? []) as Loose[]) scanFields(block?.fields, keys);

  for (const collection of (root.collections ?? []) as Loose[]) {
    scanFields(collection.fields, keys);
    scanDetail(collection.detail, keys);
    scanViews(collection.views, keys);

    const slots = collection.admin?.components as Loose | undefined;
    addSlots(keys.collectionList, slots, LIST_SLOTS);
    // List slots may also carry the view slots directly or nested under `collectionView`.
    addSlots(keys.collectionView, slots, VIEW_SLOTS);
    addSlots(keys.collectionView, slots?.collectionView, VIEW_SLOTS);
  }

  for (const global of (root.globals ?? []) as Loose[]) {
    scanFields(global.fields, keys);
    scanDetail(global.detail, keys);
  }

  return keys;
}
