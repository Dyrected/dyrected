import { describe, expect, it } from "vitest";
import { replaceGeneratedRegion } from "../scripts/hybrid-regions.mjs";

describe("hybrid generated regions", () => {
  it("changes only content inside the named marker pair", () => {
    const source = [
      "# Authored title",
      "",
      "Authored introduction.",
      "",
      "<!-- GENERATED:REFERENCE:START -->",
      "stale",
      "<!-- GENERATED:REFERENCE:END -->",
      "",
      "## Authored troubleshooting",
      "",
      "Keep this guidance.",
    ].join("\n");
    const next = replaceGeneratedRegion(source, "REFERENCE", "current");
    expect(next).toContain("Authored introduction.");
    expect(next).toContain("## Authored troubleshooting");
    expect(next).toContain("Keep this guidance.");
    expect(next).not.toContain("stale");
    expect(next).toContain("\ncurrent\n");
  });

  it("rejects missing, duplicate, and reversed markers", () => {
    expect(() => replaceGeneratedRegion("authored", "X", "next")).toThrow();
    expect(() =>
      replaceGeneratedRegion(
        "<!-- GENERATED:X:START --><!-- GENERATED:X:START --><!-- GENERATED:X:END -->",
        "X",
        "next",
      ),
    ).toThrow();
    expect(() =>
      replaceGeneratedRegion(
        "<!-- GENERATED:X:END --><!-- GENERATED:X:START -->",
        "X",
        "next",
      ),
    ).toThrow();
  });
});
