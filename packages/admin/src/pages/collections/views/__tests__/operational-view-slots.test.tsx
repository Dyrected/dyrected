import { cleanup, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { OperationalViewPage } from "../operational-view-page"
import type { SerializedView } from "../types"

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

describe("OperationalViewPage component slots", () => {
  let consoleErrorSpy: { mockRestore: () => void }

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
  })

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("renders view-specific custom component slots declared on defineView", () => {
    const view: SerializedView = {
      slug: "kanban-pipeline",
      label: "Pipeline",
      layout: "table",
      components: {
        beforeViewHeader: ["view-top-banner"],
        afterViewHeader: ["view-header-summary"],
        beforeViewContent: ["view-toolbar-extension"],
        afterViewContent: ["view-bottom-footer"],
      },
    }

    const schema = {
      slug: "deals",
      labels: { singular: "Deal", plural: "Deals" },
      admin: {},
      fields: [],
    }

    useDyrectedMock.mockReturnValue({
      client: {},
      user: { id: "u1" },
      components: {
        collectionView: {
          "view-top-banner": (props: any) => (
            <div data-testid="view-top-banner" data-view-slug={props.viewSlug}>
              Top Banner for {props.viewSlug}
            </div>
          ),
          "view-header-summary": () => <div data-testid="view-header-summary">Header Summary</div>,
          "view-toolbar-extension": () => <div data-testid="view-toolbar-extension">Toolbar Ext</div>,
          "view-bottom-footer": () => <div data-testid="view-bottom-footer">Bottom Footer</div>,
        },
      },
    })

    const { container } = render(
      <MemoryRouter>
        <OperationalViewPage
          slug="deals"
          schema={schema}
          view={view}
          schemas={{ collections: [schema], globals: [] }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId("view-top-banner")).toBeDefined()
    expect(screen.getByTestId("view-top-banner").getAttribute("data-view-slug")).toBe("kanban-pipeline")
    expect(screen.getByTestId("view-header-summary")).toBeDefined()
    expect(screen.getByTestId("view-toolbar-extension")).toBeDefined()
    expect(screen.getByTestId("view-bottom-footer")).toBeDefined()

    // Assert render order in the DOM
    const html = container.innerHTML
    expect(html.indexOf('data-testid="view-top-banner"')).toBeLessThan(
      html.indexOf('data-testid="view-header"'),
    )
    expect(html.indexOf('data-testid="view-header"')).toBeLessThan(
      html.indexOf('data-testid="view-header-summary"'),
    )
    expect(html.indexOf('data-testid="view-header-summary"')).toBeLessThan(
      html.indexOf('data-testid="table-layout"'),
    )
    expect(html.indexOf('data-testid="table-layout"')).toBeLessThan(
      html.indexOf('data-testid="view-bottom-footer"'),
    )
  })

  it("merges collection-level and view-specific slots in hierarchical order", () => {
    const view: SerializedView = {
      slug: "attending",
      label: "Attending",
      layout: "table",
      components: {
        beforeViewHeader: ["view-specific-banner"],
      },
    }

    const schema = {
      slug: "guests",
      labels: { singular: "Guest", plural: "Guests" },
      admin: {
        components: {
          beforeViewHeader: ["collection-wide-banner"],
        },
      },
      fields: [],
    }

    useDyrectedMock.mockReturnValue({
      client: {},
      user: { id: "u1" },
      components: {
        collectionView: {
          "collection-wide-banner": () => <div data-testid="collection-wide-banner">Collection Banner</div>,
          "view-specific-banner": () => <div data-testid="view-specific-banner">View Banner</div>,
        },
      },
    })

    const { container } = render(
      <MemoryRouter>
        <OperationalViewPage
          slug="guests"
          schema={schema}
          view={view}
          schemas={{ collections: [schema], globals: [] }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId("collection-wide-banner")).toBeDefined()
    expect(screen.getByTestId("view-specific-banner")).toBeDefined()

    const html = container.innerHTML
    expect(html.indexOf('data-testid="collection-wide-banner"')).toBeLessThan(
      html.indexOf('data-testid="view-specific-banner"'),
    )
  })
})
