import { createContext } from "react";
import type { SerializedAction } from "../pages/collections/views/types";

/** A document as returned by the Dyrected API. */
export type ViewDocument = Record<string, any>;

/** How a layout asks the host to open a document. */
export type ViewOpenMode = "view" | "edit" | "drawer";

/** Serializable view settings a custom layout can read. */
export interface ViewLayoutConfig {
  columns?: string[];
  groupBy?: string;
  /** Date field of a calendar view, and the start and end fields of a gantt view. */
  dateField?: string;
  startDateField?: string;
  endDateField?: string;
  /** Options authored on the view (`options` in `defineView`). Only `layout: "custom"` views carry them. */
  options?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Everything a custom layout can read. The host rebuilds it whenever data,
 * filters, selection or permissions change, and never mutates a published
 * snapshot, so identity comparison is a valid change check.
 */
export interface CollectionViewState {
  collection: Record<string, any>;
  viewSlug: string;
  config: ViewLayoutConfig;
  documents: ViewDocument[];
  total: number;
  /** True until the first page has loaded. */
  isLoading: boolean;
  /** True while any request is in flight, including background refetches. */
  isFetching: boolean;
  error?: Error;
  /** True when `data.fetchAll` hit the safety cap and `documents` is a subset. */
  isTruncated: boolean;
  pagination: { page: number; pageSize: number; totalPages: number };
  sort?: { field: string; direction: "asc" | "desc" };
  search: string;
  /** The effective `where` sent to the server: view filter + toolbar + layout filters. */
  where: Record<string, any> | undefined;
  selectedIds: string[];
  permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean };
  urls: { collection: string; create: string };
  /** Actions the view exposes, already ordered and filtered by feature flags. */
  actions: SerializedAction[];
  /** `"action::ids"` keys of actions currently executing. */
  runningActions: string[];
}

/** Stable operations the host exposes to a layout. */
export interface ViewControllerHandlers {
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
  setSort: (sort: CollectionViewState["sort"]) => void;
  setSearch: (query: string) => void;
  /** Sets a layout-owned `where` that is AND-merged with the toolbar's filters. */
  setFilters: (where: Record<string, any> | undefined) => void;
  setSelection: (ids: string[]) => void;
  updateDocument: (
    id: string,
    patch: Record<string, unknown>,
    options?: { silent?: boolean },
  ) => Promise<ViewDocument>;
  open: (id: string, mode?: ViewOpenMode) => void;
  runAction: (name: string, docs?: ViewDocument[], input?: Record<string, unknown>) => Promise<boolean>;
}

/** The slice of {@link CollectionViewState} a layout publishes about the data it loaded. */
export type ViewDataSlice = Pick<
  CollectionViewState,
  "documents" | "total" | "isLoading" | "isFetching" | "error" | "isTruncated" | "pagination" | "sort"
> & { where?: Record<string, any> };

/** Operations only the data owner can implement. Omitted ones fall back to the host's defaults. */
export type ViewDataHandlers = Partial<
  Pick<ViewControllerHandlers, "refetch" | "setPage" | "setSort" | "setFilters">
>;

/**
 * Subscribable, per-view controller. Framework-neutral on purpose: the React
 * hook reads it with `useSyncExternalStore` and the Vue bridge mirrors it into
 * a `shallowRef`, the same shape as `DyrectedFormController`.
 *
 * The host page owns it and provides it to every layout, built-in or custom.
 * A layout that loads its own data publishes it with `setData`, so slot
 * components and hooks see the same documents as the layout on screen.
 */
export interface ViewController {
  getState: () => CollectionViewState;
  subscribe: (listener: () => void) => () => void;
  /** Delegates to the latest handlers; the object identity never changes. */
  handlers: ViewControllerHandlers;
  /** Host-only: publish a new snapshot and the handlers that go with it. */
  publish: (state: CollectionViewState, handlers: ViewControllerHandlers) => void;
  /** Layout-only: publish the data this owner loaded. The latest owner wins. */
  setData: (owner: symbol, slice: ViewDataSlice, handlers?: ViewDataHandlers) => void;
  /** Layout-only: stop publishing, if `owner` is still the current data owner. */
  clearData: (owner: symbol) => void;
  /**
   * Host-only: show `patch` on a document until the returned release function
   * runs. Powers optimistic updates for every layout without each one
   * patching its own cache.
   */
  addPatch: (id: string, patch: Record<string, unknown>) => () => void;
}

function isSameDocuments(a: unknown[], b: unknown[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const docA = a[i] as any;
    const docB = b[i] as any;
    if (docA === docB) continue;
    if (!docA || !docB || typeof docA !== "object" || typeof docB !== "object") return false;
    if (docA.id !== docB.id) return false;
    if (docA.updatedAt !== docB.updatedAt) return false;
    if (JSON.stringify(docA) !== JSON.stringify(docB)) return false;
  }
  return true;
}

/**
 * Layouts rebuild their slice on render, and several data hooks hand back a
 * fresh `[]` while loading. Comparing by value keeps that from notifying
 * subscribers (and re-rendering the layout that publishes) in a loop.
 */
function isSameSlice(a: ViewDataSlice, b: ViewDataSlice): boolean {
  if (a === b) return true;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof ViewDataSlice>;
  for (const key of keys) {
    const left = a[key] as unknown;
    const right = b[key] as unknown;
    if (Object.is(left, right)) continue;
    if (key === "documents") {
      if (Array.isArray(left) && Array.isArray(right) && isSameDocuments(left, right)) continue;
      return false;
    }
    if (key === "pagination" || key === "sort" || key === "where") {
      if (left !== undefined && right !== undefined && JSON.stringify(left) === JSON.stringify(right)) continue;
      if (left === undefined && right === undefined) continue;
      return false;
    }
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length === 0 && right.length === 0) continue;
      if (JSON.stringify(left) === JSON.stringify(right)) continue;
      return false;
    }
    return false;
  }
  return true;
}

type DataOwner = { owner: symbol; slice: ViewDataSlice; handlers?: ViewDataHandlers };

export function createViewController(initial: CollectionViewState, initialHandlers: ViewControllerHandlers): ViewController {
  let base = initial;
  let baseHandlers = initialHandlers;
  let data: DataOwner | null = null;
  const patches = new Map<symbol, { id: string; patch: Record<string, unknown> }>();

  let merged: CollectionViewState = initial;
  let mergedFrom: { base: CollectionViewState; data: DataOwner | null; patchCount: number; patchVersion: number } | null = null;
  let patchVersion = 0;
  const listeners = new Set<() => void>();

  const compute = (): CollectionViewState => {
    if (
      mergedFrom &&
      mergedFrom.base === base &&
      mergedFrom.data === data &&
      mergedFrom.patchVersion === patchVersion
    ) {
      return merged;
    }
    mergedFrom = { base, data, patchCount: patches.size, patchVersion };
    if (!data && patches.size === 0) {
      merged = base;
      return merged;
    }
    const slice = data?.slice;
    let documents = slice ? slice.documents : base.documents;
    if (patches.size) {
      const byId = new Map<string, Record<string, unknown>>();
      for (const { id, patch } of patches.values()) byId.set(id, { ...byId.get(id), ...patch });
      documents = documents.map((doc) => {
        const patch = byId.get(String(doc.id));
        return patch ? { ...doc, ...patch } : doc;
      });
    }
    merged = { ...base, ...(slice ?? {}), documents, where: slice?.where ?? base.where };
    return merged;
  };

  const emit = () => {
    for (const listener of [...listeners]) listener();
  };

  const handlers: ViewControllerHandlers = {
    refetch: () => (data?.handlers?.refetch ?? baseHandlers.refetch)(),
    setPage: (page) => (data?.handlers?.setPage ?? baseHandlers.setPage)(page),
    setSort: (sort) => (data?.handlers?.setSort ?? baseHandlers.setSort)(sort),
    setSearch: (query) => baseHandlers.setSearch(query),
    setFilters: (where) => (data?.handlers?.setFilters ?? baseHandlers.setFilters)(where),
    setSelection: (ids) => baseHandlers.setSelection(ids),
    updateDocument: (id, patch, options) => baseHandlers.updateDocument(id, patch, options),
    open: (id, mode) => baseHandlers.open(id, mode),
    runAction: (name, docs, input) => baseHandlers.runAction(name, docs, input),
  };

  return {
    getState: compute,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    handlers,
    publish: (next, nextHandlers) => {
      baseHandlers = nextHandlers;
      if (next === base) return;
      base = next;
      emit();
    },
    setData: (owner, slice, sliceHandlers) => {
      if (data && data.owner === owner && isSameSlice(data.slice, slice)) {
        data.handlers = sliceHandlers;
        return;
      }
      data = { owner, slice, handlers: sliceHandlers };
      emit();
    },
    clearData: (owner) => {
      if (!data || data.owner !== owner) return;
      data = null;
      emit();
    },
    addPatch: (id, patch) => {
      const key = Symbol("view-patch");
      patches.set(key, { id, patch });
      patchVersion++;
      emit();
      return () => {
        if (!patches.delete(key)) return;
        patchVersion++;
        emit();
      };
    },
  };
}

export const DYRECTED_VIEW_KEY = Symbol.for("dyrected.view");

/** Provided by the operational view page to every layout, built-in or custom. */
export const ViewControllerContext = createContext<ViewController | null>(null);
