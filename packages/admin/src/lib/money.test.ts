import { describe, expect, it } from "vitest"
import { formatMoney, majorToMinor, minorToMajorString } from "./money"

describe("money helpers", () => {
  it("converts minor units to an exact major string", () => {
    expect(minorToMajorString(5250000, 2)).toBe("52500.00")
    expect(minorToMajorString(5, 2)).toBe("0.05")
    expect(minorToMajorString(-1050, 2)).toBe("-10.50")
    expect(minorToMajorString(1234, 0)).toBe("1234")
    expect(minorToMajorString(null, 2)).toBe("")
  })

  it("parses typed major amounts without float drift", () => {
    expect(majorToMinor("52,500.75", 2)).toBe(5250075)
    expect(majorToMinor("0.1", 2)).toBe(10)
    expect(majorToMinor("52.5", 3)).toBe(52500)
    expect(majorToMinor("", 2)).toBeNull()
    expect(majorToMinor("-3.20", 2)).toBe(-320)
    expect(majorToMinor(".5", 2)).toBe(50)
  })

  it("rejects extra decimals, junk, and unsafe values", () => {
    expect(majorToMinor("1.234", 2)).toBeUndefined()
    expect(majorToMinor("abc", 2)).toBeUndefined()
    expect(majorToMinor("12.5", 0)).toBeUndefined()
    expect(majorToMinor("99999999999999999999", 2)).toBeUndefined()
  })

  it("formats for display and honours displayMinorAsMajor", () => {
    expect(formatMoney(5250000, { currency: "NGN" })).toMatch(/52,500\.00/)
    expect(formatMoney(5250000, { currency: "NGN", admin: { displayMinorAsMajor: false } })).toBe("5250000")
    expect(formatMoney(1000, { currencyField: "cur" }, { cur: "USD" })).toMatch(/10\.00/)
    expect(formatMoney(1000, { currency: "NOPE!" })).toBe("10.00")
  })
})
