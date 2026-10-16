import { useState } from "react"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DrawerDocumentForm } from "../drawer-document-form"
import { useDocumentForm } from "../../../hooks/use-document-form"
import { DyrectedField } from "../embedded-fields"

const useDyrectedMock = vi.fn()
vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
  useOptionalDyrected: () => null,
}))

const SCHEMA = {
  fields: [{ name: "name", type: "text", label: "Name" }],
  admin: { components: { createForm: "guests.quick" } },
}

function QuickForm(props: { collection: string; mode: string; presentation: string }) {
  const { submit, presentation } = useDocumentForm()
  const [result, setResult] = useState("")
  return (
    <div>
      <p data-testid="props">{`${props.collection}:${props.mode}:${props.presentation}:${presentation}`}</p>
      <DyrectedField path="name" />
      <button
        type="button"
        onClick={async () => {
          const r = await submit({ overrides: { name: "Scanned" } })
          setResult(r.ok ? "ok" : `failed:${Object.values(r.errors).join(",")}`)
        }}
      >
        Go
      </button>
      <p data-testid="result">{result}</p>
    </div>
  )
}

function renderForm(onSubmit: any, components: Record<string, any>, schema: any = SCHEMA) {
  useDyrectedMock.mockReturnValue({ user: { id: "u" }, components: { forms: components } })
  render(
    <MemoryRouter>
      <DrawerDocumentForm
        collection="guests"
        schema={schema}
        defaultValues={{}}
        submitLabel="Create"
        onSubmit={onSubmit}
      />
    </MemoryRouter>,
  )
}

beforeEach(() => useDyrectedMock.mockReset())
afterEach(cleanup)

describe("DrawerDocumentForm", () => {
  it("renders the collection's createForm with presentation drawer and resolves submit() to the caller", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ id: "g1" })
    renderForm(onSubmit, { "guests.quick": QuickForm })

    expect((await screen.findByTestId("props")).textContent).toBe("guests:create:drawer:drawer")
    await userEvent.click(screen.getByText("Go"))

    await waitFor(() => expect(screen.getByTestId("result").textContent).toBe("ok"))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Scanned" }))
  })

  it("reports a failed save as { ok: false } instead of throwing", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Nope"))
    renderForm(onSubmit, { "guests.quick": QuickForm })

    await userEvent.click(await screen.findByText("Go"))

    await waitFor(() => expect(screen.getByTestId("result").textContent).toBe("failed:Nope"))
  })

  it("uses the built-in form when formInDrawer is false", async () => {
    renderForm(vi.fn(), { "guests.quick": QuickForm }, {
      ...SCHEMA,
      admin: { components: { ...SCHEMA.admin.components, formInDrawer: false } },
    })

    expect(await screen.findByText("Name")).toBeTruthy()
    expect(screen.queryByText("Go")).toBeNull()
    expect(screen.getByRole("button", { name: "Create" })).toBeTruthy()
  })

  it("falls back to the built-in form when the key is not registered", async () => {
    renderForm(vi.fn(), {})

    expect(await screen.findByText("Name")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Create" })).toBeTruthy()
  })

  it("offers Use default form when the custom form crashes", async () => {
    const Broken = () => {
      throw new Error("kaboom")
    }
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    renderForm(vi.fn(), { "guests.quick": Broken })

    await userEvent.click(await screen.findByText("Use default form"))

    expect(await screen.findByRole("button", { name: "Create" })).toBeTruthy()
  })
})
