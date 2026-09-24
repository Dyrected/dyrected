import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import { AdminShell } from "../admin-shell"

const useDyrectedMock = vi.fn()

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("../../../hooks/use-admin-theme", () => ({
  useAdminTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    actualTheme: "light",
  }),
}))

describe("AdminShell Navigation & Polymorphic Sidebar", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  const mockNavigation = {
    groups: [
      {
        id: "ops",
        label: "Operations",
        icon: "Briefcase",
        items: [
          {
            id: "single-workspace",
            slug: "single-workspace",
            label: "Single Workspace",
            type: "workspace" as const,
            collection: "orders",
            views: [
              {
                id: "v1",
                slug: "all-orders",
                label: "All Orders",
                collection: "orders",
              },
            ],
            badge: { count: 5, variant: "default" as const },
          },
          {
            id: "multi-workspace",
            slug: "multi-workspace",
            label: "Multi Workspace",
            type: "workspace" as const,
            collection: "invoices",
            views: [
              {
                id: "v2",
                slug: "pending-invoices",
                label: "Pending Invoices",
                collection: "invoices",
              },
              {
                id: "v3",
                slug: "paid-invoices",
                label: "Paid Invoices",
                collection: "invoices",
              },
            ],
          },
        ],
      },
    ],
  }

  const mockBadges = {
    "single-workspace": {
      count: 42,
      variant: "default" as const,
    },
  }

  it("renders single-view workspace as direct link with badge counter and without collapse button", () => {
    useDyrectedMock.mockReturnValue({
      user: { email: "admin@example.com", role: "admin" },
      config: { siteId: "default" },
      schemas: { collections: [], globals: [] },
      navigation: mockNavigation,
      badges: mockBadges,
      client: {
        getBaseUrl: () => "http://localhost:3000",
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <AdminShell>
            <div>Child Content</div>
          </AdminShell>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Verify Operations group header
    expect(screen.getAllByText("Operations").length).toBeGreaterThan(0)

    // Verify Single Workspace link
    const singleLink = screen.getAllByRole("link", { name: /Single Workspace/i })[0]
    expect(singleLink).toBeTruthy()
    expect(singleLink.getAttribute("href")).toBe("/single-workspace/all-orders")

    // Real-time badge counter from badges query (42)
    expect(screen.getAllByText("42").length).toBeGreaterThan(0)

    // Should NOT have an expand button for single-view workspace
    expect(screen.queryByLabelText("Expand Single Workspace")).toBeNull()
    expect(screen.queryByLabelText("Collapse Single Workspace")).toBeNull()
  })

  it("renders multi-view workspace with collapsible trigger and subviews", () => {
    useDyrectedMock.mockReturnValue({
      user: { email: "admin@example.com", role: "admin" },
      config: { siteId: "default" },
      schemas: { collections: [], globals: [] },
      navigation: mockNavigation,
      badges: {},
      client: {
        getBaseUrl: () => "http://localhost:3000",
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <AdminShell>
            <div>Child Content</div>
          </AdminShell>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Multi Workspace should have an expand button (desktop and mobile sidebar)
    const expandBtns = screen.getAllByLabelText("Expand Multi Workspace")
    expect(expandBtns.length).toBeGreaterThan(0)

    // Subviews should be initially hidden (not active route)
    expect(screen.queryByText("Pending Invoices")).toBeNull()

    // Clicking expand button opens subviews
    fireEvent.click(expandBtns[0])
    expect(screen.getAllByText("Pending Invoices").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Paid Invoices").length).toBeGreaterThan(0)
  })
})
