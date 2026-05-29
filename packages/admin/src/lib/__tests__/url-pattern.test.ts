import { describe, it, expect } from "vitest"
import { interpolateUrlPattern } from "../url-pattern"

describe("interpolateUrlPattern", () => {
  it("replaces a single placeholder with the matching field", () => {
    expect(interpolateUrlPattern("/{slug}", { slug: "about" })).toBe("/about")
  })

  it("replaces multiple placeholders", () => {
    expect(interpolateUrlPattern("/{category}/{slug}", { category: "blog", slug: "my-post" })).toBe("/blog/my-post")
  })

  it("replaces a placeholder mid-string", () => {
    expect(interpolateUrlPattern("/blog/{slug}/view", { slug: "hello" })).toBe("/blog/hello/view")
  })

  it("coerces numeric field values to string", () => {
    expect(interpolateUrlPattern("/items/{id}", { id: 42 })).toBe("/items/42")
  })

  it("replaces a missing field with an empty string", () => {
    expect(interpolateUrlPattern("/{slug}", {})).toBe("/")
  })

  it("returns the pattern unchanged when there are no placeholders", () => {
    expect(interpolateUrlPattern("/about", { slug: "about" })).toBe("/about")
  })

  it("ignores extra fields not referenced in the pattern", () => {
    expect(interpolateUrlPattern("/{slug}", { slug: "contact", title: "Contact Us" })).toBe("/contact")
  })

  it("handles a null field value as empty string", () => {
    expect(interpolateUrlPattern("/{slug}", { slug: null })).toBe("/")
  })
})
