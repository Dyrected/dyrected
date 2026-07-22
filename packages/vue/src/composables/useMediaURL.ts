import { computed, ref, shallowRef, onScopeDispose, watch } from "vue";
import {
  createMediaURLController,
  type MediaURLClassification,
  type MediaURLController,
  type MediaURLControllerState,
  type MediaURLHookOptions,
  type MediaURLHookResult,
} from "@dyrected/admin/public";
import { useDyrectedClient } from "./useDyrected";
import { useAdminSchemas, type VueStateify } from "./useAdminSchemas";

export type UseMediaURLOptions = MediaURLHookOptions

/**
 * Vue composable for Dyrected's URL-based media ingestion flow.
 *
 * It classifies external URLs and routes them through the same shared media
 * ingestion behavior used by the admin app.
 */
export function useMediaURL({
  collection,
  compressImages = true,
  maxDimension = 2048,
  quality = 0.85,
  onAdded,
  onError,
}: UseMediaURLOptions): VueStateify<MediaURLHookResult> {
  const client = useDyrectedClient();
  const { schemas } = useAdminSchemas();
  const url = ref("");

  const createController = () =>
    createMediaURLController({
      client,
      schemas: schemas.value,
      collection,
      compressImages,
      maxDimension,
      quality,
      onAdded,
      onError,
    });

  const controller = shallowRef<MediaURLController>(createController());
  const state = shallowRef<MediaURLControllerState>(controller.value.getState());
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

  const submit = async () => {
    const trimmed = url.value.trim();
    if (!trimmed) return;
    await controller.value.importURL(trimmed);
    url.value = "";
  };

  const classifyURL = (nextUrl: string): MediaURLClassification => controller.value.classifyURL(nextUrl);

  return {
    url,
    setUrl: (nextUrl: string) => {
      url.value = nextUrl;
    },
    submit,
    importURL: (nextUrl: string) => controller.value.importURL(nextUrl),
    classifyURL,
    isSubmitting: computed(() => state.value.isSubmitting),
    canSubmit: computed(() => !!url.value.trim() && !state.value.isSubmitting),
    activeCollection: computed(() => state.value.activeCollection),
    controller,
  };
}
