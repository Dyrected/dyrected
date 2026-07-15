import { describe, expect, it } from "vitest";
import { Documents } from "./recipe.js";

describe("document download library recipe", () => {
  it("limits uploads to common document formats", () => {
    expect(Documents.upload).toMatchObject({ maxFileSize: 20 * 1024 * 1024 });
    expect(
      typeof Documents.upload === "object" ? Documents.upload.allowedMimeTypes : [],
    ).toContain("application/pdf");
  });

  it("uses the title as the admin display field", () => {
    expect(Documents.admin?.useAsTitle).toBe("title");
  });
});
