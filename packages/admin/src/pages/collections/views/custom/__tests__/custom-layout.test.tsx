import { useEffect } from "react"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CustomLayout, type CustomLayoutProps } from "../custom-layout"
import { useViewController } from "../../use-view-controller"
import { ViewControllerContext } from "../../../../../providers/view-controller"
import { useCollectionView, useViewActions } from "../../../../../hooks/use-collection-view"
import type { SerializedAction, SerializedView } from "../../types"
import type { ViewDocument } from "../../../../../providers/view-controller"

const useDyrectedMock = vi.fn()

vi.mock("../../../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const DOCS = [
  { id: "1", name: "Ada", table: "A" },
  { id: "2", name: "Grace", table: "B" },
]

function makeClient(overrides: { find?: any; update?: any } = {}) {
  const find = overrides.find ?? vi.fn().mockResolvedValue({ docs: DOCS, total: 2, totalPages: 1 })
  const update = overrides.update ?? vi.fn().mockResolvedValue({ id: "1", name: "Ada", table: "C" })
  return { client: { collection: () => ({ find, update }) }, find, update }
}

/** Mounts the layout under the real per-view controller, as the page does. */
type HarnessProps = CustomLayoutProps & {
  permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, docs: ViewDocument[], input?: Record<string, unknown>) => Promise<boolean>
}

function Harness(props: HarnessProps) {
  const { permissions, actions, onRunAction, ...layoutProps } = props
  const controller = useViewController({
    slug: layoutProps.slug,
    schema: layoutProps.schema,
    view: layoutProps.view,
    actions,
    permissions,
    hasDetail: true,
    runningKeys: [],
    runAction: onRunAction,
  })
  return (
    <ViewControllerContext.Provider value={controller}>
      <CustomLayout {...layoutProps} />
    </ViewControllerContext.Provider>
  )
}

function renderLayout(
  props: Partial<Pick<HarnessProps, "actions" | "onRunAction">> & { view?: Partial<SerializedView> },
  components: Record<string, any>,
  client: unknown,
) {
  useDyrectedMock.mockReturnValue({ client, components: { viewLayouts: components } })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view: SerializedView = {
    slug: "seating",
    label: "Seating",
    layout: "custom",
    component: "seating",
    ...props.view,
  } as SerializedView

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Harness
          permissions={{ canCreate: true, canUpdate: true, canDelete: false }}
          slug="guests"
          schema={{
            slug: "guests",
            fields: [
              { name: "name", type: "text" },
              { name: "table", type: "text" },
            ],
          }}
          schemas={{}}
          actions={[]}
          onRunAction={vi.fn().mockResolvedValue(true)}
          renderTableFallback={() => <div data-testid="table-fallback" />}
          {...props}
          view={view}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("CustomLayout", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("renders the registered component with the host's documents and identity props", async () => {
    const { client, find } = makeClient()
    function Seating(props: { collection: string; viewSlug: string }) {
      const { documents, total, config } = useCollectionView()
      return (
        <div data-testid="seating" data-collection={props.collection} data-view={props.viewSlug}>
          {documents.map((d) => d.name).join(",")}|{total}|{String(config.options?.tableField)}
        </div>
      )
    }

    renderLayout({ view: { options: { tableField: "table" } } }, { seating: Seating }, client)

    const node = await screen.findByTestId("seating")
    expect(node.textContent).toBe("Ada,Grace|2|table")
    expect(node.dataset.collection).toBe("guests")
    expect(node.dataset.view).toBe("seating")
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 50 }))
  })

  it("applies updateDocument optimistically and rolls back when the server rejects", async () => {
    let reject!: (error: Error) => void
    const update = vi.fn().mockImplementation(
      () => new Promise((_, rej) => {
        reject = rej
      }),
    )
    const { client } = makeClient({ update })
    let move: (() => Promise<unknown>) | undefined
    function Seating() {
      const { documents, updateDocument } = useCollectionView()
      useEffect(() => {
        move = () => updateDocument("1", { table: "Z" }).catch(() => undefined)
      }, [updateDocument])
      return <div data-testid="tables">{documents.map((d) => d.table).join(",")}</div>
    }

    renderLayout({}, { seating: Seating }, client)
    await screen.findByText("A,B")

    let pending: Promise<unknown> | undefined
    act(() => {
      pending = move!()
    })
    await waitFor(() => expect(screen.getByTestId("tables").textContent).toBe("Z,B"))
    await act(async () => {
      reject(new Error("nope"))
      await pending
    })
    await waitFor(() => expect(screen.getByTestId("tables").textContent).toBe("A,B"))
    expect(update).toHaveBeenCalledWith("1", { table: "Z" })
  })

  it("runs actions through the host, defaulting to the selection", async () => {
    const { client } = makeClient()
    const onRunAction = vi.fn().mockResolvedValue(true)
    const assign = { name: "assignTable", label: "Assign", type: "row" as const }
    function Seating() {
      const { documents, selection } = useCollectionView()
      const { run, actions } = useViewActions()
      return (
        <div>
          <span data-testid="actions">{actions.map((a) => a.name).join(",")}</span>
          <button onClick={() => selection.set([documents[1].id])}>select</button>
          <button onClick={() => void run("assignTable", undefined, { tableNumber: 4 })}>run</button>
        </div>
      )
    }

    renderLayout({ actions: [assign], onRunAction }, { seating: Seating }, client)
    await screen.findByTestId("actions")
    expect(screen.getByTestId("actions").textContent).toBe("assignTable")

    act(() => screen.getByText("select").click())
    await act(async () => screen.getByText("run").click())

    expect(onRunAction).toHaveBeenCalledWith(assign, [DOCS[1]], { tableNumber: 4 })
  })

  it("offers 'Show as table' when the component key is not registered", async () => {
    const { client } = makeClient()
    renderLayout({}, {}, client)

    expect(await screen.findByText("This view's layout is unavailable.")).toBeTruthy()
    act(() => screen.getByText("Show as table").click())
    expect(screen.getByTestId("table-fallback")).toBeTruthy()
  })

  it("tells the user when fetchAll was truncated at the cap", async () => {
    const find = vi.fn().mockImplementation(async ({ page }: { page: number }) => ({
      docs: Array.from({ length: 100 }, (_, i) => ({ id: `${page}-${i}` })),
      total: 1500,
    }))
    const { client } = makeClient({ find })
    function Seating() {
      const { documents } = useCollectionView()
      return <div data-testid="count">{documents.length}</div>
    }

    renderLayout({ view: { data: { fetchAll: true } } }, { seating: Seating }, client)

    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1000"))
    expect(screen.getByText(/Showing the first 1,000 of 1,500 records/)).toBeTruthy()
  })

  it("shows the shared faceted filter bar and narrows the query when a filter is applied", async () => {
    const { client, find } = makeClient()
    function Seating() {
      const { documents } = useCollectionView()
      return <div data-testid="seating">{documents.length}</div>
    }

    renderLayout({}, { seating: Seating }, client)
    await screen.findByTestId("seating")

    // Same toolbar the table uses: search input plus the field filter menu.
    expect(screen.getByRole("toolbar")).toBeTruthy()
    expect(screen.getByRole("button", { name: /filter/i })).toBeTruthy()
    expect(screen.getByPlaceholderText(/search/i)).toBeTruthy()
    expect(find).toHaveBeenCalledTimes(1)
  })
})
