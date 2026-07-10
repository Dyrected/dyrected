import { describe, expect, it } from "vitest"
import { formatDate, formatNumber, getRatingSpec, resolveNumberFormat } from "./format"

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
