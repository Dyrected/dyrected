import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import { RecordPeekDrawer } from "../record-peek-drawer"

const useDyrectedMock = vi.fn()

vi.mock("../../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("../../../../components/detail/detail-renderer", () => ({
  DetailRenderer: ({ doc }: { doc: any }) => (
    <div data-testid="detail-renderer">
      <span>Loaded Doc: {doc.title}</span>
    </div>
  ),
}))

describe("RecordPeekDrawer", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  const mockSchema = {
    slug: "invoices",
    labels: { singular: "Invoice", plural: "Invoices" },
    admin: { useAsTitle: "title" },
  }

  it("renders detail when record is loaded", async () => {
    const mockFindOne = vi.fn().mockResolvedValue({ id: "inv-123", title: "Invoice #123" })
    const mockClient = {
      collection: () => ({
        findOne: mockFindOne,
      }),
    }

    useDyrectedMock.mockReturnValue({
      client: mockClient,
      user: { id: "user-1" },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RecordPeekDrawer
            collectionSlug="invoices"
            recordId="inv-123"
            schema={mockSchema}
            schemas={{ collections: [mockSchema] }}
            isOpen={true}
            onClose={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // The title in header
    expect(await screen.findByText("Invoice #123")).toBeTruthy()
    // The detail renderer
    expect(screen.getByTestId("detail-renderer")).toBeTruthy()
    // Open full page link
    const link = screen.getByRole("link", { name: /Open Full Page/i })
    expect(link.getAttribute("href")).toBe("/collections/invoices/inv-123")
  })
})
