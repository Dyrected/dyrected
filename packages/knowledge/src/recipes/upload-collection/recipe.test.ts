import { describe, expect, it } from "vitest";
import { Media } from "./recipe.js";

describe("upload collection recipe", () => {
  it("limits uploads to web image formats", () => {
    expect(Media.upload).toMatchObject({ maxFileSize: 10 * 1024 * 1024 });
    expect(
      typeof Media.upload === "object" ? Media.upload.allowedMimeTypes : [],
    ).toContain("image/webp");
  });
});
