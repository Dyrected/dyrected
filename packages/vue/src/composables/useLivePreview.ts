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
 * Supports inline edit mode: when the Admin sends 'dyrected-enter-edit-mode',
 * elements with data-dy-path become clickable so the Admin sidebar scrolls to
 * the matching field.
 */
export function useLivePreview<T = any>(
  options: LivePreviewOptions<T>
): { data: Ref<T>; isLive: Ref<boolean> } {
  const data = ref<T>(options.initialData) as Ref<T>
  const isLive = ref(false)

  const origin = options.serverURL || '*'
  let cleanupEditMode: (() => void) | null = null

  function enterEditMode() {
    const elements = document.querySelectorAll<HTMLElement>('[data-dy-path]')

    const cleanups = Array.from(elements).map(el => {
      const path = el.dataset.dyPath!

      const onClick = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        window.parent.postMessage({ type: 'dyrected-element-clicked', path }, origin)
      }

      const onMouseEnter = () => {
        el.style.outline = '2px solid rgba(99,102,241,0.7)'
        el.style.outlineOffset = '2px'
        el.style.cursor = 'pointer'
      }

      const onMouseLeave = () => {
        el.style.outline = ''
        el.style.outlineOffset = ''
        el.style.cursor = ''
      }

      el.addEventListener('click', onClick, true)
      el.addEventListener('mouseenter', onMouseEnter)
      el.addEventListener('mouseleave', onMouseLeave)

      return () => {
        el.removeEventListener('click', onClick, true)
        el.removeEventListener('mouseenter', onMouseEnter)
        el.removeEventListener('mouseleave', onMouseLeave)
        el.style.outline = ''
        el.style.outlineOffset = ''
        el.style.cursor = ''
      }
    })

    return () => cleanups.forEach(fn => fn())
  }

  function handleMessage(event: MessageEvent) {
    if (origin !== '*' && event.origin !== origin) return

    const { type, data: payload } = event.data || {}

    if (type === 'dyrected-live-preview') {
      data.value = payload as T
      isLive.value = true
    }

    if (type === 'dyrected-live-preview-ready') {
      window.parent.postMessage({ type: 'dyrected-live-preview-ack' }, origin)
    }

    if (type === 'dyrected-enter-edit-mode') {
      cleanupEditMode?.()
      cleanupEditMode = enterEditMode()
    }

    if (type === 'dyrected-exit-edit-mode') {
      cleanupEditMode?.()
      cleanupEditMode = null
    }
  }

  onMounted(() => {
    window.addEventListener('message', handleMessage)
    window.parent.postMessage({ type: 'dyrected-live-preview-ready' }, origin)
  })

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
    cleanupEditMode?.()
    cleanupEditMode = null
  })

  return {
    data,
    isLive,
  }
}
