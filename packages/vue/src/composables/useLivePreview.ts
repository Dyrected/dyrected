import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export interface LivePreviewOptions<T> {
  /**
   * The initial data to show before any postMessage arrives.
   */
  initialData: T
  /**
   * The origin of the Dyrected Admin UI that will send preview messages.
   * Defaults to '*' (accepts from any origin).
   */
  serverURL?: string
}

/**
 * useLivePreview — Vue composable for Dyrected live preview (postMessage mode).
 *
 * Listen for postMessage events from the Admin UI and update data reactively.
 */
export function useLivePreview<T = any>(
  options: LivePreviewOptions<T>
): { data: Ref<T>; isLive: Ref<boolean> } {
  const data = ref<T>(options.initialData) as Ref<T>
  const isLive = ref(false)

  function handleMessage(event: MessageEvent) {
    const allowedOrigin = options.serverURL || '*'

    // Origin check
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
    data,
    isLive,
  }
}
