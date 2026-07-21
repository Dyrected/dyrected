// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { createDyrectedFormController } from "../../controllers/form"
import {
  DyrectedFieldPathProvider,
  DyrectedFormProvider,
} from "../../providers/dyrected-form-context"
import { useDyrectedForm } from "../use-dyrected-form"
import { useField } from "../use-field"

describe("useField", () => {
  it("binds to the nearest field-path context and updates when the controller changes", () => {
    const controller = createDyrectedFormController({
      collection: "posts",
      fields: [{ name: "title", type: "text", label: "Title" }] as any,
      initialValues: { title: "Initial" },
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <DyrectedFormProvider controller={controller}>
        <DyrectedFieldPathProvider path="title">{children}</DyrectedFieldPathProvider>
      </DyrectedFormProvider>
    )

    const fieldHook = renderHook(() => useField(), { wrapper })
    const formHook = renderHook(() => useDyrectedForm(), { wrapper })

    expect(fieldHook.result.current.value).toBe("Initial")
    expect(formHook.result.current.getValue("title")).toBe("Initial")

    act(() => {
      controller.setValue("title", "Updated", { shouldDirty: true })
    })

    expect(fieldHook.result.current.value).toBe("Updated")
    expect(fieldHook.result.current.isDirty).toBe(true)
  })
})
