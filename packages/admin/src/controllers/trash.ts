import type { DyrectedClient, TrashEntry } from "@dyrected/sdk";

type Listener = () => void;
type MaybePromise<T> = T | Promise<T>;

export interface TrashControllerState {
  entries: TrashEntry[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  searchQuery: string;
}

export interface TrashControllerOptions {
  client: DyrectedClient | null;
  collection: string;
  pageSize?: number;
  initialSearchQuery?: string;
  onRestore?: (restored: unknown, trashId: string) => MaybePromise<void>;
  onPurge?: (trashId: string) => MaybePromise<void>;
  onEmpty?: () => MaybePromise<void>;
}

export interface TrashController {
  getState(): TrashControllerState;
  subscribe(listener: Listener): () => void;
  load(): Promise<void>;
  setPage(page: number): Promise<void>;
  setLimit(limit: number): Promise<void>;
  search(query: string): Promise<void>;
  restore(id: string, options?: { overrides?: Record<string, unknown> }): Promise<unknown>;
  restoreMany(ids: string[]): Promise<{ restored: string[]; failed: unknown[]; count: number }>;
  keep(id: string, options?: { purgeAt?: Date | string | number | null } | boolean): Promise<{ message: string; purgeAt: number | null }>;
  purge(id: string): Promise<{ message: string }>;
  empty(confirm?: string): Promise<{ message: string; count: number }>;
}

export function createTrashController(options: TrashControllerOptions): TrashController {
  const {
    client,
    collection,
    pageSize = 20,
    initialSearchQuery = "",
    onRestore,
    onPurge,
    onEmpty,
  } = options;

  let state: TrashControllerState = {
    entries: [],
    total: 0,
    isLoading: false,
    error: null,
    page: 1,
    limit: pageSize,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    searchQuery: initialSearchQuery,
  };

  const listeners = new Set<Listener>();

  const notify = () => {
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error("[TrashController] listener error:", e);
      }
    });
  };

  const updateState = (updater: (prev: TrashControllerState) => TrashControllerState) => {
    const next = updater(state);
    if (next !== state) {
      state = next;
      notify();
    }
  };

  let activeRequestId = 0;

  const load = async (): Promise<void> => {
    if (!client || !collection) return;
    const reqId = ++activeRequestId;

    updateState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await client.trash(collection).list({
        page: state.page,
        limit: state.limit,
        search: state.searchQuery || undefined,
      });

      if (reqId !== activeRequestId) return; // stale request guard

      updateState((prev) => ({
        ...prev,
        entries: res.docs,
        total: res.total,
        totalPages: res.totalPages,
        page: res.page,
        limit: res.limit,
        hasNextPage: res.hasNextPage,
        hasPrevPage: res.hasPrevPage,
        isLoading: false,
        error: null,
      }));
    } catch (err: any) {
      if (reqId !== activeRequestId) return;
      updateState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  };

  return {
    getState: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load,
    setPage: async (page: number) => {
      if (page === state.page) return;
      updateState((prev) => ({ ...prev, page }));
      await load();
    },
    setLimit: async (limit: number) => {
      if (limit === state.limit) return;
      updateState((prev) => ({ ...prev, limit, page: 1 }));
      await load();
    },
    search: async (query: string) => {
      if (query === state.searchQuery) return;
      updateState((prev) => ({ ...prev, searchQuery: query, page: 1 }));
      await load();
    },
    restore: async (id: string, opts?: { overrides?: Record<string, unknown> }) => {
      if (!client) throw new Error("DyrectedClient not provided");
      const res = await client.trash(collection).restore(id, opts);
      if (onRestore) {
        await onRestore(res, id);
      }
      await load();
      return res;
    },
    restoreMany: async (ids: string[]) => {
      if (!client) throw new Error("DyrectedClient not provided");
      const res = await client.trash(collection).restoreMany(ids);
      if (onRestore) {
        for (const id of res.restored) {
          await onRestore(null, id);
        }
      }
      await load();
      return res;
    },
    keep: async (id: string, opts?: { purgeAt?: Date | string | number | null } | boolean) => {
      if (!client) throw new Error("DyrectedClient not provided");
      const res = await client.trash(collection).keep(id, opts);
      await load();
      return res;
    },
    purge: async (id: string) => {
      if (!client) throw new Error("DyrectedClient not provided");
      const res = await client.trash(collection).purge(id);
      if (onPurge) {
        await onPurge(id);
      }
      await load();
      return res;
    },
    empty: async (confirm?: string) => {
      if (!client) throw new Error("DyrectedClient not provided");
      const res = await client.trash(collection).empty(confirm);
      if (onEmpty) {
        await onEmpty();
      }
      await load();
      return res;
    },
  };
}
