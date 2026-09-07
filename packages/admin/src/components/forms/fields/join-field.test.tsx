// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { JoinField } from "./join-field"

const navigateSpy = vi.fn()
const useWatchSpy = vi.fn()
const paramsRef: { current: { id?: string } } = { current: { id: "post-1" } }
const clientFindMock = vi.fn()
const clientCreateMock = vi.fn()
const clientUpdateMock = vi.fn()
const clientDeleteMock = vi.fn()
const clientFindOneMock = vi.fn()

const dyrectedRef: {
  current: {
    client: Record<string, unknown> | null
    schemas: {
      collections: Array<Record<string, unknown>>
      globals: Array<Record<string, unknown>>
    }
  }
} = {
  current: {
    client: null,
    schemas: {
      collections: [
        {
          slug: "comments",
          admin: { useAsTitle: "title" },
          labels: { singular: "Comment", plural: "Comments" },
          fields: [
            { name: "title", type: "text", label: "Title" },
            { name: "body", type: "textarea", label: "Body" },
          ],
        },
      ],
      globals: [],
    },
  },
}

vi.mock("react-hook-form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-hook-form")>()
  return {
    ...actual,
    useWatch: (...args: unknown[]) => useWatchSpy(...args),
  }
})

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateSpy,
  useParams: () => paramsRef.current,
}))

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => dyrectedRef.current,
}))

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

afterEach(() => {
  cleanup()
})

describe("JoinField", () => {
  beforeEach(() => {
    navigateSpy.mockReset()
    useWatchSpy.mockReset()
    clientFindMock.mockReset()
    clientCreateMock.mockReset()
    clientUpdateMock.mockReset()
    clientDeleteMock.mockReset()
    clientFindOneMock.mockImplementation((id: string) =>
      Promise.resolve({ id, title: "First comment", body: "Hello world" }),
    )

    paramsRef.current = { id: "post-1" }
    dyrectedRef.current = {
      client: {
        collection: () => ({
          find: (args: unknown) => ({
            exec: () => clientFindMock(args),
          }),
          create: (data: unknown) => clientCreateMock(data),
          update: (id: string, data: unknown) => clientUpdateMock(id, data),
          delete: (id: string) => clientDeleteMock(id),
          findOne: (id: string) => clientFindOneMock(id),
        }),
      },
      schemas: {
        collections: [
          {
            slug: "comments",
            admin: { useAsTitle: "title" },
            labels: { singular: "Comment", plural: "Comments" },
            fields: [
              { name: "title", type: "text", label: "Title" },
              { name: "body", type: "textarea", label: "Body" },
            ],
          },
        ],
        globals: [],
      },
    }
    useWatchSpy.mockReturnValue({
      docs: [
        { id: "comment-1", title: "First comment", body: "Hello world" },
      ],
      totalDocs: 1,
    })
    clientFindMock.mockResolvedValue({
      docs: [{ id: "comment-1", title: "First comment", body: "Hello world" }],
      totalDocs: 1,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
    })
  })

  it("renders both action buttons by default", () => {
    renderWithClient(
      <JoinField
        schema={{ name: "comments", collection: "comments", on: "post" }}
        control={{}}
      />,
    )

    expect(screen.getByRole("button", { name: "View all" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Create new Comment" })).toBeTruthy()
  })

  it("hides only the create button when configured", () => {
    renderWithClient(
      <JoinField
        schema={{
          name: "comments",
          collection: "comments",
          on: "post",
          admin: { showCreateButton: false },
        }}
        control={{}}
      />,
    )

    expect(screen.getByRole("button", { name: "View all" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Create new Comment" })).toBeNull()
  })

  it("hides only the view button when configured", () => {
    renderWithClient(
      <JoinField
        schema={{
          name: "comments",
          collection: "comments",
          on: "post",
          admin: { showViewButton: false },
        }}
        control={{}}
      />,
    )

    expect(screen.queryByRole("button", { name: "View all" })).toBeNull()
    expect(screen.getByRole("button", { name: "Create new Comment" })).toBeTruthy()
  })

  it("hides the action row when both buttons are disabled", () => {
    renderWithClient(
      <JoinField
        schema={{
          name: "comments",
          collection: "comments",
          on: "post",
          admin: { showCreateButton: false, showViewButton: false },
        }}
        control={{}}
      />,
    )

    expect(screen.queryByRole("button", { name: "View all" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Create new Comment" })).toBeNull()
  })

  it("navigates to the filtered list page from View all", async () => {
    const user = userEvent.setup()

    renderWithClient(
      <JoinField
        schema={{ name: "comments", collection: "comments", on: "post" }}
        control={{}}
      />,
    )

    await user.click(screen.getByRole("button", { name: "View all" }))

    expect(navigateSpy).toHaveBeenCalledWith(
      "/collections/comments?where=%7B%22post%22%3A%7B%22equals%22%3A%22post-1%22%7D%7D",
    )
  })

  it("opens create drawer when clicking Create new and allows opening full page", async () => {
    const user = userEvent.setup()

    renderWithClient(
      <JoinField
        schema={{ name: "comments", collection: "comments", on: "post" }}
        control={{}}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Create new Comment" }))

    expect(screen.getByRole("heading", { name: "Create new Comment" })).toBeTruthy()

    const maximizeBtn = screen.getByRole("button", { name: /open full page/i })
    await user.click(maximizeBtn)

    expect(navigateSpy).toHaveBeenCalledWith("/collections/comments/new?post=post-1")
  })

  it("opens edit drawer when clicking an item", async () => {
    const user = userEvent.setup()

    renderWithClient(
      <JoinField
        schema={{ name: "comments", collection: "comments", on: "post" }}
        control={{}}
      />,
    )

    await user.click(screen.getByText("First comment"))

    expect(screen.getByRole("heading", { name: "Edit Comment" })).toBeTruthy()
    expect(screen.getByText("Document ID: comment-1")).toBeTruthy()
  })

  it("toggles between list and table view layouts", async () => {
    const user = userEvent.setup()

    renderWithClient(
      <JoinField
        schema={{
          name: "comments",
          collection: "comments",
          on: "post",
        }}
        control={{}}
      />,
    )

    // Initially in list layout
    expect(screen.getByLabelText("Table view")).toBeTruthy()

    // Switch to table layout
    await user.click(screen.getByLabelText("Table view"))

    // Should render table column headers
    expect(screen.getByRole("table")).toBeTruthy()
    expect(screen.getByText("Title")).toBeTruthy()

    // Switch back to list layout
    await user.click(screen.getByLabelText("List view"))
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("renders table layout by default when configured in schema", () => {
    renderWithClient(
      <JoinField
        schema={{
          name: "comments",
          collection: "comments",
          on: "post",
          admin: { layout: "table", columns: ["title", "body"] },
        }}
        control={{}}
      />,
    )

    expect(screen.getByRole("table")).toBeTruthy()
    expect(screen.getByText("Title")).toBeTruthy()
    expect(screen.getByText("Body")).toBeTruthy()
  })

  it("shows the save-first message before a document exists", () => {
    paramsRef.current = {}

    renderWithClient(
      <JoinField
        schema={{ name: "comments", collection: "comments", on: "post" }}
        control={{}}
      />,
    )

    expect(screen.getByText("Save this document first to view related comments.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "View all" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Create new Comment" })).toBeNull()
  })

  it("renders Load more button when hasNextPage is true and fetches next page", async () => {
    const user = userEvent.setup()

    const page1Docs = Array.from({ length: 10 }, (_, i) => ({
      id: `comment-${i + 1}`,
      title: `Comment ${i + 1}`,
    }))

    const page2Docs = [
      { id: "comment-11", title: "Comment 11" },
    ]

    clientFindMock
      .mockResolvedValueOnce({
        docs: page1Docs,
        totalDocs: 11,
        page: 1,
        totalPages: 2,
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        docs: page2Docs,
        totalDocs: 11,
        page: 2,
        totalPages: 2,
        hasNextPage: false,
      })

    renderWithClient(
      <JoinField
        schema={{ name: "comments", collection: "comments", on: "post" }}
        control={{}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /load more/i })).toBeTruthy()
    })

    await user.click(screen.getByRole("button", { name: /load more/i }))

    await waitFor(() => {
      expect(screen.getByText("Comment 11")).toBeTruthy()
    })
  })

  it("triggers delete confirmation and calls client delete", async () => {
    const user = userEvent.setup()

    renderWithClient(
      <JoinField
        schema={{ name: "comments", collection: "comments", on: "post" }}
        control={{}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("First comment")).toBeTruthy()
    })

    const deleteBtn = screen.getByTitle("Delete Comment")
    await user.click(deleteBtn)

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete this comment\?/i)).toBeTruthy()
    })

    const confirmDeleteBtn = screen.getByRole("button", { name: /^Delete$/i })
    await user.click(confirmDeleteBtn)

    expect(clientDeleteMock).toHaveBeenCalledWith("comment-1")
  })
})
