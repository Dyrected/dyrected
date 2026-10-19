import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { OperationalViewRoute } from "../operational-view-route"

const useDyrectedMock = vi.fn()

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("../views/operational-view-page", () => ({
  OperationalViewPage: ({ view }: { view: any }) => <div>Rendered view: {view.label}</div>,
}))

const schemas = {
  collections: [
    {
      slug: "reports",
      fields: [],
      views: [
        { slug: "all", label: "All" },
        { slug: "exec", label: "Exec", access: { read: false } },
        { slug: "editors", label: "Editors", access: { read: "'editor' in user.roles" } },
      ],
    },
  ],
}

function renderAt(path: string, user: unknown) {
  useDyrectedMock.mockReturnValue({ schemas, user })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/collections/:slug/views/:viewSlug" element={<OperationalViewRoute />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe("OperationalViewRoute access", () => {
  it("renders a view without access rules", () => {
    renderAt("/collections/reports/views/all", { roles: ["viewer"] })
    expect(screen.getByText("Rendered view: All")).toBeTruthy()
  })

  it("shows not-found for a view the server resolved to read:false", () => {
    renderAt("/collections/reports/views/exec", { roles: ["exec"] })
    expect(screen.queryByText(/Rendered view/)).toBeNull()
    expect(screen.getByText("View not found")).toBeTruthy()
  })

  it("evaluates Jexl view rules for the signed-in user", () => {
    const { unmount } = renderAt("/collections/reports/views/editors", { roles: ["editor"] })
    expect(screen.getByText("Rendered view: Editors")).toBeTruthy()
    unmount()
    renderAt("/collections/reports/views/editors", { roles: ["viewer"] })
    expect(screen.getByText("View not found")).toBeTruthy()
  })
})
