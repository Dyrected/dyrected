import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EditEntryPage } from "../edit-page"
import { DyrectedField } from "../../../components/forms/embedded-fields"
import { useDocumentForm } from "../../../hooks/use-document-form"

const useDyrectedMock = vi.fn()
vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
  useOptionalDyrected: () => null,
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const toast = await import("sonner").then((m) => m.toast as unknown as { error: any; success: any })

function ScanForm() {
  const { submit, mode, permissions } = useDocumentForm()
  return (
    <div>
      <p data-testid="mode">{`${mode}:${permissions.canCreate}`}</p>
      <DyrectedField path="name" />
      <button type="button" onClick={() => void submit({ redirect: "stay", silent: true, overrides: { name: "Scanned" } })}>
        Scan
      </button>
    </div>
  )
}

function Where() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname}</p>
}

function schema(components: Record<string, unknown>) {
  return {
    slug: "check_ins",
    labels: { singular: "Check-in", plural: "Check-ins" },
    fields: [{ name: "name", type: "text", label: "Guest name" }],
    admin: { components },
  }
}

function setup(components: Record<string, unknown>, registered: Record<string, unknown>) {
  const create = vi.fn().mockResolvedValue({ id: "new-1", name: "Scanned" })
  const client = {
    collection: () => ({ create, update: vi.fn(), findOne: vi.fn(), find: vi.fn().mockResolvedValue({ docs: [], total: 0 }) }),
  }
  useDyrectedMock.mockReturnValue({
    client,
    user: { id: "u1", roles: ["admin"] },
    components: { forms: registered },
    schemas: { collections: [schema(components)], globals: [] },
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/collections/check_ins/new"]}>
        <Routes>
          <Route path="/collections/:slug/new" element={<><EditEntryPage /><Where /></>} />
          <Route path="/collections/:slug/:id/edit" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { create }
}

beforeEach(() => {
  useDyrectedMock.mockReset()
  toast.error.mockClear()
  toast.success.mockClear()
  // jsdom has no matchMedia
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never
})
afterEach(cleanup)

describe("EditEntryPage with a custom form", () => {
  it("renders the createForm and saves through the normal create path with overrides", async () => {
    const { create } = setup({ createForm: "check_ins.scan", formShell: "header" }, { "check_ins.scan": ScanForm })

    expect((await screen.findByTestId("mode")).textContent).toBe("create:true")
    await userEvent.click(screen.getByText("Scan"))

    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: "Scanned" })))
    // redirect: "stay" and silent: no navigation and no toast
    expect(screen.getByTestId("location").textContent).toBe("/collections/check_ins/new")
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("keeps the default save bar in the full shell but not in header", async () => {
    setup({ createForm: "check_ins.scan" }, { "check_ins.scan": ScanForm })
    await screen.findByTestId("mode")
    expect(screen.getAllByRole("button", { name: /Create Entry/ }).length).toBeGreaterThan(0)
    cleanup()

    setup({ createForm: "check_ins.scan", formShell: "header" }, { "check_ins.scan": ScanForm })
    await screen.findByTestId("mode")
    expect(screen.queryByRole("button", { name: /Create Entry/ })).toBeNull()
  })

  it("keeps the page header in the header shell and drops it in the none shell", async () => {
    setup({ createForm: "check_ins.scan", formShell: "header" }, { "check_ins.scan": ScanForm })
    await screen.findByTestId("mode")
    expect(screen.getByText("New Check-in")).toBeTruthy()
    cleanup()

    setup({ createForm: "check_ins.scan", formShell: "none" }, { "check_ins.scan": ScanForm })
    await screen.findByTestId("mode")
    expect(screen.queryByText("New Check-in")).toBeNull()
  })

  it("renders the built-in form when no form is configured", async () => {
    setup({}, {})
    expect(await screen.findByText("Guest name")).toBeTruthy()
    expect(screen.queryByText("Scan")).toBeNull()
  })
})
