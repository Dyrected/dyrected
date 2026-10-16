import { cleanup, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { OperationalViewPage } from "../operational-view-page"
import { useCollectionView } from "../../../../hooks/use-collection-view"
import { usePublishViewData } from "../../../../hooks/use-publish-view-data"
import { useLayoutActions } from "../use-layout-actions"
import type { SerializedView } from "../types"

const useDyrectedMock = vi.fn()
const runSystemAction = vi.fn()

vi.mock("../../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))
vi.mock("../use-view-metrics", () => ({ useViewMetrics: () => ({ data: [], isLoading: false }) }))
vi.mock("../use-view-actions", () => ({
  useViewActions: () => ({
    isActionRunning: () => false,
    initiate: vi.fn(),
    execute: vi.fn(),
    runningKey: null,
    pending: null,
    isRunning: false,
    resolve: vi.fn(),
    cancel: vi.fn(),
  }),
}))
vi.mock("../use-system-ops", () => ({
  useSystemOps: () => ({
    isOperationRunning: () => false,
    runSystemAction,
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
vi.mock("../use-view-mode", () => ({ useViewMode: () => ({ mode: "table", setMode: vi.fn() }) }))
vi.mock("../view-header", () => ({
  ViewHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))
vi.mock("../metric-cards", () => ({ MetricCards: () => null }))
vi.mock("../action-dialogs", () => ({ ActionDialogs: () => null }))
vi.mock("../delete-entries-dialog", () => ({ DeleteEntriesDialog: () => null }))
vi.mock("../view-io-actions", () => ({
  ExportMenu: () => null,
  ImportCsvDialog: () => null,
  MobileHeaderMenu: () => null,
  createExportHandlers: () => ({ exportAll: vi.fn(), exportFiltered: vi.fn() }),
}))

const DOCS = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Grace" },
]

// A built-in layout stand-in: loads nothing itself, publishes like the real ones do.
vi.mock("../table/table-layout", async () => {
  const React = await import("react")
  return {
    TableLayout: () => {
      const slice = React.useMemo(
        () => ({
          documents: DOCS,
          total: 2,
          isLoading: false,
          isFetching: false,
          isTruncated: false,
          pagination: { page: 1, pageSize: 20, totalPages: 1 },
        }),
        [],
      )
      usePublishViewData(slice)
      const { actions, onRunAction } = useLayoutActions()
      return (
        <button data-testid="run" onClick={() => onRunAction(actions.find((a) => a.operation === "edit")!, ["b"])}>
          {actions.map((a) => a.name).join(",")}
        </button>
      )
    },
  }
})

describe("operational view controller", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("gives slots and useCollectionView() the documents the active built-in layout loaded", async () => {
    function Banner(props: { documents: Array<{ id: string }>; isLoading: boolean }) {
      const view = useCollectionView()
      return (
        <div data-testid="banner">
          {props.documents.map((d) => d.id).join(",")}|{props.isLoading ? "loading" : "ready"}|
          {view.documents.length}|{view.permissions.canCreate ? "can-create" : "read-only"}
        </div>
      )
    }

    useDyrectedMock.mockReturnValue({
      client: {},
      user: { id: "u1" },
      components: { collectionView: { banner: Banner } },
    })

    const view: SerializedView = {
      slug: "all",
      label: "All",
      layout: "table",
      components: { beforeViewContent: ["banner"] },
    }

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <OperationalViewPage
            slug="guests"
            schema={{ slug: "guests", labels: { singular: "Guest" }, admin: {}, fields: [], access: {} }}
            view={view}
            schemas={{ collections: [] }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect((await screen.findByTestId("banner")).textContent).toBe("a,b|ready|2|can-create")
  })

  it("lets a built-in layout run actions through the controller instead of props", async () => {
    useDyrectedMock.mockReturnValue({ client: {}, user: { id: "u1" }, components: {} })

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <OperationalViewPage
            slug="guests"
            schema={{ slug: "guests", labels: { singular: "Guest" }, admin: {}, fields: [], access: {} }}
            view={{ slug: "all", label: "All", layout: "table" }}
            schemas={{ collections: [] }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const button = await screen.findByTestId("run")
    expect(button.textContent).toContain("view")
    button.click()
    expect(runSystemAction).toHaveBeenCalledWith("edit", ["b"])
  })

  it("lets the app replace a built-in layout by registering a component under its name", async () => {
    function MyTable(props: { collection: string; viewSlug: string }) {
      const { documents } = useCollectionView()
      return (
        <div data-testid="my-table">
          {props.collection}/{props.viewSlug}:{documents.length}
        </div>
      )
    }
    useDyrectedMock.mockReturnValue({
      client: { collection: () => ({ find: async () => ({ docs: DOCS, total: 2, totalPages: 1 }) }) },
      user: { id: "u1" },
      components: { viewLayouts: { table: MyTable } },
    })

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <OperationalViewPage
            slug="guests"
            schema={{ slug: "guests", labels: { singular: "Guest" }, admin: {}, fields: [], access: {} }}
            view={{ slug: "all", label: "All", layout: "table" }}
            schemas={{ collections: [] }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect((await screen.findByTestId("my-table")).textContent).toBe("guests/all:2")
  })
})
