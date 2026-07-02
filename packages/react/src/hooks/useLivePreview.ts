import { useState, useEffect } from 'react';

export interface LivePreviewOptions<T> {
  /**
   * The initial data to show before any postMessage arrives.
   * Typically the server-fetched document passed from initial props.
   */
  initialData: T;
  /**
   * The origin of the Dyrected Admin UI that will send preview messages.
   * Defaults to '*' (accepts from any origin).
   * Set this to your Admin URL in production for security.
   */
  serverURL?: string;
}

/**
 * useLivePreview — React hook for Dyrected live preview (postMessage mode).
 *
 * The Admin UI sends postMessage events with draft document data when the
 * editor changes. This hook listens for those messages and reactively
 * updates `data` so the preview page re-renders in real time.
 */
export function useLivePreview<T = any>(
  options: LivePreviewOptions<T>
): { data: T; isLive: boolean } {
  const [data, setData] = useState<T>(options.initialData);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const allowedOrigin = options.serverURL || '*';
    let editModeActive = false;
    let hoveredElement: HTMLElement | null = null;

    // Handle clicks on any element with data-dy-path (or its children)
    const handleClick = (e: MouseEvent) => {
      if (!editModeActive) return;
      const target = e.target as HTMLElement | null;
      const clickable = target?.closest<HTMLElement>('[data-dy-path]');
      if (clickable) {
        e.preventDefault();
        e.stopPropagation();
        const path = clickable.getAttribute('data-dy-path') || '';
        window.parent.postMessage({ type: 'dyrected-element-clicked', path }, allowedOrigin);
      }
    };

    // Track mouse moves to dynamically highlight hovered data-dy-path elements
    const handleMouseMove = (e: MouseEvent) => {
      if (!editModeActive) return;
      const target = e.target as HTMLElement | null;
      const clickable = target?.closest<HTMLElement>('[data-dy-path]') || null
      if (clickable !== hoveredElement) {
        if (hoveredElement) {
          hoveredElement.style.outline = '';
          hoveredElement.style.outlineOffset = '';
          hoveredElement.style.cursor = '';
        }
        if (clickable) {
          clickable.style.outline = '2px solid rgba(99,102,241,0.7)';
          clickable.style.outlineOffset = '2px';
          clickable.style.cursor = 'pointer';
        }
        hoveredElement = clickable;
      }
    };

    function handleMessage(event: MessageEvent) {
      // Origin check (skip if '*' is configured)
      if (allowedOrigin !== '*' && event.origin !== allowedOrigin) return;

      const { type, data: payload } = event.data || {};

      if (type === 'dyrected-live-preview') {
        setData(payload as T);
        setIsLive(true);
      }

      if (type === 'dyrected-live-preview-ready') {
        // Admin UI is asking the preview pane if it is ready
        window.parent.postMessage({ type: 'dyrected-live-preview-ack' }, allowedOrigin);
      }

      if (type === 'dyrected-enter-edit-mode') {
        editModeActive = true;
        document.addEventListener('click', handleClick, true);
        document.addEventListener('mousemove', handleMouseMove, true);
      }

      if (type === 'dyrected-exit-edit-mode') {
        editModeActive = false;
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('mousemove', handleMouseMove, true);
        if (hoveredElement) {
          hoveredElement.style.outline = '';
          hoveredElement.style.outlineOffset = '';
          hoveredElement.style.cursor = '';
          hoveredElement = null;
        }
      }
    }

    window.addEventListener('message', handleMessage);
    
    // Signal the Admin UI that we're ready to receive preview data
    window.parent.postMessage({ type: 'dyrected-live-preview-ready' }, allowedOrigin);

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
      if (hoveredElement) {
        hoveredElement.style.outline = '';
        hoveredElement.style.outlineOffset = '';
        hoveredElement.style.cursor = '';
      }
    };
  }, [options.serverURL]);

  // Update data if initialData changes externally (e.g. server-side re-fetch)
  useEffect(() => {
    if (!isLive) {
      setData(options.initialData);
    }
  }, [options.initialData, isLive]);

  return {
    /** Updated document data from the Admin UI editor. */
    data,
    /** True once the first postMessage from the Admin has been received. */
    isLive,
  };
}

