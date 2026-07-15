import { describe, expect, it } from "vitest";
import { Pages } from "./recipe.js";

describe("seo tab fields recipe", () => {
  it("keeps seo fields under one admin tab", () => {
    const seoFields = Pages.fields.slice(2);
    expect(seoFields.every((field) => field.admin?.tab === "SEO")).toBe(true);
  });

  it("still uses the title field as the admin title", () => {
    expect(Pages.admin?.useAsTitle).toBe("title");
  });
});
