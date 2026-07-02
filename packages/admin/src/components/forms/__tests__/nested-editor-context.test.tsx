// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { ReactNode } from "react"
import {
  NestedEditorProvider,
  useNestedEditor,
  isActiveOrChild,
  isDeepestActive,
  type PathSegment,
} from "../nested-editor-context"

const wrapper = ({ children }: { children: ReactNode }) => (
  <NestedEditorProvider>{children}</NestedEditorProvider>
)

const seg = (over: Partial<PathSegment> & { basePath: string }): PathSegment => ({
  fieldName: over.fieldName ?? over.basePath.split(".").slice(-2, -1)[0] ?? over.basePath,
  breadcrumbLabel: over.breadcrumbLabel ?? "L",
  ...over,
})

describe("NestedEditorContext", () => {
  it("drillInto pushes a segment and navigateTo(0) resets to root", () => {
    const { result } = renderHook(() => useNestedEditor(), { wrapper })
    expect(result.current.activePath).toEqual([])

    act(() => result.current.drillInto(seg({ basePath: "body.0", stableId: "a" })))
    expect(result.current.activePath).toHaveLength(1)

    act(() => result.current.drillInto(seg({ basePath: "body.0.items.1", stableId: "b" })))
    expect(result.current.activePath).toHaveLength(2)

    act(() => result.current.navigateTo(1))
    expect(result.current.activePath).toHaveLength(1)

    act(() => result.current.navigateTo(0))
    expect(result.current.activePath).toEqual([])
  })

  it("reconcileAfterMutation pops when the active stableId disappears", () => {
    const { result } = renderHook(() => useNestedEditor(), { wrapper })
    act(() => result.current.drillInto(seg({ basePath: "body.0", stableId: "keep" })))
    act(() => result.current.drillInto(seg({ basePath: "body.0.items.1", stableId: "gone" })))
    expect(result.current.activePath).toHaveLength(2)

    // The inner array no longer contains "gone" → pop back to parent depth.
    act(() => result.current.reconcileAfterMutation("body.0.items.1", ["other"]))
    expect(result.current.activePath).toHaveLength(1)
    expect(result.current.activePath[0].basePath).toBe("body.0")
  })

  it("reconcileAfterMutation leaves the path unchanged when the item still exists", () => {
    const { result } = renderHook(() => useNestedEditor(), { wrapper })
    act(() => result.current.drillInto(seg({ basePath: "body.0", stableId: "keep" })))
    act(() => result.current.reconcileAfterMutation("body.0", ["keep", "x"]))
    expect(result.current.activePath).toHaveLength(1)
  })

  it("reconcileAfterMutation does not false-match a same-named field at a different basePath", () => {
    const { result } = renderHook(() => useNestedEditor(), { wrapper })
    // Active item lives at body.5.items.0; a mutation reports body.2.items — a
    // different array that happens to share the bare field name "items".
    act(() => result.current.drillInto(seg({ basePath: "body.5", stableId: "p" })))
    act(() => result.current.drillInto(seg({ basePath: "body.5.items.0", stableId: "q" })))
    act(() => result.current.reconcileAfterMutation("body.2.items", []))
    expect(result.current.activePath).toHaveLength(2)
  })

  it("registerFieldArray + getStableId round-trips ids by (basePath, index)", () => {
    const { result } = renderHook(() => useNestedEditor(), { wrapper })
    act(() => result.current.registerFieldArray("body", ["id0", "id1", "id2"]))
    expect(result.current.getStableId("body", 1)).toBe("id1")
    expect(result.current.getStableId("body", 9)).toBeUndefined()
    expect(result.current.getStableId("missing", 0)).toBeUndefined()

    act(() => result.current.unregisterFieldArray("body"))
    expect(result.current.getStableId("body", 1)).toBeUndefined()
  })
})

describe("isActiveOrChild / isDeepestActive", () => {
  const path: PathSegment[] = [
    seg({ basePath: "body.0", stableId: "a" }),
    seg({ basePath: "body.0.items.1", stableId: "b" }),
  ]

  it("isActiveOrChild is true for an active basePath and its ancestors", () => {
    expect(isActiveOrChild(path, "body.0")).toBe(true)
    expect(isActiveOrChild(path, "body.0.items.1")).toBe(true)
  })

  it("isActiveOrChild is false for an unrelated basePath and at root", () => {
    expect(isActiveOrChild(path, "body.3")).toBe(false)
    expect(isActiveOrChild([], "body.0")).toBe(false)
  })

  it("isDeepestActive matches only the last segment", () => {
    expect(isDeepestActive(path, "body.0.items.1")).toBe(true)
    expect(isDeepestActive(path, "body.0")).toBe(false)
    expect(isDeepestActive([], "body.0")).toBe(false)
  })
})
