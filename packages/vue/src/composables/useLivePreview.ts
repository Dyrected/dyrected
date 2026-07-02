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
  let editModeActive = false
  let hoveredElement: HTMLElement | null = null

  const handleClick = (e: MouseEvent) => {
    if (!editModeActive) return
    const target = e.target as HTMLElement | null
    const clickable = target?.closest<HTMLElement>('[data-dy-path]')
    if (clickable) {
      e.preventDefault()
      e.stopPropagation()
      const path = clickable.getAttribute('data-dy-path') || ''
      window.parent.postMessage({ type: 'dyrected-element-clicked', path }, origin)
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!editModeActive) return
    const target = e.target as HTMLElement | null
    const clickable = target?.closest<HTMLElement>('[data-dy-path]') || null
    if (clickable !== hoveredElement) {
      if (hoveredElement) {
        hoveredElement.style.outline = ''
        hoveredElement.style.outlineOffset = ''
        hoveredElement.style.cursor = ''
      }
      if (clickable) {
        clickable.style.outline = '2px solid rgba(99,102,241,0.7)'
        clickable.style.outlineOffset = '2px'
        clickable.style.cursor = 'pointer'
      }
      hoveredElement = clickable
    }
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
      editModeActive = true
      document.addEventListener('click', handleClick, true)
      document.addEventListener('mousemove', handleMouseMove, true)
    }

    if (type === 'dyrected-exit-edit-mode') {
      editModeActive = false
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('mousemove', handleMouseMove, true)
      if (hoveredElement) {
        hoveredElement.style.outline = ''
        hoveredElement.style.outlineOffset = ''
        hoveredElement.style.cursor = ''
        hoveredElement = null
      }
    }
  }

  onMounted(() => {
    window.addEventListener('message', handleMessage)
    window.parent.postMessage({ type: 'dyrected-live-preview-ready' }, origin)
  })

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
    document.removeEventListener('click', handleClick, true)
    document.removeEventListener('mousemove', handleMouseMove, true)
    if (hoveredElement) {
      hoveredElement.style.outline = ''
      hoveredElement.style.outlineOffset = ''
      hoveredElement.style.cursor = ''
    }
  })

  return {
    data,
    isLive,
  }
}

