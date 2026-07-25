import { describe, expect, it } from "vitest";
import { Docs } from "./recipe.js";

describe("preview url live preview recipe", () => {
  it("configures a preview url and postMessage mode", () => {
    expect(Docs.admin).toMatchObject({
      useAsTitle: "title",
      previewUrl: "slug ? '/docs/' + slug : null",
      previewMode: "postMessage",
    });
  });

  it("keeps the public route pattern aligned", () => {
    expect(Docs.admin?.urlPattern).toBe("/docs/{slug}");
  });
});
