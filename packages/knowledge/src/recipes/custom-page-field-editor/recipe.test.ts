import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const recipePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "recipe.ts",
);
const recipeSource = fs.readFileSync(recipePath, "utf8");

describe("custom page field editor recipe", () => {
  it("uses the public form and field APIs", () => {
    expect(recipeSource).toContain("createDyrectedFormController");
    expect(recipeSource).toContain("DyrectedFormProvider");
    expect(recipeSource).toContain("DyrectedFieldPathProvider");
    expect(recipeSource).toContain("useDyrectedForm");
    expect(recipeSource).toContain("useField");
  });
});
