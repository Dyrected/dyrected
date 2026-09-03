import { cleanup, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CollectionConfig } from "@dyrected/core"
import { MediaPage } from "./media-page"

const useDyrectedMock = vi.fn()

vi.mock("../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("@tanstack/react-query", () => ({
  keepPreviousData: Symbol("keepPreviousData"),
  useInfiniteQuery: () => ({
    data: {
      pages: [{
        docs: [{ id: "asset-1", filename: "photo.jpg", mimeType: "image/jpeg" }],
        total: 1,
        limit: 12,
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      }],
    },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
  }),
  useQuery: () => ({
    data: { docs: [] },
    isLoading: false,
  }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
  }),
}))

vi.mock("../../components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div data-testid="media-grid">{children}</div>,
}))

vi.mock("react-blurhash", () => ({ Blurhash: () => null }))

const client = {
  getBaseUrl: () => "http://localhost:3000",
  listMedia: vi.fn(),
  deleteMedia: vi.fn(),
  update: vi.fn(),
}

function createSchema(access?: CollectionConfig["access"]): CollectionConfig {
  return {
    slug: "assets",
    upload: true,
    access,
    fields: [],
    admin: {
      components: {
        beforeList: ["before-list"],
        beforeListTable: ["before-table"],
        afterListTable: ["after-table"],
        afterList: ["after-list"],
      },
    },
  }
}

describe("MediaPage component slots", () => {
  afterEach(cleanup)

  beforeEach(() => {
    useDyrectedMock.mockReturnValue({
      client,
      user: { id: "admin-1" },
      components: {
        collectionList: {
          "before-list": () => <div data-testid="before-list" />,
          "before-table": () => <div data-testid="before-table" />,
          "after-table": () => <div data-testid="after-table" />,
          "after-list": (props: { documents: unknown[]; permissions: { canCreate: boolean } }) => (
            <div data-testid="after-list" data-documents={props.documents.length} data-can-create={props.permissions.canCreate} />
          ),
        },
      },
    })
  })

  it("renders all collection slots around the real media grid with rich props", () => {
    const { container } = render(<MediaPage collectionSlug="assets" schema={createSchema()} />)

    const orderedTestIds = Array.from(container.querySelectorAll("[data-testid]"))
      .map((element) => element.getAttribute("data-testid"))
      .filter((testId) => ["before-list", "before-table", "after-table", "after-list"].includes(testId || ""))

    expect(orderedTestIds).toEqual(["before-list", "before-table", "after-table", "after-list"])
    expect(screen.getByText("photo.jpg")).toBeTruthy()
    expect(screen.getByTestId("after-list").getAttribute("data-documents")).toBe("1")
    expect(screen.getByTestId("after-list").getAttribute("data-can-create")).toBe("true")
  })

  it("does not render extensions when collection read access is denied", () => {
    render(<MediaPage collectionSlug="assets" schema={createSchema({ read: "false" })} />)

    expect(screen.getByText("Access Denied")).toBeDefined()
    expect(screen.queryByTestId("before-list")).toBeNull()
    expect(screen.queryByTestId("media-grid")).toBeNull()
  })
})
