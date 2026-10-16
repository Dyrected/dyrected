import { describe, expect, it } from "vitest"
import { resolveFormComponent } from "../resolve-form-component"
import { collectSubmitErrors } from "../submit-errors"
import { FormValidationError } from "../../../../components/forms/form-validation-error"

describe("resolveFormComponent", () => {
  const slots = { createForm: "c", editForm: "e", form: "f", formShell: "header" as const }

  it("uses createForm when creating and editForm when editing", () => {
    expect(resolveFormComponent(slots, "create").key).toBe("c")
    expect(resolveFormComponent(slots, "edit").key).toBe("e")
  })

  it("falls back to form, then to the built-in form", () => {
    expect(resolveFormComponent({ form: "f" }, "create").key).toBe("f")
    expect(resolveFormComponent({ form: "f" }, "edit").key).toBe("f")
    expect(resolveFormComponent({ createForm: "c" }, "edit").key).toBeNull()
    expect(resolveFormComponent(undefined, "create").key).toBeNull()
  })

  it("defaults the shell to full and ignores unknown values", () => {
    expect(resolveFormComponent({ form: "f" }, "edit").shell).toBe("full")
    expect(resolveFormComponent({ form: "f", formShell: "wide" as never }, "edit").shell).toBe("full")
    expect(resolveFormComponent(slots, "edit").shell).toBe("header")
  })

  it("keeps the built-in form in a drawer when formInDrawer is false", () => {
    expect(resolveFormComponent({ ...slots, formInDrawer: false }, "create", "drawer").key).toBeNull()
    expect(resolveFormComponent({ ...slots, formInDrawer: false }, "create", "page").key).toBe("c")
    expect(resolveFormComponent(slots, "create", "drawer").key).toBe("c")
  })
})

describe("collectSubmitErrors", () => {
  it("reads client validation failures", () => {
    expect(collectSubmitErrors(new FormValidationError({ name: "Required" }))).toEqual({ name: "Required" })
  })

  it("reads per-field API errors and keeps the first message per field", () => {
    const error = Object.assign(new Error("Invalid"), {
      errors: [
        { field: "rsvp", message: "Already checked in" },
        { field: "rsvp", message: "ignored" },
        { message: "Something else" },
      ],
    })
    expect(collectSubmitErrors(error)).toEqual({ rsvp: "Already checked in", _form: "Something else" })
  })

  it("falls back to the error message", () => {
    expect(collectSubmitErrors(new Error("Network down"))).toEqual({ _form: "Network down" })
    expect(collectSubmitErrors("nope")).toEqual({})
  })
})
