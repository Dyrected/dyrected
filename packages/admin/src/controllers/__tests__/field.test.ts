import { describe, expect, it } from "vitest"
import { createDyrectedFieldController } from "../field"
import { createDyrectedFormController } from "../form"

describe("createDyrectedFieldController", () => {
  it("reads and updates field state through the parent form controller", () => {
    const formController = createDyrectedFormController({
      collection: "posts",
      fields: [{ name: "title", type: "text", label: "Title" }] as any,
      initialValues: { title: "Before" },
    })

    const fieldController = createDyrectedFieldController(formController, "title")

    expect(fieldController.getState().value).toBe("Before")

    fieldController.setValue("After", { shouldDirty: true })

    expect(fieldController.getState().value).toBe("After")
    expect(formController.getFieldState("title").isDirty).toBe(true)
  })
})
