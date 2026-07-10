import { describe, expect, it } from "vitest"
import {
  displayToneClass,
  formatDate,
  formatJson,
  formatNumber,
  formatText,
  getBooleanBadge,
  getLinkSpec,
  getOptionBadge,
  getRatingSpec,
  isCodeText,
  resolveNumberFormat,
} from "./format"

describe("resolveNumberFormat", () => {
  it("normalizes the shorthand string form", () => {
    expect(resolveNumberFormat("currency")).toEqual({ type: "currency" })
  })
  it("passes the object form through", () => {
    expect(resolveNumberFormat({ type: "currency", currency: "NGN" })).toEqual({
      type: "currency",
      currency: "NGN",
    })
  })
  it("returns null when no format is set", () => {
    expect(resolveNumberFormat(undefined)).toBeNull()
  })
})

describe("formatNumber", () => {
  it("formats currency with a locale and code", () => {
    expect(formatNumber(1234.5, { type: "currency", currency: "USD", locale: "en-US" })).toBe("$1,234.50")
  })
  it("defaults currency to USD via the shorthand", () => {
    expect(formatNumber(1000, "currency")).toContain("1,000")
  })
  it("scales a ratio to a percentage by default", () => {
    expect(formatNumber(0.5, { type: "percent", locale: "en-US" })).toBe("50%")
  })
  it("treats the value as already-scaled when scale is false", () => {
    expect(formatNumber(50, { type: "percent", scale: false, locale: "en-US" })).toBe("50%")
  })
  it("abbreviates large numbers in compact notation", () => {
    expect(formatNumber(1200, { type: "compact", locale: "en-US" })).toBe("1.2K")
  })
  it("formats decimal byte sizes", () => {
    expect(formatNumber(1536, { type: "bytes" })).toBe("1.5 KB")
  })
  it("formats binary byte sizes", () => {
    expect(formatNumber(1024, { type: "bytes", binary: true })).toBe("1 KiB")
  })
  it("renders raw bytes without a fractional part", () => {
    expect(formatNumber(512, { type: "bytes" })).toBe("512 B")
  })
  it("formats units", () => {
    expect(formatNumber(5, { type: "unit", unit: "kilometer", locale: "en-US" })).toBe("5 km")
  })
  it("falls back to the raw number for non-numeric input", () => {
    expect(formatNumber("abc", "currency")).toBe("abc")
  })
  it("degrades to a plain number for an invalid currency code", () => {
    expect(formatNumber(10, { type: "currency", currency: "not-a-code" })).toBe("10")
  })
})

describe("getRatingSpec", () => {
  it("returns the value clamped to the max", () => {
    expect(getRatingSpec(7, { type: "rating", max: 5 })).toEqual({ value: 5, max: 5 })
  })
  it("defaults max to 5", () => {
    expect(getRatingSpec(3, "rating")).toEqual({ value: 3, max: 5 })
  })
  it("returns null for non-rating formats", () => {
    expect(getRatingSpec(3, "currency")).toBeNull()
  })
  it("returns null for non-numeric values", () => {
    expect(getRatingSpec("x", "rating")).toBeNull()
  })
})

describe("formatDate", () => {
  const iso = "2026-01-05T14:30:00.000Z"

  it("formats a calendar date with a style", () => {
    expect(formatDate(iso, { type: "date", dateStyle: "medium", locale: "en-US" }, "date")).toBe("Jan 5, 2026")
  })
  it("formats relative time in the past", () => {
    const now = new Date("2026-01-08T14:30:00.000Z").getTime()
    expect(formatDate(iso, "relative", "date", now)).toBe("3 days ago")
  })
  it("formats relative time in the future", () => {
    const now = new Date("2026-01-05T12:30:00.000Z").getTime()
    expect(formatDate(iso, "relative", "datetime", now)).toBe("in 2 hours")
  })
  it("parses a bare time value", () => {
    expect(formatDate("14:30", { type: "time", timeStyle: "short", locale: "en-US" }, "time")).toBe("2:30 PM")
  })
  it("returns an empty string for nullish values", () => {
    expect(formatDate(null, "date", "date")).toBe("")
  })
  it("returns the raw string for an unparseable value", () => {
    expect(formatDate("not-a-date", "date", "date")).toBe("not-a-date")
  })
})

describe("getOptionBadge", () => {
  it("maps a value to its tone and option label", () => {
    const spec = getOptionBadge(
      "published",
      { type: "badge", tones: { published: "success", draft: "neutral" } },
      [{ label: "Published", value: "published" }],
    )
    expect(spec).toEqual({ label: "Published", tone: "success" })
  })
  it("applies a label override and defaultTone", () => {
    const spec = getOptionBadge("x", { type: "badge", labels: { x: "Custom" }, defaultTone: "info" }, ["x"])
    expect(spec).toEqual({ label: "Custom", tone: "info" })
  })
  it("returns null without a badge format", () => {
    expect(getOptionBadge("x", undefined)).toBeNull()
  })
  it("supports the shorthand string", () => {
    expect(getOptionBadge("x", "badge", ["x"])).toEqual({ label: "x", tone: "neutral" })
  })
})

describe("getBooleanBadge", () => {
  it("uses the true side label and tone", () => {
    const spec = getBooleanBadge(true, { type: "boolean", true: { label: "Active", tone: "success" } })
    expect(spec).toEqual({ label: "Active", tone: "success" })
  })
  it("falls back to Yes/No with default tones", () => {
    expect(getBooleanBadge(false, { type: "boolean" })).toEqual({ label: "No", tone: "neutral" })
  })
  it("returns null without a format", () => {
    expect(getBooleanBadge(true, undefined)).toBeNull()
  })
})

describe("formatText", () => {
  it("uppercases", () => {
    expect(formatText("abc", "uppercase")).toBe("ABC")
  })
  it("capitalizes each word", () => {
    expect(formatText("hello world", "capitalize")).toBe("Hello World")
  })
  it("truncates with an ellipsis", () => {
    expect(formatText("abcdefgh", { type: "truncate", length: 4 })).toBe("abcd…")
  })
  it("masks all but the last few characters", () => {
    expect(formatText("sk_live_4242", { type: "mask", reveal: 4 })).toBe("••••••••4242")
  })
  it("leaves short values unmasked", () => {
    expect(formatText("abc", { type: "mask", reveal: 4 })).toBe("abc")
  })
  it("passes code text through unchanged", () => {
    expect(formatText("SKU-1", "code")).toBe("SKU-1")
    expect(isCodeText("code")).toBe(true)
  })
})

describe("getLinkSpec", () => {
  it("builds a mailto link for email", () => {
    expect(getLinkSpec("a@b.com", "link", "email")).toEqual({
      href: "mailto:a@b.com",
      label: "a@b.com",
      newTab: false,
    })
  })
  it("builds an external link for url that opens in a new tab", () => {
    expect(getLinkSpec("https://x.com", "link", "url")).toEqual({
      href: "https://x.com",
      label: "https://x.com",
      newTab: true,
    })
  })
  it("returns null for empty values", () => {
    expect(getLinkSpec("", "link", "url")).toBeNull()
  })
})

describe("formatJson", () => {
  it("summarizes object keys", () => {
    expect(formatJson({ a: 1, b: 2 }, "summary")).toBe("{ 2 keys }")
  })
  it("summarizes array length", () => {
    expect(formatJson([1, 2, 3], { type: "summary" })).toBe("[ 3 items ]")
  })
  it("truncates raw json in code mode", () => {
    expect(formatJson({ a: 1 }, "code")).toBe('{"a":1}')
  })
})

describe("displayToneClass", () => {
  it("returns tone classes and falls back to neutral", () => {
    expect(displayToneClass("success")).toContain("emerald")
    expect(displayToneClass(undefined)).toBe(displayToneClass("neutral"))
  })
})
