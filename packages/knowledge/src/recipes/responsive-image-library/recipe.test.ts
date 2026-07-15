import { describe, expect, it } from "vitest";
import { Media } from "./recipe.js";

describe("responsive image library recipe", () => {
  it("defines generated image sizes", () => {
    expect(Media.upload).toMatchObject({ adminThumbnail: "card" });
    expect(
      typeof Media.upload === "object" ? Media.upload.imageSizes?.map((size) => size.name) : [],
    ).toEqual(["card", "hero"]);
  });

  it("keeps accessibility metadata on the media record", () => {
    expect(Media.fields.map((field) => field.name)).toEqual(["alt", "caption"]);
  });
});
