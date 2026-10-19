import { cleanup, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { OperationalViewPage } from "../operational-view-page"
import type { SerializedView } from "../types"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const useDyrectedMock = vi.fn()

vi.mock("../../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("../use-view-metrics", () => ({
  useViewMetrics: () => ({ data: [], isLoading: false }),
}))

vi.mock("../use-view-actions", () => ({
  useViewActions: () => ({
    isActionRunning: () => false,
    initiate: vi.fn(),
    pending: null,
    isRunning: false,
    resolve: vi.fn(),
    cancel: vi.fn(),
  }),
}))

vi.mock("../use-system-ops", () => ({
  useSystemOps: () => ({
    isOperationRunning: () => false,
    runSystemAction: vi.fn(),
    deleteDialog: { open: false, ids: [], title: "" },
    confirmationValue: "",
    setConfirmationValue: vi.fn(),
    isDeleting: false,
    deletingIds: [],
    duplicatingId: null,
    closeDeleteDialog: vi.fn(),
    confirmDelete: vi.fn(),
  }),
}))

vi.mock("../use-view-mode", () => ({
  useViewMode: () => ({ mode: "table", setMode: vi.fn() }),
}))

vi.mock("../table/table-layout", () => ({
  TableLayout: () => <div data-testid="table-layout">Table Layout</div>,
}))

vi.mock("../view-header", () => ({
  ViewHeader: ({ label, children }: { label: string; children?: ReactNode }) => (
    <div data-testid="view-header">
      <span>{label}</span>
      {children}
    </div>
  ),
}))

vi.mock("../metric-cards", () => ({
  MetricCards: () => <div data-testid="metric-cards" />,
}))

vi.mock("../action-dialogs", () => ({
  ActionDialogs: () => null,
}))

vi.mock("../delete-entries-dialog", () => ({
  DeleteEntriesDialog: () => null,
}))

vi.mock("../view-io-actions", () => ({
  ExportMenu: () => null,
  ImportCsvDialog: () => null,
  MobileHeaderMenu: () => null,
  createExportHandlers: () => ({ exportAll: vi.fn(), exportFiltered: vi.fn() }),
}))

describe("OperationalViewPage action access", () => {
  let consoleErrorSpy: { mockRestore: () => void }

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
  })

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  const schema = {
    slug: "reports",
    labels: { singular: "Report", plural: "Reports" },
    admin: {},
    fields: [],
  }

  const view: SerializedView = {
    slug: "all",
    label: "All",
    layout: "table",
    actions: [
      { name: "export-all", label: "Export all", type: "header" },
      { name: "approve", label: "Approve batch", type: "header", access: { update: false } },
      { name: "publish", label: "Publish batch", type: "header", access: { update: "'exec' in user.roles" } },
    ],
  } as SerializedView

  function renderPage(user: unknown) {
    useDyrectedMock.mockReturnValue({ client: {}, user, components: {} })
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <OperationalViewPage
            slug="reports"
            schema={schema}
            view={view}
            schemas={{ collections: [schema], globals: [] }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it("hides actions the server resolved to update:false", () => {
    renderPage({ roles: ["viewer"] })
    expect(screen.getByText("Export all")).toBeDefined()
    expect(screen.queryByText("Approve batch")).toBeNull()
  })

  it("evaluates Jexl action rules for the signed-in user", () => {
    const { unmount } = renderPage({ roles: ["exec"] })
    expect(screen.getByText("Publish batch")).toBeDefined()
    unmount()

    renderPage({ roles: ["viewer"] })
    expect(screen.queryByText("Publish batch")).toBeNull()
  })
})
