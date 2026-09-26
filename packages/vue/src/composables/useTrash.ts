import { computed, isRef, onMounted, onScopeDispose, shallowRef, unref, watch, type ComputedRef, type Ref } from "vue";
import {
  createTrashController,
  type TrashController,
  type TrashControllerState,
} from "@dyrected/admin/public";
import type { TrashEntry } from "@dyrected/sdk";
import { useDyrectedClient } from "./useDyrected";

export interface UseTrashOptions {
  pageSize?: number;
  initialSearchQuery?: string;
  onRestore?: (restored: unknown, trashId: string) => void | Promise<void>;
  onPurge?: (trashId: string) => void | Promise<void>;
  onEmpty?: () => void | Promise<void>;
}

export interface VueTrashPagination {
  page: ComputedRef<number>;
  limit: ComputedRef<number>;
  totalPages: ComputedRef<number>;
  hasNextPage: ComputedRef<boolean>;
  hasPrevPage: ComputedRef<boolean>;
  setPage: (page: number) => Promise<void>;
  setLimit: (limit: number) => Promise<void>;
}

export interface UseTrashResult {
  entries: ComputedRef<TrashEntry[]>;
  total: ComputedRef<number>;
  isLoading: ComputedRef<boolean>;
  error: ComputedRef<Error | null>;
  page: ComputedRef<number>;
  limit: ComputedRef<number>;
  totalPages: ComputedRef<number>;
  hasNextPage: ComputedRef<boolean>;
  hasPrevPage: ComputedRef<boolean>;
  searchQuery: ComputedRef<string>;
  pagination: VueTrashPagination;
  search: (query: string) => Promise<void>;
  restore: (id: string, options?: { overrides?: Record<string, unknown> }) => Promise<unknown>;
  restoreMany: (ids: string[]) => Promise<{ restored: string[]; failed: unknown[]; count: number }>;
  keep: (id: string, options?: { purgeAt?: Date | string | number | null } | boolean) => Promise<{ message: string; purgeAt: number | null }>;
  purge: (id: string) => Promise<{ message: string }>;
  empty: (confirm?: string) => Promise<{ message: string; count: number }>;
  refetch: () => Promise<void>;
  controller: Ref<TrashController>;
}

/**
 * Vue composable for browsing and managing trashed documents in a collection.
 *
 * @example
 * ```vue
 * <script setup>
 * const { entries, total, isLoading, pagination, restore, keep, purge, empty } = useTrash("guests");
 * </script>
 * ```
 */
export function useTrash(
  collection: string | Ref<string>,
  options: UseTrashOptions = {},
): UseTrashResult {
  const client = useDyrectedClient();
  const {
    pageSize = 20,
    initialSearchQuery = "",
    onRestore,
    onPurge,
    onEmpty,
  } = options;

  const getCollectionSlug = () => unref(collection);

  const createController = () =>
    createTrashController({
      client,
      collection: getCollectionSlug(),
      pageSize,
      initialSearchQuery,
      onRestore,
      onPurge,
      onEmpty,
    });

  const controller = shallowRef<TrashController>(createController());
  const state = shallowRef<TrashControllerState>(controller.value.getState());

  let unsubscribe = controller.value.subscribe(() => {
    state.value = controller.value.getState();
  });

  onMounted(() => {
    void controller.value.load();
  });

  if (isRef(collection)) {
    watch(collection, () => {
      unsubscribe();
      controller.value = createController();
      state.value = controller.value.getState();
      unsubscribe = controller.value.subscribe(() => {
        state.value = controller.value.getState();
      });
      void controller.value.load();
    });
  }

  onScopeDispose(() => {
    unsubscribe();
  });

  const page = computed(() => state.value.page);
  const limit = computed(() => state.value.limit);
  const totalPages = computed(() => state.value.totalPages);
  const hasNextPage = computed(() => state.value.hasNextPage);
  const hasPrevPage = computed(() => state.value.hasPrevPage);

  return {
    entries: computed(() => state.value.entries),
    total: computed(() => state.value.total),
    isLoading: computed(() => state.value.isLoading),
    error: computed(() => state.value.error),
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    searchQuery: computed(() => state.value.searchQuery),
    pagination: {
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
      setPage: (p: number) => controller.value.setPage(p),
      setLimit: (l: number) => controller.value.setLimit(l),
    },
    search: (query: string) => controller.value.search(query),
    restore: (id: string, opts?: { overrides?: Record<string, unknown> }) =>
      controller.value.restore(id, opts),
    restoreMany: (ids: string[]) => controller.value.restoreMany(ids),
    keep: (id: string, opts?: { purgeAt?: Date | string | number | null } | boolean) =>
      controller.value.keep(id, opts),
    purge: (id: string) => controller.value.purge(id),
    empty: (confirm?: string) => controller.value.empty(confirm),
    refetch: () => controller.value.load(),
    controller,
  };
}
