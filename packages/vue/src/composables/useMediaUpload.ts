import { computed, onScopeDispose, shallowRef, watch } from "vue";
import {
  createMediaUploadController,
  type MediaUploadController,
  type MediaUploadControllerState,
  type MediaUploadHookOptions,
  type MediaUploadHookResult,
} from "@dyrected/admin/public";
import { useDyrectedClient } from "./useDyrected";
import { useAdminSchemas, type VueStateify } from "./useAdminSchemas";

export type UseMediaUploadOptions = MediaUploadHookOptions

/**
 * Vue composable for Dyrected's shared media upload pipeline.
 *
 * Use this to build a custom upload UI while reusing the admin app's queueing,
 * image compression, progress tracking, and collection resolution behavior.
 */
export function useMediaUpload({
  collectionSlug = "media",
  compressImages = true,
  maxDimension = 2048,
  quality = 0.85,
  onCompletedItem,
  onAllCompleted,
  onError,
}: UseMediaUploadOptions = {}): VueStateify<MediaUploadHookResult> {
  const client = useDyrectedClient();
  const { schemas } = useAdminSchemas();

  const createController = () =>
    createMediaUploadController({
      client,
      schemas: schemas.value,
      collection: collectionSlug,
      compressImages,
      maxDimension,
      quality,
      onCompletedItem,
      onAllCompleted,
      onError,
    });

  const controller = shallowRef<MediaUploadController>(createController());
  const state = shallowRef<MediaUploadControllerState>(controller.value.getState());
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
    queue: computed(() => state.value.queue),
    isUploading: computed(() => state.value.isUploading),
    activeCollection: computed(() => state.value.activeCollection),
    uploadFiles: (files: File[]) => controller.value.uploadFiles(files),
    retryUpload: (id: string) => controller.value.retryUpload(id),
    removeQueueItem: (id: string) => controller.value.removeQueueItem(id),
    clearCompleted: () => controller.value.clearCompleted(),
    clearQueue: () => controller.value.clearCompleted(),
    controller,
  };
}
