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
      fields: [
        { name: "title", type: "text", label: "Title" },
        {
          name: "seo",
          type: "group",
          label: "SEO",
          fields: [{ name: "slug", type: "text", label: "Slug" }],
        },
        {
          name: "items",
          type: "array",
          label: "Items",
          fields: [{ name: "title", type: "text", label: "Item Title" }],
        },
      ] as any,
      initialValues: {
        title: "Initial",
        seo: { slug: "hello-world" },
        items: [{ title: "First item" }],
      },
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

  it("provides child and array item helpers for nested custom fields", () => {
    const controller = createDyrectedFormController({
      collection: "posts",
      fields: [
        {
          name: "seo",
          type: "group",
          label: "SEO",
          fields: [{ name: "slug", type: "text", label: "Slug" }],
        },
        {
          name: "items",
          type: "array",
          label: "Items",
          fields: [{ name: "title", type: "text", label: "Item Title" }],
        },
      ] as any,
      initialValues: {
        seo: { slug: "before" },
        items: [{ title: "Row one" }],
      },
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <DyrectedFormProvider controller={controller}>
        <DyrectedFieldPathProvider path="seo">{children}</DyrectedFieldPathProvider>
      </DyrectedFormProvider>
    )

    const { result } = renderHook(() => useField(), { wrapper })

    expect(result.current.pathSegments).toEqual(["seo"])
    expect(result.current.parentPath).toBe("")
    expect(result.current.getChildPath("slug")).toBe("seo.slug")
    expect(result.current.getChildValue("slug")).toBe("before")
    expect(result.current.getChildSchema("slug")?.label).toBe("Slug")

    act(() => {
      result.current.setChildValue("slug", "after", { shouldDirty: true })
    })

    expect(controller.getValue("seo.slug")).toBe("after")

    const itemsWrapper = ({ children }: { children: ReactNode }) => (
      <DyrectedFormProvider controller={controller}>
        <DyrectedFieldPathProvider path="items">{children}</DyrectedFieldPathProvider>
      </DyrectedFormProvider>
    )

    const itemsField = renderHook(() => useField(), { wrapper: itemsWrapper })

    act(() => {
      controller.setValue("items.0.title", "Changed row", { shouldDirty: true })
    })

    expect(itemsField.result.current.getItemPath(0, "title")).toBe("items.0.title")
    expect(itemsField.result.current.getChildValue(0, "title")).toBe("Changed row")
  })
})
