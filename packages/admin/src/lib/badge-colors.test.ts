import { describe, expect, it } from "vitest"
import { resolveBadgePresentation } from "./badge-colors"

describe("resolveBadgePresentation", () => {
  it("returns default secondary variant when no badgeColors or format is provided", () => {
    const result = resolveBadgePresentation({ value: "In Stock" })
    expect(result.variant).toBe("secondary")
    expect(result.className).toBe("dy-font-medium dy-text-xs")
    expect(result.style).toBeUndefined()
  })

  it("resolves named palette colors from badgeColors map", () => {
    const badgeColors = {
      active: "emerald",
      draft: "zinc",
      archived: "rose",
      pending: "amber",
      processing: "blue",
    }

    const activeRes = resolveBadgePresentation({ value: "active", badgeColors })
    expect(activeRes.variant).toBe("outline")
    expect(activeRes.className).toContain("dy-text-emerald-600")

    const draftRes = resolveBadgePresentation({ value: "draft", badgeColors })
    expect(draftRes.className).toContain("dy-text-muted-foreground")

    const archivedRes = resolveBadgePresentation({ value: "archived", badgeColors })
    expect(archivedRes.className).toContain("dy-text-rose-600")
  })

  it("performs case-insensitive key lookup", () => {
    const badgeColors = {
      "in stock": "emerald",
      "out of stock": "rose",
    }

    const res = resolveBadgePresentation({ value: "In Stock", badgeColors })
    expect(res.className).toContain("dy-text-emerald-600")
  })

  it("falls back to wildcard '*' or 'default' color in badgeColors", () => {
    const badgeColors = {
      active: "emerald",
      "*": "zinc",
    }

    const res = resolveBadgePresentation({ value: "unknown_status", badgeColors })
    expect(res.className).toContain("dy-text-muted-foreground")
  })

  it("handles raw tailwind classes in badgeColors", () => {
    const badgeColors = {
      special: "dy-bg-purple-100 dy-text-purple-700 dy-border-purple-200",
    }

    const res = resolveBadgePresentation({ value: "special", badgeColors })
    expect(res.variant).toBe("outline")
    expect(res.className).toContain("dy-bg-purple-100")
  })

  it("handles hex CSS color strings in badgeColors using inline styles", () => {
    const badgeColors = {
      custom: "#8b5cf6",
    }

    const res = resolveBadgePresentation({ value: "custom", badgeColors })
    expect(res.variant).toBe("outline")
    expect(res.style).toBeDefined()
    expect(res.style?.color).toBe("#8b5cf6")
  })

  it("falls back to fieldDef format badge tones if badgeColors is omitted", () => {
    const fieldDef = {
      name: "status",
      options: ["published", "draft"],
      admin: {
        format: {
          type: "badge",
          tones: { published: "success", draft: "neutral" },
        },
      },
    }

    const res = resolveBadgePresentation({ value: "published", fieldDef })
    expect(res.variant).toBe("outline")
    expect(res.className).toContain("dy-text-emerald-600")
  })
})
