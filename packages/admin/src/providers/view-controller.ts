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
  /** Options authored on the view (`options` in `defineView`). */
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
  updateDocument: (id: string, patch: Record<string, unknown>) => Promise<ViewDocument>;
  open: (id: string, mode?: ViewOpenMode) => void;
  runAction: (name: string, docs?: ViewDocument[], input?: Record<string, unknown>) => Promise<boolean>;
}

/**
 * Subscribable, per-view controller. Framework-neutral on purpose: the React
 * hook reads it with `useSyncExternalStore` and the Vue bridge mirrors it into
 * a `shallowRef`, the same shape as `DyrectedFormController`.
 */
export interface ViewController {
  getState: () => CollectionViewState;
  subscribe: (listener: () => void) => () => void;
  /** Delegates to the latest handlers; the object identity never changes. */
  handlers: ViewControllerHandlers;
  /** Host-only: publish a new snapshot and the handlers that go with it. */
  publish: (state: CollectionViewState, handlers: ViewControllerHandlers) => void;
}

export function createViewController(initial: CollectionViewState, initialHandlers: ViewControllerHandlers): ViewController {
  let state = initial;
  let latest = initialHandlers;
  const listeners = new Set<() => void>();

  const handlers: ViewControllerHandlers = {
    refetch: () => latest.refetch(),
    setPage: (page) => latest.setPage(page),
    setSort: (sort) => latest.setSort(sort),
    setSearch: (query) => latest.setSearch(query),
    setFilters: (where) => latest.setFilters(where),
    setSelection: (ids) => latest.setSelection(ids),
    updateDocument: (id, patch) => latest.updateDocument(id, patch),
    open: (id, mode) => latest.open(id, mode),
    runAction: (name, docs, input) => latest.runAction(name, docs, input),
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    handlers,
    publish: (next, nextHandlers) => {
      latest = nextHandlers;
      if (next === state) return;
      state = next;
      for (const listener of [...listeners]) listener();
    },
  };
}

export const DYRECTED_VIEW_KEY = Symbol.for("dyrected.view");

/** Provided by the operational view page when `layout === "custom"`. */
export const ViewControllerContext = createContext<ViewController | null>(null);
