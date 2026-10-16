import { useContext, useMemo, useSyncExternalStore } from "react";
import {
  ViewControllerContext,
  type CollectionViewState,
  type ViewController,
  type ViewControllerHandlers,
  type ViewDocument,
  type ViewLayoutConfig,
  type ViewOpenMode,
} from "../providers/view-controller";
import { groupDocuments, type GroupedDocuments } from "../lib/group-documents";
import type { SerializedAction } from "../pages/collections/views/types";

export type { ViewDocument, ViewOpenMode, ViewLayoutConfig };

/** An action a custom layout can run, already filtered by the view's feature flags. */
export type ResolvedViewAction = SerializedAction;

/**
 * State and operations for the operational view a custom layout is rendered in.
 *
 * The host owns fetching, filtering, pagination, selection and action
 * execution. A layout only renders `documents` and calls these operations.
 *
 * @experimental
 */
export interface CollectionViewApi {
  /** Serialized collection schema. */
  collection: Record<string, any>;
  viewSlug: string;
  /** Serialized view settings, including your `options`. */
  config: ViewLayoutConfig;

  /** Documents for the current page, or every document when `data.fetchAll` is set. */
  documents: ViewDocument[];
  /** Total matching documents on the server. */
  total: number;
  /** True until the first page has loaded. Render your own skeleton from this. */
  isLoading: boolean;
  /** True while any request is in flight, including background refetches. */
  isFetching: boolean;
  error?: Error;
  /** True when `data.fetchAll` hit its cap, so `documents` is a subset of `total`. */
  isTruncated: boolean;
  refetch: () => Promise<void>;

  pagination: { page: number; pageSize: number; totalPages: number; setPage: (page: number) => void };
  sort: {
    value?: { field: string; direction: "asc" | "desc" };
    set: (next: { field: string; direction: "asc" | "desc" } | undefined) => void;
  };
  search: { value: string; set: (query: string) => void };
  /**
   * `where` is the effective server filter. `set` adds a layout-owned filter
   * that is AND-merged with the toolbar's, and `set(undefined)` clears it.
   */
  filters: {
    where: Record<string, any> | undefined;
    set: (where: Record<string, any> | undefined) => void;
  };

  selection: {
    ids: Set<string>;
    docs: ViewDocument[];
    toggle: (id: string) => void;
    set: (ids: Iterable<string>) => void;
    clear: () => void;
  };

  /**
   * Updates one document through the normal update path (hooks, access and
   * validation run). The change shows immediately and rolls back, with an
   * error toast, if the server rejects it.
   */
  updateDocument: (id: string, patch: Record<string, unknown>) => Promise<ViewDocument>;

  /** Opens a document in the detail view, the edit form or the side drawer. */
  open: (id: string, mode?: ViewOpenMode) => void;
  /** UI hints only. The server enforces access. */
  permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean };
  urls: { collection: string; create: string };
}

export interface ViewActionsApi {
  actions: ResolvedViewAction[];
  /**
   * Runs an action through the host: confirmation dialog and input form
   * included. Pass `input` to answer the form programmatically. `docs`
   * defaults to the current selection. Resolves `true` once the action was
   * dispatched. When a dialog is shown, it resolves right away and progress is
   * reported through `isRunning`.
   */
  run: (name: string, docs?: ViewDocument[], input?: Record<string, unknown>) => Promise<boolean>;
  isRunning: (name: string, docs?: ViewDocument[]) => boolean;
}

/** Looks up the controller, failing loudly outside a custom layout. */
export function useViewController(hookName: string): ViewController {
  const controller = useContext(ViewControllerContext);
  if (!controller) {
    throw new Error(`${hookName}() must be used inside a custom view layout (layout: "custom").`);
  }
  return controller;
}

export function buildCollectionViewApi(
  state: CollectionViewState,
  handlers: ViewControllerHandlers,
): CollectionViewApi {
  const selectedIds = new Set(state.selectedIds);
  return {
    collection: state.collection,
    viewSlug: state.viewSlug,
    config: state.config,
    documents: state.documents,
    total: state.total,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    error: state.error,
    isTruncated: state.isTruncated,
    refetch: handlers.refetch,
    pagination: { ...state.pagination, setPage: handlers.setPage },
    sort: { value: state.sort, set: handlers.setSort },
    search: { value: state.search, set: handlers.setSearch },
    filters: { where: state.where, set: handlers.setFilters },
    selection: {
      ids: selectedIds,
      docs: state.documents.filter((doc) => selectedIds.has(String(doc.id))),
      toggle: (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        handlers.setSelection([...next]);
      },
      set: (ids) => handlers.setSelection([...ids]),
      clear: () => handlers.setSelection([]),
    },
    updateDocument: handlers.updateDocument,
    open: handlers.open,
    permissions: state.permissions,
    urls: state.urls,
  };
}

function useViewState(controller: ViewController): CollectionViewState {
  return useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
}

/**
 * React hook for custom view layouts. See {@link CollectionViewApi}.
 *
 * @experimental
 */
export function useCollectionView(): CollectionViewApi {
  const controller = useViewController("useCollectionView");
  const state = useViewState(controller);
  return useMemo(() => buildCollectionViewApi(state, controller.handlers), [state, controller]);
}

/**
 * React hook for running the view's actions from a custom layout. The host
 * shows its own confirm dialog and input form, so layouts never rebuild them.
 *
 * @experimental
 */
export function useViewActions(): ViewActionsApi {
  const controller = useViewController("useViewActions");
  const state = useViewState(controller);
  return useMemo(() => {
    const keyOf = (name: string, docs?: ViewDocument[]) => {
      const ids = (docs ?? state.documents.filter((d) => state.selectedIds.includes(String(d.id)))).map((d) =>
        String(d.id),
      );
      return `${name}::${[...ids].sort().join(",")}`;
    };
    return {
      actions: state.actions,
      run: (name, docs, input) => controller.handlers.runAction(name, docs, input),
      isRunning: (name, docs) => state.runningActions.includes(keyOf(name, docs)),
    };
  }, [controller, state]);
}

/**
 * Groups the view's documents by a field, resolving select labels and
 * populated relationship names. Optional sugar: layouts can group themselves.
 *
 * @experimental
 */
export function useGroupedDocuments(groupBy: string): GroupedDocuments {
  const controller = useViewController("useGroupedDocuments");
  const state = useViewState(controller);
  return useMemo(
    () => groupDocuments(state.documents, groupBy, state.collection as { fields?: any[] }),
    [state.documents, state.collection, groupBy],
  );
}
