import { cleanup, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CollectionConfig } from "@dyrected/core"
import { CollectionListPage } from "./list-page"

const useDyrectedMock = vi.fn()
const useQueryMock = vi.fn()
const dataTableMock = vi.fn()
const pageHeaderMock = vi.fn()

vi.mock("../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("@tanstack/react-query", () => ({
  keepPreviousData: Symbol("keepPreviousData"),
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock("../../components/ui/data-table", () => ({
  DataTable: (props: unknown) => {
    dataTableMock(props)
    return <div data-testid="list-table" />
  },
}))

vi.mock("../../components/ui/page-header", () => ({
  PageHeader: (props: { title: string; description?: string; children: ReactNode }) => {
    pageHeaderMock(props)
    return <div data-testid="list-header"><span>{props.title}</span>{props.children}</div>
  },
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
    fields: [{ name: "title", type: "text", label: "Title" }],
    admin: {
      description: `${slug} description`,
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
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
  })

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    dataTableMock.mockClear()
    pageHeaderMock.mockClear()
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
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Cannot update a component while rendering a different component")
    )
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

  it("adds a status column for draft-enabled collections", () => {
    const draftCollection = {
      ...collection("draft-posts"),
      drafts: true,
    }

    useQueryMock.mockImplementation((options: { queryKey: string[] }) => (
      options.queryKey[0] === "schemas"
        ? { data: { collections: [draftCollection], globals: [] }, isLoading: false }
        : { data: response, isLoading: false }
    ))

    render(<MemoryRouter><CollectionListPage slug="draft-posts" /></MemoryRouter>)

    const props = dataTableMock.mock.calls.at(-1)?.[0] as { columns?: Array<{ id?: string; header?: string }> } | undefined
    const headers = (props?.columns ?? []).map((column) => column.id ?? column.header)
    expect(headers).toContain("publishingStatus")
  })

  it("passes backend search props to the table and uses the collection description in the header", () => {
    render(<MemoryRouter initialEntries={["/collections/posts?search=Grace"]}><CollectionListPage slug="posts" /></MemoryRouter>)

    const tableProps = dataTableMock.mock.calls.at(-1)?.[0] as {
      searchValue?: string
      onSearchChange?: (value: string) => void
    } | undefined
    expect(tableProps?.searchValue).toBe("Grace")
    expect(typeof tableProps?.onSearchChange).toBe("function")

    const headerProps = pageHeaderMock.mock.calls.at(-1)?.[0] as { description?: string } | undefined
    expect(headerProps?.description).toBe("posts description")
  })
})
