import { useMediaURL, type UseMediaURLOptions } from "./use-media-url"

export interface UseAddMediaFromUrlOptions extends UseMediaURLOptions {}

/**
 * @deprecated Use `useMediaURL` for new code. This alias exists for backwards compatibility.
 */
export function useAddMediaFromUrl(options: UseAddMediaFromUrlOptions) {
  return useMediaURL(options)
}
