import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const recipePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "recipe.tsx");
const source = fs.readFileSync(recipePath, "utf8");

describe("walk-in check-in form recipe", () => {
  it("points the create screen at a registered form key", () => {
    expect(source).toContain('createForm: "guest-responses.walkIn"');
    expect(source).toContain('formShell: "header"');
    expect(source).toContain('forms: { "guest-responses.walkIn": WalkInForm }');
  });

  it("keeps the built-in form for editing", () => {
    expect(source).not.toContain("editForm");
  });

  it("saves through the public document form API", () => {
    expect(source).toContain("useDocumentForm");
    expect(source).toContain("DyrectedField");
    expect(source).toContain("overrides:");
  });

  it("declares every field the overrides write", () => {
    for (const name of ["attending", "checkedIn", "checkedInAt"]) {
      expect(source).toContain(`name: "${name}"`);
    }
  });
});
