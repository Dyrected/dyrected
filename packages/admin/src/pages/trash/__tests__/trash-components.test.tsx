import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"
import { EmptyTrashDialog } from "../empty-trash-dialog"
import { RestoreConflictDialog } from "../restore-conflict-dialog"
import { TrashViewTable } from "../trash-view-table"
import { TrashPreviewSheet } from "../trash-preview-sheet"
import type { TrashConflict, TrashEntrySnapshot } from "../trash-types"

afterEach(() => {
  cleanup()
})

describe("EmptyTrashDialog", () => {
  it("disables confirm button until the exact expected text is entered", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()

    render(
      <EmptyTrashDialog
        open={true}
        onOpenChange={onOpenChange}
        expectedValue="articles"
        title="Empty articles trash"
        onConfirm={onConfirm}
      />
    )

    const confirmButton = screen.getByRole("button", { name: /Empty trash forever/i }) as HTMLButtonElement
    expect(confirmButton.disabled).toBe(true)

    const input = screen.getByPlaceholderText("articles")
    fireEvent.change(input, { target: { value: "artic" } })
    expect(confirmButton.disabled).toBe(true)

    fireEvent.change(input, { target: { value: "articles" } })
    expect(confirmButton.disabled).toBe(false)

    fireEvent.click(confirmButton)
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })
  })
})

describe("RestoreConflictDialog", () => {
  const conflicts: TrashConflict[] = [
    {
      field: "slug",
      value: "hello-world",
      existingDocId: "doc_999",
    },
  ]

  const entry: TrashEntrySnapshot = {
    id: "trash_123",
    collection: "posts",
    docId: "doc_123",
    title: "Hello World",
    snapshot: { id: "doc_123", slug: "hello-world", title: "Hello World" },
    deletedAt: Date.now() - 10000,
    purgeAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  }

  it("renders conflict fields and calls onConfirmOverrides with modified values", async () => {
    const onConfirmOverrides = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()

    render(
      <RestoreConflictDialog
        open={true}
        onOpenChange={onOpenChange}
        entry={entry}
        conflicts={conflicts}
        onConfirmOverrides={onConfirmOverrides}
      />
    )

    expect(screen.getByText("Restore Conflict")).toBeTruthy()
    expect(screen.getByText(/Conflicting Fields:/i)).toBeTruthy()

    // Form input defaults to original value
    const input = screen.getByDisplayValue("hello-world")
    fireEvent.change(input, { target: { value: "hello-world-2" } })

    const submitBtn = screen.getByRole("button", { name: /Restore with changes/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(onConfirmOverrides).toHaveBeenCalledWith({ slug: "hello-world-2" })
    })
  })
})

describe("TrashViewTable", () => {
  const now = Date.now()
  const in3Days = now + (3 * 24 * 60 * 60 * 1000)

  const entries: TrashEntrySnapshot[] = [
    {
      id: "trash_1",
      collection: "articles",
      docId: "doc_1",
      title: "First Trashed Article",
      snapshot: { id: "doc_1", title: "First Trashed Article" },
      deletedAt: now,
      purgeAt: in3Days,
    },
    {
      id: "trash_2",
      collection: "articles",
      docId: "doc_2",
      title: "Indefinite Trashed Article",
      snapshot: { id: "doc_2", title: "Indefinite Trashed Article" },
      deletedAt: now,
      purgeAt: null,
    },
  ]

  it("renders entries and badges correctly", () => {
    render(
      <TrashViewTable
        entries={entries}
        selectedIds={[]}
        onSelectedIdsChange={vi.fn()}
        onRestore={vi.fn()}
        onKeep={vi.fn()}
        onDeleteForever={vi.fn()}
        onPreview={vi.fn()}
      />
    )

    expect(screen.getByText("First Trashed Article")).toBeTruthy()
    expect(screen.getByText("Indefinite Trashed Article")).toBeTruthy()

    // Countdown badge for entry with purgeAt
    expect(screen.getByText(/Purges in 3 days/i)).toBeTruthy()

    // Indefinite retention badge for null purgeAt
    expect(screen.getByText(/Kept until emptied/i)).toBeTruthy()
  })
})

describe("TrashPreviewSheet", () => {
  it("renders preview with formatted dates, boolean pills, and image preview without Invalid Date", () => {
    // Test with string numeric timestamps as returned by PostgreSQL
    const entry: TrashEntrySnapshot = {
      id: "trash_4ufil",
      collection: "guest-responses",
      docId: "4ufil",
      title: "Someone",
      deletedBy: "eu36go",
      deletedAt: "1758872000000",
      purgeAt: "1761464000000",
      snapshot: {
        id: "4ufil",
        name: "Someone",
        email: "someone@example.com",
        asobi: false,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600",
        attending: true,
        checkedIn: true,
        createdAt: "2026-08-24T10:36:55.630Z",
      },
    }

    const { container } = render(
      <TrashPreviewSheet
        entry={entry}
        open={true}
        onOpenChange={vi.fn()}
        onRestore={vi.fn()}
      />
    )

    // Must never contain "Invalid Date"
    expect(container.textContent).not.toContain("Invalid Date")

    // Document header info
    expect(screen.getAllByText("Someone").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("4ufil").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/User \(eu36go\)/i)).toBeTruthy()

    // Boolean friendly pills
    expect(screen.getAllByText("Yes").length).toBeGreaterThanOrEqual(2) // attending, checkedIn
    expect(screen.getByText("No")).toBeTruthy() // asobi

    // Humanized labels
    expect(screen.getByText("Checked In")).toBeTruthy()
    expect(screen.getByText("Created At")).toBeTruthy()

    // Image preview (Sheet renders into Portal at document.body)
    const img = document.body.querySelector("img")
    expect(img).toBeTruthy()
    expect(img?.getAttribute("src")).toContain("images.unsplash.com")

    // Email link
    const mailLink = document.body.querySelector('a[href="mailto:someone@example.com"]')
    expect(mailLink).toBeTruthy()
  })
})

