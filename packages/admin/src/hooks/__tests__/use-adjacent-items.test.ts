import { renderHook } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { useAdjacentItems } from "../use-adjacent-items"

describe("useAdjacentItems", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }]

  it("returns no neighbors when activeId is null", () => {
    const { result } = renderHook(() => useAdjacentItems(items, null))
    expect(result.current).toEqual({ prevItem: undefined, nextItem: undefined, hasPrev: false, hasNext: false })
  })

  it("returns no neighbors when items is empty or undefined", () => {
    expect(renderHook(() => useAdjacentItems([], "a")).result.current.hasPrev).toBe(false)
    expect(renderHook(() => useAdjacentItems(undefined, "a")).result.current.hasNext).toBe(false)
  })

  it("returns no neighbors when activeId is not found in items", () => {
    const { result } = renderHook(() => useAdjacentItems(items, "missing"))
    expect(result.current).toEqual({ prevItem: undefined, nextItem: undefined, hasPrev: false, hasNext: false })
  })

  it("finds both neighbors for a middle item", () => {
    const { result } = renderHook(() => useAdjacentItems(items, "b"))
    expect(result.current.prevItem).toEqual({ id: "a" })
    expect(result.current.nextItem).toEqual({ id: "c" })
    expect(result.current.hasPrev).toBe(true)
    expect(result.current.hasNext).toBe(true)
  })

  it("has no previous neighbor for the first item", () => {
    const { result } = renderHook(() => useAdjacentItems(items, "a"))
    expect(result.current.prevItem).toBeUndefined()
    expect(result.current.hasPrev).toBe(false)
    expect(result.current.nextItem).toEqual({ id: "b" })
  })

  it("has no next neighbor for the last item", () => {
    const { result } = renderHook(() => useAdjacentItems(items, "c"))
    expect(result.current.nextItem).toBeUndefined()
    expect(result.current.hasNext).toBe(false)
    expect(result.current.prevItem).toEqual({ id: "b" })
  })

  it("matches ids loosely by string coercion (numeric vs string id)", () => {
    const numericItems = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const { result } = renderHook(() => useAdjacentItems(numericItems, "2"))
    expect(result.current.prevItem).toEqual({ id: 1 })
    expect(result.current.nextItem).toEqual({ id: 3 })
  })
})
