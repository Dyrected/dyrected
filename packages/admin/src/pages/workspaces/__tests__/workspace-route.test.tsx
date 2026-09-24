import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { WorkspaceRoute, WorkspaceRedirectRoute } from "../workspace-route"

const useDyrectedMock = vi.fn()

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("../../collections/views/operational-view-page", () => ({
  OperationalViewPage: ({ slug, view }: { slug: string; view: any }) => (
    <div data-testid="operational-view-page">
      <span>Collection: {slug}</span>
      <span>View: {view.label}</span>
    </div>
  ),
}))

describe("WorkspaceRoute & WorkspaceRedirectRoute", () => {
  const mockSchemas = {
    collections: [
      {
        slug: "invoices",
        labels: { singular: "Invoice", plural: "Invoices" },
        fields: [],
      },
    ],
  }

  const mockNavigation = {
    groups: [
      {
        id: "finance",
        label: "Finance",
        items: [
          {
            id: "billing",
            slug: "billing",
            label: "Billing Workspace",
            collection: "invoices",
            views: [
              {
                id: "pending",
                slug: "pending-approvals",
                label: "Pending Approvals",
                collection: "invoices",
              },
              {
                id: "overdue",
                slug: "overdue",
                label: "Overdue Invoices",
                collection: "invoices",
              },
            ],
          },
        ],
      },
    ],
  }

  it("redirects from /:workspaceSlug to first view slug", () => {
    useDyrectedMock.mockReturnValue({
      navigation: mockNavigation,
      schemas: mockSchemas,
    })

    render(
      <MemoryRouter initialEntries={["/billing"]}>
        <Routes>
          <Route path="/:workspaceSlug" element={<WorkspaceRedirectRoute />} />
          <Route
            path="/:workspaceSlug/:viewSlug"
            element={<div data-testid="target-route">Target View</div>}
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId("target-route")).toBeTruthy()
  })

  it("renders 404 when workspace slug does not exist", () => {
    useDyrectedMock.mockReturnValue({
      navigation: mockNavigation,
      schemas: mockSchemas,
    })

    render(
      <MemoryRouter initialEntries={["/non-existent-workspace/pending-approvals"]}>
        <Routes>
          <Route path="/:workspaceSlug/:viewSlug" element={<WorkspaceRoute />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText("Workspace not found")).toBeTruthy()
  })

  it("renders 404 when view slug does not exist within valid workspace", () => {
    useDyrectedMock.mockReturnValue({
      navigation: mockNavigation,
      schemas: mockSchemas,
    })

    render(
      <MemoryRouter initialEntries={["/billing/non-existent-view"]}>
        <Routes>
          <Route path="/:workspaceSlug/:viewSlug" element={<WorkspaceRoute />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText("View not found")).toBeTruthy()
  })

  it("renders OperationalViewPage when workspace and view match", () => {
    useDyrectedMock.mockReturnValue({
      navigation: mockNavigation,
      schemas: mockSchemas,
    })

    render(
      <MemoryRouter initialEntries={["/billing/pending-approvals"]}>
        <Routes>
          <Route path="/:workspaceSlug/:viewSlug" element={<WorkspaceRoute />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId("operational-view-page")).toBeTruthy()
    expect(screen.getByText("Collection: invoices")).toBeTruthy()
    expect(screen.getByText("View: Pending Approvals")).toBeTruthy()
  })
})
