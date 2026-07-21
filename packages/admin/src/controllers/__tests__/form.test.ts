import { describe, expect, it, vi } from "vitest"
import { createDyrectedFormController } from "../form"

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
