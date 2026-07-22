import * as React from "react";
import {
  createMediaURLController,
  type MediaURLClassification,
  type MediaURLController,
  type MediaURLHookOptions,
  type MediaURLHookResult,
} from "@dyrected/admin/public";
import { useDyrected } from "./useDyrected";
import { useAdminSchemas } from "./useAdminSchemas";

export type UseMediaURLOptions = MediaURLHookOptions

/**
 * React hook for Dyrected's URL-based media ingestion flow.
 *
 * It classifies YouTube/Vimeo links, direct images, videos, and generic files,
 * then routes each URL through the same shared ingestion behavior used by the
 * admin app.
 */
export function useMediaURL({
  collection,
  compressImages = true,
  maxDimension = 2048,
  quality = 0.85,
  onAdded,
  onError,
}: UseMediaURLOptions): MediaURLHookResult {
  const { client } = useDyrected();
  const { schemas } = useAdminSchemas();
  const [url, setUrl] = React.useState("");
  const handlersRef = React.useRef({ onAdded, onError });

  handlersRef.current = { onAdded, onError };

  const controller = React.useMemo<MediaURLController>(() => {
    return createMediaURLController({
      client,
      schemas,
      collection,
      compressImages,
      maxDimension,
      quality,
      onAdded: async (item) => {
        await handlersRef.current.onAdded?.(item);
      },
      onError: (error) => {
        handlersRef.current.onError?.(error);
      },
    });
  }, [client, schemas, collection, compressImages, maxDimension, quality]);

  const state = React.useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);

  const submit = React.useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    await controller.importURL(trimmed);
    setUrl("");
  }, [controller, url]);

  const classifyURL = React.useCallback(
    (nextUrl: string): MediaURLClassification => controller.classifyURL(nextUrl),
    [controller],
  );

  return {
    /** The URL to import. */
    url,
    /** Set the URL to import. */
    setUrl,
    /** Import the URL. */
    submit,
    /** Import the URL. */
    importURL: controller.importURL,
    /** Classify the URL. */
    classifyURL,
    /** Whether the URL is submitting. */
    isSubmitting: state.isSubmitting,
    /** Whether the URL can be submitted. */
    canSubmit: !!url.trim() && !state.isSubmitting,
    /** The active collection. */
    activeCollection: state.activeCollection,
    /** The controller instance. */
    controller,
  };
}
