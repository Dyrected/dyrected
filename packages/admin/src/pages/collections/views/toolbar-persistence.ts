/**
 * Session-scoped persistence for operational view toolbar state.
 *
 * Keeps column filters and page size alive across route changes (e.g. opening
 * a document detail page and coming back) without leaking between views.
 */
export interface StoredToolbarState {
  columnFilters?: unknown[]
  pageSize?: number
  sorting?: { id: string; desc?: boolean }[]
}

export function loadToolbarState(key: string): StoredToolbarState | undefined {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as StoredToolbarState) : undefined
  } catch {
    return undefined
  }
}

export function persistToolbarState(key: string, patch: StoredToolbarState): void {
  try {
    const next = { ...loadToolbarState(key), ...patch }
    sessionStorage.setItem(key, JSON.stringify(next))
  } catch {
    // Storage may be unavailable (private mode, quota) — persistence is best-effort.
  }
}
