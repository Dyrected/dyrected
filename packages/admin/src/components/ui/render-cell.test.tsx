// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { RenderCell } from "./render-cell"

describe("RenderCell icon fields", () => {
  it("renders a Lucide icon for valid icon field values", () => {
    const { container } = render(
      <RenderCell
        value="Star"
        field={{ type: "icon", name: "icon" }}
        client={null}
        schemas={null}
      />
    )

    expect(screen.getByText("Star")).toBeTruthy()
    expect(container.querySelector("svg")).not.toBeNull()
  })

  it("renders a placeholder for invalid icon field values", () => {
    render(
      <RenderCell
        value="NotARealIcon"
        field={{ type: "icon", name: "icon" }}
        client={null}
        schemas={null}
      />
    )

    expect(screen.getByText("-")).toBeTruthy()
  })

  it("renders array rows using the nested admin.useAsTitle field", () => {
    render(
      <RenderCell
        value={[
          { label: "Docs", url: "/docs" },
          { label: "Blog", url: "/blog" },
          { label: "Pricing", url: "/pricing" },
        ]}
        field={{
          type: "array",
          name: "links",
          admin: { useAsTitle: "label" },
          fields: [
            { type: "text", name: "label" },
            { type: "text", name: "url" },
          ],
        }}
        client={null}
        schemas={null}
      />
    )

    expect(screen.getByText("Docs, Blog, Pricing")).toBeTruthy()
  })

  it("renders object fields using the nested title fallback", () => {
    render(
      <RenderCell
        value={{ title: "Meta Title", description: "Meta Description" }}
        field={{
          type: "object",
          name: "seo",
          fields: [
            { type: "text", name: "title" },
            { type: "textarea", name: "description" },
          ],
        }}
        client={null}
        schemas={null}
      />
    )

    expect(screen.getByText("Meta Title")).toBeTruthy()
  })
})
