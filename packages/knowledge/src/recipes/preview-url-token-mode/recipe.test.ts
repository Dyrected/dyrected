import { describe, expect, it } from "vitest";
import { Docs } from "./recipe.js";

describe("preview url token mode recipe", () => {
  it("configures a preview url and token mode", () => {
    expect(Docs.admin).toMatchObject({
      useAsTitle: "title",
      previewUrl: "slug ? '/docs/' + slug : null",
      previewMode: "token",
    });
  });

  it("keeps the public route pattern aligned", () => {
    expect(Docs.admin?.urlPattern).toBe("/docs/{slug}");
  });
});
