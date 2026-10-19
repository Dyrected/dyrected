import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"
import { NavigationCustomizer } from "../navigation-customizer"

const useDyrectedMock = vi.fn()

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

afterEach(cleanup)

const schemas = {
  collections: [{ slug: "staff", labels: { plural: "Staff" }, fields: [], auth: true }],
  globals: [],
}

function renderWith(user: Record<string, unknown>) {
  useDyrectedMock.mockReturnValue({
    user,
    schemas,
    navigation: { groups: [], ungrouped: [] },
    config: { siteId: "default" },
    client: { getBaseUrl: () => "http://localhost:3000" },
  })
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <NavigationCustomizer onClose={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const roleDefaultButton = () => screen.queryAllByRole("button", { name: /Role Default/i })

describe("NavigationCustomizer Role Default button", () => {
  it.each([
    ["admin", { collection: "staff", roles: ["admin"] }],
    ["super_admin", { collection: "staff", roles: ["super_admin"] }],
    ["owner", { collection: "staff", roles: ["owner"] }],
    ["single role string", { collection: "staff", role: "super_admin" }],
  ])("is shown for %s", (_label, user) => {
    renderWith(user)
    expect(roleDefaultButton().length).toBeGreaterThan(0)
  })

  it.each([
    ["finance", { collection: "staff", roles: ["finance"] }],
    ["no roles", { collection: "staff" }],
  ])("is hidden for %s", (_label, user) => {
    renderWith(user)
    expect(roleDefaultButton()).toHaveLength(0)
  })
})
