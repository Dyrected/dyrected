import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { InfoHint } from "../info-hint"

function mockInput(hoverCapable: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
    matches: hoverCapable,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("InfoHint", () => {
  beforeEach(() => mockInput(true))

  it("renders nothing when there is nothing to explain", () => {
    const { container } = render(<InfoHint title="Revenue" />)
    expect(container.innerHTML).toBe("")
    cleanup()
    const blank = render(<InfoHint title="Revenue" description="   " items={[]} />)
    expect(blank.container.innerHTML).toBe("")
  })

  it("gives the button an accessible name", () => {
    render(<InfoHint title="Revenue" description="Money in." />)
    expect(screen.getByRole("button", { name: "About Revenue" })).toBeTruthy()
  })

  describe("with a mouse or trackpad", () => {
    it("shows a tooltip on keyboard focus, with formatting", async () => {
      render(<InfoHint title="Revenue" description="Payments **received** in `30` days." />)
      act(() => {
        screen.getByRole("button", { name: "About Revenue" }).focus()
      })
      const tips = await screen.findAllByText("received")
      expect(tips[0].tagName).toBe("STRONG")
      expect(screen.getAllByText("30")[0].tagName).toBe("CODE")
    })

    it("lists breakdown notes under the description", async () => {
      render(
        <InfoHint
          title="Revenue"
          description="Total."
          items={[{ label: "Paid", description: "Settled invoices." }]}
        />,
      )
      act(() => {
        screen.getByRole("button", { name: "About Revenue" }).focus()
      })
      expect((await screen.findAllByText(/Settled invoices\./))[0]).toBeTruthy()
      expect(screen.getAllByText(/Paid:/)[0]).toBeTruthy()
    })

    it("opens on click instead of hover when the text has a link, so the link can be clicked", async () => {
      render(<InfoHint title="Revenue" description="See [the guide](https://example.com/guide)." />)
      fireEvent.click(screen.getByRole("button", { name: "About Revenue" }))
      const link = (await screen.findByRole("link", { name: "the guide" })) as HTMLAnchorElement
      expect(link.href).toBe("https://example.com/guide")
      expect(link.target).toBe("_blank")
    })

    it("does not trigger a clickable card around it", () => {
      const onCard = vi.fn()
      render(
        <div role="button" tabIndex={0} onClick={onCard} onKeyDown={onCard}>
          <InfoHint title="Revenue" description="Money in." />
        </div>,
      )
      const button = screen.getByRole("button", { name: "About Revenue" })
      fireEvent.click(button)
      fireEvent.keyDown(button, { key: "Enter" })
      fireEvent.keyDown(button, { key: " " })
      expect(onCard).not.toHaveBeenCalled()
    })
  })

  describe("on a touch screen", () => {
    beforeEach(() => mockInput(false))

    it("opens a bottom sheet with the title and description when tapped", async () => {
      render(<InfoHint title="Revenue" description="Payments **received**." />)
      expect(screen.queryByRole("dialog")).toBeNull()

      fireEvent.click(screen.getByRole("button", { name: "About Revenue" }))

      const dialog = await screen.findByRole("dialog")
      expect(dialog.textContent).toContain("Revenue")
      expect(dialog.querySelector("strong")?.textContent).toBe("received")
    })

    it("includes breakdown notes in the sheet", async () => {
      render(<InfoHint title="Revenue" items={[{ label: "Paid", description: "Settled." }]} />)
      fireEvent.click(screen.getByRole("button", { name: "About Revenue" }))
      const dialog = await screen.findByRole("dialog")
      expect(dialog.textContent).toContain("Paid: Settled.")
    })

    it("closes with the close control", async () => {
      render(<InfoHint title="Revenue" description="Money in." />)
      fireEvent.click(screen.getByRole("button", { name: "About Revenue" }))
      await screen.findByRole("dialog")
      fireEvent.click(screen.getByRole("button", { name: "Close" }))
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    })

    it("does not trigger a clickable card when tapping the icon or the sheet", async () => {
      const onCard = vi.fn()
      render(
        <div role="button" tabIndex={0} onClick={onCard}>
          <InfoHint title="Revenue" description="Money in." />
        </div>,
      )
      fireEvent.click(screen.getByRole("button", { name: "About Revenue" }))
      const dialog = await screen.findByRole("dialog")
      fireEvent.click(dialog)
      expect(onCard).not.toHaveBeenCalled()
    })

    it("keeps links tappable", async () => {
      render(<InfoHint title="Revenue" description="[Guide](https://example.com)" />)
      fireEvent.click(screen.getByRole("button", { name: "About Revenue" }))
      const link = (await screen.findByRole("link", { name: "Guide" })) as HTMLAnchorElement
      expect(link.rel).toBe("noopener noreferrer")
    })
  })
})
