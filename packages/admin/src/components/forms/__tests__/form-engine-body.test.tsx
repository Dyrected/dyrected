import * as React from "react"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FormEngine, type FormEngineHandle } from "../form-engine"
import { FormValidationError } from "../form-validation-error"
import { DyrectedField, DyrectedDefaultForm } from "../embedded-fields"
import { useDyrectedForm } from "../../../hooks/use-dyrected-form"

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => ({ user: { id: "u1" }, components: {}, client: {}, schemas: { collections: [] } }),
  useOptionalDyrected: () => null,
}))

const FIELDS = [
  { name: "name", type: "text", label: "Name", required: true },
  { name: "note", type: "text", label: "Note" },
] as any[]

function ErrorProbe() {
  const form = useDyrectedForm()
  return <p data-testid="name-error">{form.errors.name ?? ""}</p>
}

function mount(props: {
  onSubmit: (data: Record<string, unknown>) => Promise<unknown>
  body?: React.ReactNode
  defaultValues?: Record<string, unknown>
}) {
  const ref = React.createRef<FormEngineHandle>()
  render(
    <MemoryRouter>
      <FormEngine
        ref={ref}
        collection="guests"
        fields={FIELDS}
        defaultValues={props.defaultValues ?? {}}
        onSubmit={props.onSubmit}
        body={props.body}
        hideSubmit
      />
    </MemoryRouter>,
  )
  return ref
}

afterEach(cleanup)

describe("FormEngine custom body", () => {
  it("renders built-in inputs for the fields the body asks for", async () => {
    mount({
      onSubmit: vi.fn(),
      body: (
        <>
          <DyrectedField path="name" />
          <p>custom footer</p>
        </>
      ),
    })

    expect(await screen.findByText("Name")).toBeTruthy()
    expect(screen.getByText("custom footer")).toBeTruthy()
    expect(screen.queryByText("Note")).toBeNull()
  })

  it("renders the default body minus excluded fields", async () => {
    mount({ onSubmit: vi.fn(), body: <DyrectedDefaultForm exclude={["note"]} /> })

    expect(await screen.findByText("Name")).toBeTruthy()
    expect(screen.queryByText("Note")).toBeNull()
  })

  it("merges overrides over the form values for one submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ doc: { id: "1" } })
    const ref = mount({ onSubmit, body: <DyrectedField path="note" /> })
    await screen.findByText("Note")

    await act(async () => {
      await ref.current!.submitCurrentDraft({ overrides: { name: "Ada" } })
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: "Ada" })
  })

  it("rejects with the invalid field paths when validation fails", async () => {
    const onSubmit = vi.fn()
    const ref = mount({ onSubmit, body: <DyrectedField path="name" /> })
    await screen.findByText("Name")

    let error: unknown
    await act(async () => {
      await ref.current!.submitCurrentDraft().catch((e: unknown) => {
        error = e
      })
    })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(error).toBeInstanceOf(FormValidationError)
    expect(Object.keys((error as FormValidationError).fieldErrors)).toEqual(["name"])
  })

  it("puts server field errors on the matching field", async () => {
    const serverError = Object.assign(new Error("Invalid"), {
      errors: [{ field: "name", message: "Already taken" }],
    })
    const onSubmit = vi.fn().mockRejectedValue(serverError)
    const ref = mount({
      onSubmit,
      defaultValues: { name: "Ada" },
      body: <ErrorProbe />,
    })

    await act(async () => {
      await ref.current!.submitCurrentDraft().catch(() => undefined)
    })

    await waitFor(() => expect(screen.getByTestId("name-error").textContent).toBe("Already taken"))
  })

  it("restores overridden values when the submit fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"))
    const ref = mount({ onSubmit, defaultValues: { name: "Ada" }, body: <DyrectedField path="name" /> })
    const input = (await screen.findByRole("textbox")) as HTMLInputElement

    await act(async () => {
      await ref.current!.submitCurrentDraft({ overrides: { name: "Override" } }).catch(() => undefined)
    })

    expect(input.value).toBe("Ada")
  })
})
