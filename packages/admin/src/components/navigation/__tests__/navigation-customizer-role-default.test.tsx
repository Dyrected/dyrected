import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
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

function renderWith(user: Record<string, unknown>, schemasOverride = schemas, setPreference = vi.fn().mockResolvedValue({})) {
  useDyrectedMock.mockReturnValue({
    user,
    schemas: schemasOverride,
    navigation: { groups: [], ungrouped: [] },
    config: { siteId: "default" },
    client: { getBaseUrl: () => "http://localhost:3000", setPreference },
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

describe("NavigationCustomizer role choice", () => {
  const superAdmin = { collection: "staff", roles: ["super_admin"] }
  const withRoles = (rolesField: Record<string, unknown>) => ({
    collections: [{ slug: "staff", labels: { plural: "Staff" }, auth: true, fields: [{ name: "roles", ...rolesField }] }],
    globals: [],
  })
  const openPanel = () => fireEvent.click(roleDefaultButton()[0])

  it("offers the roles the project defines, starting with the first one", () => {
    renderWith(superAdmin, withRoles({ type: "select", options: ["external", "finance", "field_ops"] }))
    openPanel()
    // The select shows the first project role, not a hard-coded one.
    expect(screen.getAllByText("external").length).toBeGreaterThan(0)
    expect(screen.queryByText(/compliance/i)).toBeNull()
    expect(screen.queryByText(/Operator \(operator\)/)).toBeNull()
  })

  it("publishes for the first project role by default", async () => {
    const setPreference = vi.fn().mockResolvedValue({})
    renderWith(superAdmin, withRoles({ type: "select", options: ["external", "finance"] }), setPreference)
    openPanel()
    fireEvent.click(screen.getByRole("button", { name: "Publish" }))
    await waitFor(() => expect(setPreference).toHaveBeenCalled())
    expect(setPreference.mock.calls[0][2]).toEqual({ scope: "role", role: "external" })
  })

  it("lets you type a role when the project has no fixed role list", async () => {
    const setPreference = vi.fn().mockResolvedValue({})
    renderWith(superAdmin, withRoles({ type: "json" }), setPreference)
    openPanel()

    const publish = screen.getByRole("button", { name: "Publish" }) as HTMLButtonElement
    expect(publish.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText("Role name"), { target: { value: "field_ops" } })
    expect(publish.disabled).toBe(false)
    fireEvent.click(publish)
    await waitFor(() => expect(setPreference).toHaveBeenCalled())
    expect(setPreference.mock.calls[0][2]).toEqual({ scope: "role", role: "field_ops" })
  })
})
