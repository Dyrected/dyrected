import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ReadAccessGuard } from "../read-access-guard"

const useDyrectedMock = vi.fn()

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ReadAccessGuard kind="collections" />}>
          <Route path="/collections/:slug" element={<div>Collection page</div>} />
          <Route path="/collections/:slug/:id/edit" element={<div>Edit page</div>} />
        </Route>
        <Route element={<ReadAccessGuard kind="globals" />}>
          <Route path="/globals/:slug" element={<div>Global page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const schemas = {
  collections: [
    { slug: "posts", access: { read: true } },
    { slug: "payroll", access: { read: false } },
    { slug: "drafts", access: { read: "'editor' in user.roles" } },
  ],
  globals: [
    { slug: "site", access: {} },
    { slug: "billing", access: { read: false } },
  ],
}

afterEach(cleanup)

describe("ReadAccessGuard", () => {
  it("renders the page for a readable collection", () => {
    useDyrectedMock.mockReturnValue({ schemas, user: { roles: ["viewer"] } })
    renderAt("/collections/posts")
    expect(screen.getByText("Collection page")).toBeTruthy()
  })

  it("blocks a collection the server resolved to read:false", () => {
    useDyrectedMock.mockReturnValue({ schemas, user: { roles: ["viewer"] } })
    renderAt("/collections/payroll")
    expect(screen.queryByText("Collection page")).toBeNull()
    expect(screen.getByText("You don't have access to this")).toBeTruthy()
  })

  it("blocks nested routes of a hidden collection too", () => {
    useDyrectedMock.mockReturnValue({ schemas, user: { roles: ["viewer"] } })
    renderAt("/collections/payroll/abc/edit")
    expect(screen.queryByText("Edit page")).toBeNull()
    expect(screen.getByText("You don't have access to this")).toBeTruthy()
  })

  it("evaluates Jexl read rules against the signed-in user", () => {
    useDyrectedMock.mockReturnValue({ schemas, user: { roles: ["editor"] } })
    const { unmount } = renderAt("/collections/drafts")
    expect(screen.getByText("Collection page")).toBeTruthy()
    unmount()

    useDyrectedMock.mockReturnValue({ schemas, user: { roles: ["viewer"] } })
    renderAt("/collections/drafts")
    expect(screen.getByText("You don't have access to this")).toBeTruthy()
  })

  it("blocks a hidden global but allows a readable one", () => {
    useDyrectedMock.mockReturnValue({ schemas, user: { roles: ["viewer"] } })
    const { unmount } = renderAt("/globals/billing")
    expect(screen.getByText("You don't have access to this")).toBeTruthy()
    unmount()
    renderAt("/globals/site")
    expect(screen.getByText("Global page")).toBeTruthy()
  })

  it("lets unknown slugs through so the page shows its own not-found state", () => {
    useDyrectedMock.mockReturnValue({ schemas, user: null })
    renderAt("/collections/ghost")
    expect(screen.getByText("Collection page")).toBeTruthy()
  })
})
