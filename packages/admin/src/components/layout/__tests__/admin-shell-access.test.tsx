import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AdminShell } from "../admin-shell"

const useDyrectedMock = vi.fn()

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("../../../hooks/use-admin-theme", () => ({
  useAdminTheme: () => ({
    theme: "light",
    resolvedTheme: "light",
    setTheme: vi.fn(),
    actualTheme: "light",
  }),
}))

const schemas = {
  collections: [
    { slug: "posts", labels: { plural: "Posts" }, fields: [], access: { read: true } },
    { slug: "payroll", labels: { plural: "Payroll" }, fields: [], access: { read: false } },
    { slug: "drafts", labels: { plural: "Drafts" }, fields: [], access: { read: "'editor' in user.roles" } },
  ],
  globals: [
    { slug: "site", label: "Site settings", fields: [], access: {} },
    { slug: "billing", label: "Billing settings", fields: [], access: { read: false } },
  ],
}

const collectionItem = (slug: string, label: string) => ({
  id: slug,
  type: "collection" as const,
  slug,
  collection: slug,
  label,
  order: 1,
  views: [],
})
const globalItem = (slug: string, label: string) => ({
  id: `global_${slug}`,
  type: "global" as const,
  slug,
  global: slug,
  label,
  order: 1,
  views: [],
})

function renderShell(value: Record<string, unknown>) {
  useDyrectedMock.mockReturnValue({
    config: { siteId: "default" },
    badges: {},
    client: { getBaseUrl: () => "http://localhost:3000" },
    ...value,
  })
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/"]}>
        <AdminShell>
          <div>Child</div>
        </AdminShell>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const present = (name: string) => screen.queryAllByText(name).length > 0

afterEach(cleanup)

describe("AdminShell sidebar access filtering", () => {
  describe("with compiled navigation", () => {
    const navigation = {
      groups: [
        {
          id: "content",
          name: "Content",
          label: "Content",
          order: 1,
          items: [
            collectionItem("posts", "Posts"),
            collectionItem("payroll", "Payroll"),
            collectionItem("drafts", "Drafts"),
            globalItem("site", "Site settings"),
            globalItem("billing", "Billing settings"),
          ],
        },
      ],
      ungrouped: [],
    }

    it("hides collections and globals the user cannot read", () => {
      renderShell({ user: { roles: ["viewer"] }, schemas, navigation })
      expect(present("Posts")).toBe(true)
      expect(present("Site settings")).toBe(true)
      expect(present("Payroll")).toBe(false)
      expect(present("Billing settings")).toBe(false)
      expect(present("Drafts")).toBe(false)
    })

    it("shows Jexl-guarded items to a user who satisfies the rule", () => {
      renderShell({ user: { roles: ["editor"] }, schemas, navigation })
      expect(present("Drafts")).toBe(true)
      expect(present("Payroll")).toBe(false)
    })

    it("drops a group once none of its items are readable", () => {
      renderShell({
        user: { roles: ["viewer"] },
        schemas,
        navigation: {
          groups: [
            { id: "secret", name: "Secret", label: "Secret", order: 1, items: [collectionItem("payroll", "Payroll")] },
            { id: "open", name: "Open", label: "Open", order: 2, items: [collectionItem("posts", "Posts")] },
          ],
          ungrouped: [],
        },
      })
      expect(present("Secret")).toBe(false)
      expect(present("Open")).toBe(true)
    })
  })

  describe("without compiled navigation (fallback sidebar)", () => {
    it("lists only the collections and globals the user can read", () => {
      renderShell({ user: { roles: ["viewer"] }, schemas, navigation: null })
      expect(present("Posts")).toBe(true)
      expect(present("Payroll")).toBe(false)
      expect(present("Drafts")).toBe(false)
      expect(present("Billing settings")).toBe(false)
    })
  })
})
