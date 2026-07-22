import { useMediaURL, type UseMediaURLOptions } from "./useMediaURL";

export interface UseAddMediaFromUrlOptions extends UseMediaURLOptions {}

/**
 * Backwards-compatible alias for `useMediaURL`.
 *
 * Prefer `useMediaURL` for new code.
 */
export function useAddMediaFromUrl(options: UseAddMediaFromUrlOptions) {
  return useMediaURL(options);
}
