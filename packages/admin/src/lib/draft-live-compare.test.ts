import { describe, expect, it } from "vitest"
import { buildDraftLiveComparison } from "./draft-live-compare"

const fields = [
  { name: "headline", label: "Headline", type: "text" },
  { name: "heroImage", label: "Hero image", type: "image" },
  {
    name: "layout",
    label: "Sections",
    type: "blocks",
    blocks: [
      { slug: "hero", labels: { singular: "Hero" } },
      { slug: "faq", labels: { singular: "FAQ" } },
    ],
  },
  { name: "slug", label: "Slug", type: "text" },
] as any

describe("buildDraftLiveComparison", () => {
  it("groups scalar, media, layout, and settings changes", () => {
    const comparison = buildDraftLiveComparison({
      fields,
      live: {
        headline: "Welcome to SnackTrack",
        heroImage: { filename: "hero-old.png", url: "https://cdn.example.com/hero-old.png" },
        layout: [{ blockType: "hero", heading: "Old hero" }],
        slug: "snacktrack",
      },
      draft: {
        headline: "Welcome to SnackTrack Pro",
        heroImage: { filename: "hero-new.png", url: "https://cdn.example.com/hero-new.png" },
        layout: [
          { blockType: "hero", heading: "New hero" },
          { blockType: "faq", title: "Common questions" },
        ],
        slug: "snacktrack-pro",
      },
    })

    expect(comparison.fieldChangeCount).toBe(5)
    expect(comparison.sectionsAdded).toBe(1)
    expect(comparison.sectionsRemoved).toBe(0)
    expect(comparison.groups.map((group) => group.title)).toEqual([
      "Text changes",
      "Media changes",
      "Layout / sections changed",
      "Settings changed",
    ])
  })

  it("reports no changes when draft matches live", () => {
    const comparison = buildDraftLiveComparison({
      fields,
      live: { headline: "Same" },
      draft: { headline: "Same" },
    })

    expect(comparison.hasChanges).toBe(false)
    expect(comparison.fieldChangeCount).toBe(0)
  })

  it("handles null nested objects without crashing", () => {
    const comparison = buildDraftLiveComparison({
      fields: [
        {
          name: "seo",
          label: "SEO",
          type: "object",
          fields: [
            { name: "metaTitle", label: "Meta title", type: "text" },
          ],
        },
      ] as any,
      live: { seo: null },
      draft: { seo: { metaTitle: "Draft title" } },
    })

    expect(comparison.hasChanges).toBe(true)
    expect(comparison.fieldChangeCount).toBe(1)
    expect(comparison.groups[0]?.cards[0]?.label).toBe("Meta title")
  })
})
