import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useViewToolbarState } from "../use-view-toolbar-state"

const schema = {
  slug: "guests",
  fields: [
    { name: "name", type: "text" },
    { name: "status", type: "select", options: ["going", "no"] },
  ],
}

function setup(initialEntry: string, options: Partial<Parameters<typeof useViewToolbarState>[0]> = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  )
  return renderHook(
    () => ({
      toolbar: useViewToolbarState({ slug: "guests", viewSlug: "all", schema, ...options }),
      location: useLocation(),
    }),
    { wrapper },
  )
}

describe("useViewToolbarState", () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => sessionStorage.clear())

  it("starts from the URL and exposes a server where", () => {
    const filters = encodeURIComponent(JSON.stringify([{ id: "status", value: ["going"] }]))
    const { result } = setup(`/?filters=${filters}&search=ada`)

    expect(result.current.toolbar.columnFilters).toEqual([{ id: "status", value: ["going"] }])
    expect(result.current.toolbar.search).toBe("ada")
    expect(result.current.toolbar.isNarrowed).toBe(true)
    expect(result.current.toolbar.serverWhere).toBeTruthy()
  })

  it("writes filters, search and match logic back to the URL and notifies the layout", () => {
    const onFilterChange = vi.fn()
    const { result } = setup("/", { onFilterChange })

    act(() => result.current.toolbar.setColumnFilters([
      { id: "status", value: ["going"] },
      { id: "name", value: { operator: "iLike", value: "a" } },
    ]))
    act(() => result.current.toolbar.setJoinOperator("or"))
    act(() => result.current.toolbar.setSearch("ada"))

    const params = new URLSearchParams(result.current.location.search)
    expect(JSON.parse(params.get("filters")!)).toHaveLength(2)
    expect(params.get("joinOperator")).toBe("or")
    expect(params.get("search")).toBe("ada")
    expect(onFilterChange).toHaveBeenCalledTimes(2)
  })

  it("only folds search into the where when asked to", () => {
    const plain = setup("/?search=ada")
    const folded = setup("/?search=ada", { foldSearchIntoWhere: true })

    expect(plain.result.current.toolbar.serverWhere).toBeUndefined()
    expect(folded.result.current.toolbar.serverWhere).toBeTruthy()
  })

  it("falls back to session storage when the URL carries no params", () => {
    sessionStorage.setItem(
      "layout:collections:guests:view:all:toolbar:cards",
      JSON.stringify({ columnFilters: [{ id: "status", value: ["no"] }], joinOperator: "or" }),
    )
    const { result } = setup("/", { variant: "cards" })

    expect(result.current.toolbar.columnFilters).toEqual([{ id: "status", value: ["no"] }])
    expect(result.current.toolbar.joinOperator).toBe("or")
  })
})
