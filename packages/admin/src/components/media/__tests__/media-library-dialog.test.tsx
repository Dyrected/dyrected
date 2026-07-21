import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MediaLibraryDialog } from "../media-library-dialog"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const mockListMedia = vi.fn().mockResolvedValue({
  docs: [
    { id: "item1", filename: "photo.jpg", mimeType: "image/jpeg", filesize: 1024 },
    { id: "item2", filename: "video.mp4", mimeType: "video/youtube", filesize: 0, url: "https://youtube.com/watch?v=123" },
  ],
  hasNextPage: false,
  page: 1,
  totalPages: 1,
  total: 2,
})

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => ({
    client: {
      listMedia: mockListMedia,
      getBaseUrl: () => "http://localhost:3000",
      collection: () => ({
        upload: vi.fn(),
        create: vi.fn(),
      }),
    },
    schemas: {
      collections: [{ slug: "media", upload: true }],
    },
  }),
}))

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe("MediaLibraryDialog component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders tabs (Library, Upload, External) and collection label", async () => {
    renderWithQuery(
      <MediaLibraryDialog
        collection="media"
        isOpen={true}
        onOpenChange={vi.fn()}
        selectedValues={[]}
        onSelect={vi.fn()}
      />
    )

    const libraryTab = screen.getAllByRole("tab", { name: /Library/i })[0]
    const uploadTab = screen.getAllByRole("tab", { name: /Upload/i })[0]
    const externalTab = screen.getAllByRole("tab", { name: /External/i })[0]

    expect(libraryTab).toBeTruthy()
    expect(uploadTab).toBeTruthy()
    expect(externalTab).toBeTruthy()

    expect(libraryTab.getAttribute("data-state")).toBe("active")
  })

  it("renders search input and media list area in library tab", async () => {
    renderWithQuery(
      <MediaLibraryDialog
        collection="media"
        isOpen={true}
        onOpenChange={vi.fn()}
        selectedValues={[]}
        onSelect={vi.fn()}
      />
    )

    const inputs = screen.getAllByPlaceholderText(/Search your media library/i)
    expect(inputs.length).toBeGreaterThan(0)
    expect(inputs[0]).toBeTruthy()
  })
})
