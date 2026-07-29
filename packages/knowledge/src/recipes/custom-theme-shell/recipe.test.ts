import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const recipePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "recipe.tsx",
);
const recipeSource = fs.readFileSync(recipePath, "utf8");

describe("custom theme shell recipe", () => {
  it("uses the public theme provider and hook", () => {
    expect(recipeSource).toContain("AdminThemeProvider");
    expect(recipeSource).toContain("AdminThemedRoot");
    expect(recipeSource).toContain("useAdminTheme");
  });
});
