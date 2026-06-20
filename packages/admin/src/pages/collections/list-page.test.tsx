import { cleanup, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CollectionConfig } from "@dyrected/core"
import { CollectionListPage } from "./list-page"

const useDyrectedMock = vi.fn()
const useQueryMock = vi.fn()

vi.mock("../../providers/dyrected-provider", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock("../../components/ui/data-table", () => ({
  DataTable: () => <div data-testid="list-table" />,
}))

vi.mock("../../components/ui/page-header", () => ({
  PageHeader: ({ title, children }: { title: string; children: ReactNode }) => (
    <div data-testid="list-header"><span>{title}</span>{children}</div>
  ),
}))

vi.mock("../../components/ui/pagination", () => ({
  Pagination: () => <div data-testid="list-pagination" />,
}))

vi.mock("../../components/ui/filter-builder", () => ({
  FilterBuilder: () => null,
}))

const response = {
  docs: [{ id: "1", title: "First" }],
  total: 1,
  limit: 20,
  page: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
}

function collection(slug: string, access?: CollectionConfig["access"]): CollectionConfig {
  return {
    slug,
    access,
    fields: [{ name: "title", type: "text" }],
    admin: {
      components: {
        beforeList: ["before"],
        beforeListTable: ["before-table"],
        afterListTable: ["after-table"],
        afterList: ["after"],
      },
    },
  }
}

describe("CollectionListPage component slots", () => {
  const posts = collection("posts")
  const pages = collection("pages")

  afterEach(cleanup)

  beforeEach(() => {
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => (
      options.queryKey[0] === "schemas"
        ? { data: { collections: [posts, pages], globals: [] }, isLoading: false }
        : { data: response, isLoading: false }
    ))

    const collectionClient = {
      find: () => ({ exec: vi.fn() }),
      delete: vi.fn(),
    }
    useDyrectedMock.mockReturnValue({
      client: {
        getSchemas: vi.fn(),
        collection: () => collectionClient,
        getBaseUrl: () => "http://localhost:3000",
      },
      user: { id: "admin-1" },
      components: {
        collectionList: {
          before: ({ collectionSlug }: { collectionSlug: string }) => <div data-testid="before-list">{collectionSlug}</div>,
          "before-table": () => <div data-testid="before-table" />,
          "after-table": () => <div data-testid="after-table" />,
          after: () => <div data-testid="after-list" />,
        },
      },
    })
  })

  it("renders all slots around the built-in list and updates props on slug transitions", () => {
    const view = render(<MemoryRouter><CollectionListPage slug="posts" /></MemoryRouter>)

    const orderedTestIds = Array.from(view.container.querySelectorAll("[data-testid]"))
      .map((element) => element.getAttribute("data-testid"))
      .filter((id) => ["before-list", "list-header", "before-table", "list-table", "after-table", "list-pagination", "after-list"].includes(id || ""))
    expect(orderedTestIds).toEqual(["before-list", "list-header", "before-table", "list-table", "after-table", "list-pagination", "after-list"])

    view.rerender(<MemoryRouter><CollectionListPage slug="pages" /></MemoryRouter>)
    expect(screen.getByTestId("before-list").textContent).toBe("pages")
  })

  it("does not render slots when read access is denied", () => {
    const denied = collection("private", { read: "false" })
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => (
      options.queryKey[0] === "schemas"
        ? { data: { collections: [denied], globals: [] }, isLoading: false }
        : { data: response, isLoading: false }
    ))

    render(<MemoryRouter><CollectionListPage slug="private" /></MemoryRouter>)
    expect(screen.getByText("Access Denied")).toBeDefined()
    expect(screen.queryByTestId("before-list")).toBeNull()
  })
})
