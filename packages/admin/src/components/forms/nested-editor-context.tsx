import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { joinFieldPath } from '../../controllers/form'

export interface PathSegment {
  /** Schema field name at this level (e.g. "body", "cta"). */
  fieldName: string
  /**
   * Cumulative RHF-resolvable path up to and including this segment
   * (e.g. "body.2" or "body.2.items.1"). Used to disambiguate
   * identically-named sub-arrays/objects that live inside different
   * parent block types, and to correlate mutation reports back to a
   * depth in activePath.
   */
  basePath: string
  /**
   * Stable id from useFieldArray (`field.id`) if this segment is an
   * item inside an array/blocks field. Undefined for object fields
   * and the root.
   */
  stableId?: string
  /** Human-readable label for the breadcrumb (e.g. "Hero", "Button"). */
  breadcrumbLabel: string
}

export interface NestedEditorContextValue {
  /**
   * Whether drill-in (nested-form) navigation is active. When false, nested
   * containers (blocks/array/object) render inline as a flat form instead of
   * as drillable rows. Driven by the edit page's live-preview mode.
   */
  drillInEnabled: boolean
  /** Ordered path segments. Root = []. */
  activePath: PathSegment[]
  /**
   * Push a segment. Called by BlockBuilder/ArrayFieldRenderer/ObjectFieldRenderer
   * "Edit"/"Drill In" actions.
   * The caller computes segment.basePath cumulatively:
   *   basePath = parentSegment.basePath + "." + index  (for array/blocks items)
   *   basePath = parentSegment.basePath + "." + fieldName  (for object fields)
   */
  drillInto: (segment: PathSegment) => void
  /**
   * Navigate back to a specific depth. 0 = root. Called by breadcrumb clicks.
   */
  navigateTo: (depth: number) => void
  /**
   * Called after move/remove/insert on a field array. Matches by
   * segment.basePath (NOT bare fieldName) so identically-named sub-arrays
   * in different block types are correctly disambiguated.
   * If the active segment's stableId is no longer present in liveStableIds,
   * pops back to the parent level.
   */
  reconcileAfterMutation: (basePath: string, liveStableIds: string[]) => void
  /**
   * Imperatively navigate to a resolved container path. Called by the
   * error-summary click handler and the preview click-to-edit handler.
   */
  navigateToPath: (resolvedSegments: PathSegment[]) => void
  /**
   * Publish the live useFieldArray id list for a given basePath. Called by
   * each drill-capable renderer (BlockBuilder, and ArrayFieldRenderer when
   * drillIn is active) so top-level code can resolve stable ids by
   * (basePath, index) without access to the nested field-array instances.
   */
  registerFieldArray: (basePath: string, ids: string[]) => void
  /** Remove a basePath's published ids (called on renderer unmount). */
  unregisterFieldArray: (basePath: string) => void
  /**
   * Resolve the stable useFieldArray id at (basePath, rawIndex) from the
   * published registry. Returns undefined if the array isn't registered or
   * the index is out of range. Passed to `resolveContainerPath`.
   */
  getStableId: (basePath: string, rawIndex: number) => string | undefined
}

export const NestedEditorContext = createContext<NestedEditorContextValue | null>(null)

/**
 * Query-string key holding the serialized drill-in trail. Keeping the trail in
 * the URL means drilling into a block pushes a history entry, so the browser
 * (and the mobile back button) can step back out of a block to its list, and
 * deep links / refreshes restore the drilled-in view.
 */
const BLOCK_PARAM = 'block'

/** Serialize a trail to a compact JSON string for the URL. */
function serializeTrail(trail: PathSegment[]): string {
  return JSON.stringify(
    trail.map(s => ({ f: s.fieldName, b: s.basePath, l: s.breadcrumbLabel, s: s.stableId })),
  )
}

/** Parse the serialized trail back into PathSegments (tolerant of bad input). */
function parseTrail(raw: string | null): PathSegment[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter(s => s && typeof s.b === 'string' && typeof s.f === 'string')
      .map(s => ({
        fieldName: String(s.f),
        basePath: String(s.b),
        breadcrumbLabel: typeof s.l === 'string' ? s.l : String(s.f),
        stableId: typeof s.s === 'string' ? s.s : undefined,
      }))
  } catch {
    return []
  }
}

export function NestedEditorProvider({
  children,
  drillInEnabled = false,
}: {
  children: React.ReactNode
  drillInEnabled?: boolean
}) {
  const [searchParams, setSearchParams] = useSearchParams()

  // The URL is the source of truth for the drill trail — deriving activePath
  // from it (rather than local state) is what makes browser back/forward work.
  // Ignored entirely when drill-in is disabled (blocks render inline).
  const rawTrail = drillInEnabled ? searchParams.get(BLOCK_PARAM) : null
  const activePath = useMemo(() => parseTrail(rawTrail), [rawTrail])

  // Latest searchParams for imperative callbacks that must read-then-write
  // without a stale closure (and without re-creating the callbacks each render).
  const searchParamsRef = useRef(searchParams)
  useEffect(() => {
    searchParamsRef.current = searchParams
  }, [searchParams])

  // Live map of basePath -> ordered useFieldArray ids, published by each
  // drill-capable renderer. Kept in a ref so registration never re-renders.
  const fieldArrayRegistry = useRef<Map<string, string[]>>(new Map())

  const registerFieldArray = useCallback((basePath: string, ids: string[]) => {
    fieldArrayRegistry.current.set(basePath, ids)
  }, [])

  const unregisterFieldArray = useCallback((basePath: string) => {
    fieldArrayRegistry.current.delete(basePath)
  }, [])

  const getStableId = useCallback((basePath: string, rawIndex: number) => {
    return fieldArrayRegistry.current.get(basePath)?.[rawIndex]
  }, [])

  // Write a trail to the URL. `push` adds a history entry (drilling deeper);
  // `replace` corrects state in place (e.g. after a deletion) without one.
  const writeTrail = useCallback(
    (trail: PathSegment[], mode: 'push' | 'replace') => {
      const next = new URLSearchParams(searchParamsRef.current)
      if (trail.length === 0) next.delete(BLOCK_PARAM)
      else next.set(BLOCK_PARAM, serializeTrail(trail))
      setSearchParams(next, { replace: mode === 'replace' })
    },
    [setSearchParams],
  )

  const drillInto = useCallback((segment: PathSegment) => {
    const current = parseTrail(searchParamsRef.current.get(BLOCK_PARAM))
    writeTrail([...current, segment], 'push')
  }, [writeTrail])

  const navigateTo = useCallback((depth: number) => {
    const current = parseTrail(searchParamsRef.current.get(BLOCK_PARAM))
    writeTrail(depth === 0 ? [] : current.slice(0, depth), 'push')
  }, [writeTrail])

  const reconcileAfterMutation = useCallback((basePath: string, liveStableIds: string[]) => {
    const current = parseTrail(searchParamsRef.current.get(BLOCK_PARAM))
    const segmentIndex = current.findIndex(s => s.basePath === basePath)
    if (segmentIndex === -1) return // not in active path, no-op
    const segment = current[segmentIndex]
    if (!segment.stableId) return // object field, no stableId to check
    if (liveStableIds.includes(segment.stableId)) return // still alive
    // Active item was deleted — pop back to the parent level (in place).
    writeTrail(current.slice(0, segmentIndex), 'replace')
  }, [writeTrail])

  const navigateToPath = useCallback((resolvedSegments: PathSegment[]) => {
    writeTrail(resolvedSegments, 'push')
  }, [writeTrail])

  const value = useMemo<NestedEditorContextValue>(() => ({
    drillInEnabled,
    activePath,
    drillInto,
    navigateTo,
    reconcileAfterMutation,
    navigateToPath,
    registerFieldArray,
    unregisterFieldArray,
    getStableId,
  }), [drillInEnabled, activePath, drillInto, navigateTo, reconcileAfterMutation, navigateToPath, registerFieldArray, unregisterFieldArray, getStableId])

  return (
    <NestedEditorContext.Provider value={value}>
      {children}
    </NestedEditorContext.Provider>
  )
}

export function useNestedEditor(): NestedEditorContextValue {
  const ctx = useContext(NestedEditorContext)
  if (!ctx) throw new Error('useNestedEditor must be used inside NestedEditorProvider')
  return ctx
}

/**
 * Returns true if the given basePath is at or below the current activePath.
 * Used by renderers to decide whether to show list-view or focused sub-form.
 */
export function isActiveOrChild(activePath: PathSegment[], basePath: string): boolean {
  if (activePath.length === 0) return false
  return activePath.some(s => s.basePath === basePath || s.basePath.startsWith(`${joinFieldPath(basePath)}.`))
}

/**
 * Returns true if the given basePath is the deepest active segment.
 */
export function isDeepestActive(activePath: PathSegment[], basePath: string): boolean {
  if (activePath.length === 0) return false
  return activePath[activePath.length - 1].basePath === basePath
}
