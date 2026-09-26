import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EmailTemplateEditor } from "../email-template-editor"

const useDyrectedMock = vi.fn()

vi.mock("../../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

describe("EmailTemplateEditor Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDyrectedMock.mockReturnValue({
      user: { id: "admin_1", email: "admin@example.com" },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("renders editor controls and variable chip insertion buttons", () => {
    const onChange = vi.fn()
    render(
      <EmailTemplateEditor
        value="<p>Hello {{email}}</p>"
        onChange={onChange}
        siblingData={{ purpose: "invite", format: "html", collectionSlug: "users" }}
      />,
    )

    expect(screen.getByRole("button", { name: /split view/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /html editor/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /live preview/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /revert to default/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /send test/i })).toBeInTheDocument()

    // Variable tags
    expect(screen.getByText("{{url}}")).toBeInTheDocument()
    expect(screen.getByText("{{token}}")).toBeInTheDocument()
    expect(screen.getByText("{{email}}")).toBeInTheDocument()
    expect(screen.getByText("{{collectionLabel}}")).toBeInTheDocument()
    expect(screen.getByText("{{siteName}}")).toBeInTheDocument()
  })

  it("clicking a variable chip calls onChange with the variable tag inserted", () => {
    const onChange = vi.fn()
    render(
      <EmailTemplateEditor
        value="<p>Welcome</p>"
        onChange={onChange}
        siblingData={{ purpose: "invite", format: "html", collectionSlug: "users" }}
      />,
    )

    const urlChip = screen.getByText("{{url}}")
    fireEvent.click(urlChip)

    expect(onChange).toHaveBeenCalledWith("<p>Welcome</p>\n{{url}}")
  })

  it("clicking Revert to Default restores code-defined template", () => {
    const onChange = vi.fn()
    render(
      <EmailTemplateEditor
        value="<p>Custom draft</p>"
        onChange={onChange}
        siblingData={{ purpose: "invite", format: "html", collectionSlug: "investors" }}
      />,
    )

    const revertButton = screen.getByRole("button", { name: /revert to default/i })
    fireEvent.click(revertButton)

    expect(onChange).toHaveBeenCalled()
    const callArg = onChange.mock.calls[0][0]
    expect(callArg).toContain("You're invited to join {{siteName}}")
    expect(callArg).toContain("{{url}}")
  })

  it("renders external template provider mode when format is external_template", () => {
    const onChange = vi.fn()
    render(
      <EmailTemplateEditor
        value=""
        onChange={onChange}
        siblingData={{
          purpose: "invite",
          format: "external_template",
          externalTemplateId: "seamailer_84291",
          collectionSlug: "members",
        }}
      />,
    )

    expect(screen.getByText(/external template provider mode/i)).toBeInTheDocument()
    expect(screen.getByText("seamailer_84291")).toBeInTheDocument()
    expect(screen.getByText(/dynamic variables passed to provider/i)).toBeInTheDocument()
    expect(screen.getByText("members")).toBeInTheDocument()
  })

  it("opens test email dialog and submits test dispatch", async () => {
    const onChange = vi.fn()
    render(
      <EmailTemplateEditor
        value="<p>Test</p>"
        onChange={onChange}
        siblingData={{ purpose: "welcome", format: "html" }}
      />,
    )

    const sendTestBtn = screen.getByRole("button", { name: /send test/i })
    fireEvent.click(sendTestBtn)

    expect(screen.getByRole("heading", { name: /send test email/i })).toBeInTheDocument()
    const submitBtn = screen.getByRole("button", { name: /^send test email$/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.queryByText(/dispatch a test email using this raw html template/i)).not.toBeInTheDocument()
    })
  })
})
