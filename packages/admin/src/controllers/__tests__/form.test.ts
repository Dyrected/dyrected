import { describe, expect, it, vi } from "vitest"
import {
  createDyrectedFormController,
  getFieldPathSegments,
  getParentFieldPath,
  joinFieldPath,
  normalizeFieldPath,
} from "../form"

const fields = [
  {
    name: "title",
    type: "text",
    label: "Title",
  },
  {
    name: "seo",
    type: "group",
    label: "SEO",
    fields: [
      {
        name: "slug",
        type: "text",
        label: "Slug",
      },
    ],
  },
] as any

describe("createDyrectedFormController", () => {
  it("normalizes and joins nested field paths", () => {
    expect(normalizeFieldPath(" seo.slug ")).toEqual(["seo", "slug"])
    expect(getFieldPathSegments("items.0.title")).toEqual(["items", "0", "title"])
    expect(getParentFieldPath("items.0.title")).toBe("items.0")
    expect(joinFieldPath("items", 0, "title")).toBe("items.0.title")
    expect(joinFieldPath("seo", "meta.title")).toBe("seo.meta.title")
  })

  it("tracks nested values and resolves field schema metadata", () => {
    const controller = createDyrectedFormController({
      collection: "posts",
      fields,
      initialValues: {
        title: "Launch post",
        seo: {
          slug: "launch-post",
        },
      },
    })

    expect(controller.getValue("seo.slug")).toBe("launch-post")
    expect(controller.getFieldSchema("seo.slug")?.label).toBe("Slug")

    controller.setValue("seo.slug", "updated-slug", { shouldDirty: true, shouldTouch: true })

    expect(controller.getValue("seo.slug")).toBe("updated-slug")
    expect(controller.getFieldState("seo.slug")).toMatchObject({
      value: "updated-slug",
      isDirty: true,
      isTouched: true,
    })
  })

  it("delegates validate and submit to adapters", async () => {
    const validate = vi.fn().mockResolvedValue(true)
    const submit = vi.fn().mockResolvedValue({ ok: true })

    const controller = createDyrectedFormController({
      collection: "posts",
      fields,
      adapters: {
        validate,
        submit,
      },
    })

    await expect(controller.validate("title")).resolves.toBe(true)
    await expect(controller.submit()).resolves.toEqual({ ok: true })

    expect(validate).toHaveBeenCalledWith("title")
    expect(submit).toHaveBeenCalled()
  })
})
