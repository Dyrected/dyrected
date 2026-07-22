import { computed, onScopeDispose, shallowRef, watch } from "vue";
import {
  createMediaLibraryController,
  type MediaLibraryController,
  type MediaLibraryControllerState,
  type MediaLibraryHookOptions,
  type MediaLibraryHookResult,
} from "@dyrected/admin/public";
import { useDyrectedClient } from "./useDyrected";
import { useAdminSchemas, type VueStateify } from "./useAdminSchemas";

export type UseMediaLibraryOptions = MediaLibraryHookOptions

/**
 * Vue composable for browsing and selecting media from the Dyrected media library.
 *
 * It exposes reactive pagination, search, selection, and loading state so host
 * apps can build their own picker UI without reimplementing library behavior.
 */
export function useMediaLibrary({
  collection,
  pageSize = 12,
  initialSearchQuery = "",
  initialSelectedIds = [],
}: UseMediaLibraryOptions): VueStateify<MediaLibraryHookResult> {
  const client = useDyrectedClient();
  const { schemas } = useAdminSchemas();

  const createController = () =>
    createMediaLibraryController({
      client,
      schemas: schemas.value,
      collection,
      pageSize,
      initialSearchQuery,
      initialSelectedIds,
    });

  const controller = shallowRef<MediaLibraryController>(createController());
  const state = shallowRef<MediaLibraryControllerState>(controller.value.getState());
  let unsubscribe = controller.value.subscribe(() => {
    state.value = controller.value.getState();
  });

  watch(
    () => schemas.value,
    () => {
      unsubscribe();
      controller.value = createController();
      state.value = controller.value.getState();
      unsubscribe = controller.value.subscribe(() => {
        state.value = controller.value.getState();
      });
    },
  );

  onScopeDispose(() => {
    unsubscribe();
  });

  return {
    items: computed(() => state.value.items),
    selectedIds: computed(() => state.value.selectedIds),
    selectedItems: computed(() => state.value.items.filter((item) => state.value.selectedIds.includes(item.id))),
    searchQuery: computed(() => state.value.searchQuery),
    page: computed(() => state.value.page),
    hasNextPage: computed(() => state.value.hasNextPage),
    isLoading: computed(() => state.value.isLoading),
    error: computed(() => state.value.error),
    activeCollection: computed(() => state.value.activeCollection),
    load: () => controller.value.load(),
    search: (query: string) => controller.value.search(query),
    loadNextPage: () => controller.value.loadNextPage(),
    setSelectedIds: (ids: string[]) => controller.value.setSelectedIds(ids),
    select: (id: string) => controller.value.select(id),
    deselect: (id: string) => controller.value.deselect(id),
    toggle: (id: string) => controller.value.toggle(id),
    clearSelection: () => controller.value.clearSelection(),
    controller,
  };
}
