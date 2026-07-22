import * as React from "react";
import {
  createMediaUploadController,
  type MediaUploadController,
  type MediaUploadHookOptions,
  type MediaUploadHookResult,
} from "@dyrected/admin/public";
import { useDyrected } from "./useDyrected";
import { useAdminSchemas } from "./useAdminSchemas";

export type UseMediaUploadOptions = MediaUploadHookOptions

/**
 * React hook for Dyrected's shared media upload pipeline.
 *
 * Use this when you want to build a custom upload UI in React while keeping the
 * same queueing, image compression, progress tracking, and collection fallback
 * behavior used by the admin app.
 */
export function useMediaUpload({
  collectionSlug = "media",
  compressImages = true,
  maxDimension = 2048,
  quality = 0.85,
  onCompletedItem,
  onAllCompleted,
  onError,
}: UseMediaUploadOptions = {}): MediaUploadHookResult {
  const { client } = useDyrected();
  const { schemas } = useAdminSchemas();
  const handlersRef = React.useRef({
    onCompletedItem,
    onAllCompleted,
    onError,
  });

  handlersRef.current = {
    onCompletedItem,
    onAllCompleted,
    onError,
  };

  const controller = React.useMemo<MediaUploadController>(() => {
    return createMediaUploadController({
      client,
      schemas,
      collection: collectionSlug,
      compressImages,
      maxDimension,
      quality,
      onCompletedItem: async (item) => {
        await handlersRef.current.onCompletedItem?.(item);
      },
      onAllCompleted: async (items) => {
        await handlersRef.current.onAllCompleted?.(items);
      },
      onError: (error, file) => {
        handlersRef.current.onError?.(error, file);
      },
    });
  }, [client, schemas, collectionSlug, compressImages, maxDimension, quality]);

  const state = React.useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);

  return {
    /** The queue of files waiting to be uploaded. */
    queue: state.queue,
    /** Whether the queue is currently uploading. */
    isUploading: state.isUploading,
    /** The collection currently being uploaded to. */
    activeCollection: state.activeCollection,
    /** Upload files. */
    uploadFiles: controller.uploadFiles,
    /** Retry a failed upload. */
    retryUpload: controller.retryUpload,
    /** Remove an item from the queue. */
    removeQueueItem: controller.removeQueueItem,
    /** Clear completed items from the queue. */
    clearCompleted: controller.clearCompleted,
    /** Clear the entire queue. */
    clearQueue: controller.clearCompleted,
    /** The controller instance. */
    controller,
  };
}
