import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const recipePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "recipe.ts",
);
const recipeSource = fs.readFileSync(recipePath, "utf8");

describe("custom page media picker recipe", () => {
  it("uses the public media hooks together on one page", () => {
    expect(recipeSource).toContain("useMediaUpload");
    expect(recipeSource).toContain("useMediaURL");
    expect(recipeSource).toContain("useMediaLibrary");
    expect(recipeSource).toContain("DyrectedProvider");
  });
});
