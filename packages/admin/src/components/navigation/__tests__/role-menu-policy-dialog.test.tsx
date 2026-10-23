import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RoleMenuPolicyDialog } from "../role-menu-policy-dialog"

const useDyrectedMock = vi.fn()

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

afterEach(cleanup)

const item = (slug: string, label: string, order: number) => ({
  id: `collection_${slug}`,
  type: "collection" as const,
  slug,
  label,
  order,
  views: [],
})

const rawTree = {
  groups: [
    { id: "g_content", name: "Content", slug: "content", order: 1, items: [item("posts", "Posts", 1), item("pages", "Pages", 2)] },
  ],
  ungrouped: [item("customers", "Customers", 1)],
}

describe("RoleMenuPolicyDialog", () => {
  const getNavigation = vi.fn()
  const getPreference = vi.fn()
  const setPreference = vi.fn()
  const deletePreference = vi.fn()

  const open = (user: Record<string, unknown> = { collection: "users", roles: ["admin"] }) => {
    useDyrectedMock.mockReturnValue({
      user,
      client: { getNavigation, getPreference, setPreference, deletePreference },
    })
    render(<RoleMenuPolicyDialog open onOpenChange={() => {}} roleOptions={[]} />)
    fireEvent.change(screen.getByLabelText("Role name"), { target: { value: "external" } })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getNavigation.mockImplementation(async (opts?: { raw?: boolean }) =>
      opts?.raw ? rawTree : { groups: [], ungrouped: [item("customers", "Customers", 1)], locked: true },
    )
    getPreference.mockResolvedValue({ key: "admin:navigation-policy", value: null })
    setPreference.mockResolvedValue({})
    deletePreference.mockResolvedValue({ success: true })
  })

  it("lists everything the role could be given, all checked until a menu is designed", async () => {
    open()
    await screen.findByLabelText("Posts")
    expect(getNavigation).toHaveBeenCalledWith({ asRole: "external", raw: true })
    for (const label of ["Posts", "Pages", "Customers"]) {
      expect(screen.getByLabelText(label).getAttribute("data-state")).toBe("checked")
    }
  })

  it("saves only the checked items as an enforced policy", async () => {
    open()
    fireEvent.click(await screen.findByLabelText("Pages"))
    fireEvent.click(screen.getByLabelText("Posts"))
    fireEvent.click(screen.getByRole("switch", { name: "Enforce this menu" }))
    fireEvent.click(screen.getByRole("button", { name: "Save menu" }))

    await waitFor(() => expect(setPreference).toHaveBeenCalled())
    const [key, policy, options] = setPreference.mock.calls[0]
    expect(key).toBe("admin:navigation-policy")
    expect(options).toEqual({ scope: "role", role: "external" })
    expect(policy.enforced).toBe(true)
    expect(policy.allowed).toEqual(["collection_customers"])
  })

  it("keeps the menu as a draft when enforcement is off", async () => {
    open()
    fireEvent.click(await screen.findByLabelText("Pages"))
    fireEvent.click(screen.getByRole("button", { name: "Save menu" }))
    await waitFor(() => expect(setPreference).toHaveBeenCalled())
    expect(setPreference.mock.calls[0][1].enforced).toBe(false)
  })

  it("restores a stored policy and shows what the role sees", async () => {
    getPreference.mockResolvedValue({
      key: "admin:navigation-policy",
      value: { _version: 1, enforced: true, allowed: ["collection_customers"] },
    })
    open()
    await waitFor(() => expect(screen.getByLabelText("Posts").getAttribute("data-state")).toBe("unchecked"))
    expect(screen.getByLabelText("Customers").getAttribute("data-state")).toBe("checked")
    expect(screen.getByRole("switch", { name: "Enforce this menu" }).getAttribute("data-state")).toBe("checked")
    await waitFor(() => expect(screen.getByTestId("role-menu-preview").textContent).toBe("Customers"))
  })

  it("saves the arranged order", async () => {
    open()
    await screen.findByLabelText("Posts")
    fireEvent.click(screen.getByRole("button", { name: "Move Pages up" }))
    fireEvent.click(screen.getByRole("button", { name: "Save menu" }))
    await waitFor(() => expect(setPreference).toHaveBeenCalled())
    expect(setPreference.mock.calls[0][1].layout.itemOrder.g_content).toEqual(["collection_pages", "collection_posts"])
  })

  it("removes a stored menu", async () => {
    getPreference.mockResolvedValue({
      key: "admin:navigation-policy",
      value: { _version: 1, enforced: true, allowed: ["collection_customers"] },
    })
    open()
    const remove = await screen.findByRole("button", { name: "Remove menu" })
    await waitFor(() => expect((remove as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(remove)
    await waitFor(() =>
      expect(deletePreference).toHaveBeenCalledWith("admin:navigation-policy", { scope: "role", role: "external" }),
    )
  })

  it("warns an administrator who enforces a menu on a role they hold", async () => {
    open({ collection: "users", roles: ["admin", "external"] })
    fireEvent.click(await screen.findByRole("switch", { name: "Enforce this menu" }))
    expect(screen.getByRole("alert").textContent).toContain("limits your own sidebar")
  })

  it("shows the error when the role's menu cannot be loaded", async () => {
    getNavigation.mockRejectedValue(new Error("Only administrators can view navigation as another role."))
    open()
    await screen.findByText(/Only administrators/)
  })
})
