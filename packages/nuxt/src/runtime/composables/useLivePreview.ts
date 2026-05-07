// @ts-ignore
import { shallowRef, ref, onMounted, onUnmounted, type ShallowRef, type Ref } from 'vue'

export interface LivePreviewOptions<T> {
  /**
   * The initial data to show before any postMessage arrives.
   * Typically the server-fetched document passed from useAsyncData.
   */
  initialData: T
  /**
   * The origin of the Dyrected Admin UI that will send preview messages.
   * Defaults to '*' (accepts from any origin).
   * Set this to your Admin URL in production for security.
   */
  serverURL?: string
  /**
   * The depth at which to resolve relationships in the preview data.
   */
  depth?: number
}

/**
 * useLivePreview — Vue composable for Dyrected live preview (postMessage mode).
 *
 * The Admin UI sends postMessage events with draft document data when the
 * editor changes. This composable listens for those messages and reactively
 * updates `data` so the preview page re-renders in real time.
 *
 * Usage:
 *   const { data, isLive } = useLivePreview({ initialData: serverData.value })
 *
 * The parent page/component must be rendered inside an iframe by the Admin UI.
 * Set `admin.previewUrl` in your collection config to point to that page.
 */
export function useLivePreview<T = any>(
  options: LivePreviewOptions<T>
): { data: ShallowRef<T>; isLive: Ref<boolean> } {
  const data = shallowRef<T>(options.initialData)
  const isLive = ref(false)

  function handleMessage(event: MessageEvent) {
    const allowedOrigin = options.serverURL || '*'

    // Origin check (skip if '*' is configured)
    if (allowedOrigin !== '*' && event.origin !== allowedOrigin) return

    const { type, data: payload } = event.data || {}

    if (type === 'dyrected-live-preview') {
      data.value = payload as T
      isLive.value = true
    }

    if (type === 'dyrected-live-preview-ready') {
      // Admin UI is asking the preview pane if it is ready
      window.parent.postMessage({ type: 'dyrected-live-preview-ack' }, allowedOrigin)
    }
  }

  onMounted(() => {
    window.addEventListener('message', handleMessage)
    // Signal the Admin UI that we're ready to receive preview data
    window.parent.postMessage({ type: 'dyrected-live-preview-ready' }, options.serverURL || '*')
  })

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
  })

  return {
    /** Reactively updated document data from the Admin UI editor. */
    data,
    /**
     * True once the first postMessage from the Admin has been received.
     * Useful to show a "Live preview active" indicator.
     */
    isLive,
  }
}
