import * as React from "react";
import { useDyrected } from "../providers/dyrected-context";
import { createMediaUploadController, type MediaRecord, type MediaUploadController } from "../controllers/media";

export interface UseMediaUploadOptions {
  collectionSlug?: string;
  compressImages?: boolean;
  maxDimension?: number;
  quality?: number;
  onCompletedItem?: (item: MediaRecord) => void | Promise<void>;
  onAllCompleted?: (items: MediaRecord[]) => void | Promise<void>;
  onError?: (error: Error, file: File) => void;
}

export function useMediaUpload({
  collectionSlug = "media",
  compressImages = true,
  maxDimension = 2048,
  quality = 0.85,
  onCompletedItem,
  onAllCompleted,
  onError,
}: UseMediaUploadOptions = {}) {
  const { client, schemas } = useDyrected();
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
    queue: state.queue,
    isUploading: state.isUploading,
    activeCollection: state.activeCollection,
    uploadFiles: controller.uploadFiles,
    retryUpload: controller.retryUpload,
    removeQueueItem: controller.removeQueueItem,
    clearCompleted: controller.clearCompleted,
    clearQueue: controller.clearCompleted,
  };
}
