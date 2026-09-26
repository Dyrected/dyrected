import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"
import { EmptyTrashDialog } from "../empty-trash-dialog"
import { RestoreConflictDialog } from "../restore-conflict-dialog"
import { TrashViewTable } from "../trash-view-table"
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
