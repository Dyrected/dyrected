import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

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

export function NestedEditorProvider({
  children,
  drillInEnabled = false,
}: {
  children: React.ReactNode
  drillInEnabled?: boolean
}) {
  const [activePath, setActivePath] = useState<PathSegment[]>([])

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

  const drillInto = useCallback((segment: PathSegment) => {
    setActivePath(prev => [...prev, segment])
  }, [])

  const navigateTo = useCallback((depth: number) => {
    setActivePath(prev => {
      if (depth === 0) return []
      return prev.slice(0, depth)
    })
  }, [])

  const reconcileAfterMutation = useCallback((basePath: string, liveStableIds: string[]) => {
    setActivePath(prev => {
      const segmentIndex = prev.findIndex(s => s.basePath === basePath)
      if (segmentIndex === -1) return prev // not in active path, no-op
      const segment = prev[segmentIndex]
      if (!segment.stableId) return prev // object field, no stableId to check
      if (liveStableIds.includes(segment.stableId)) return prev // still alive
      // Active item was deleted — pop back to the parent level
      return prev.slice(0, segmentIndex)
    })
  }, [])

  const navigateToPath = useCallback((resolvedSegments: PathSegment[]) => {
    setActivePath(resolvedSegments)
  }, [])

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
  return activePath.some(s => s.basePath === basePath || s.basePath.startsWith(basePath + '.'))
}

/**
 * Returns true if the given basePath is the deepest active segment.
 */
export function isDeepestActive(activePath: PathSegment[], basePath: string): boolean {
  if (activePath.length === 0) return false
  return activePath[activePath.length - 1].basePath === basePath
}
