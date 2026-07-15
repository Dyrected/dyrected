import { describe, expect, it } from "vitest";
import { SiteSettings } from "./recipe.js";

describe("site settings global recipe", () => {
  it("defines a singleton global with seed data", () => {
    expect(SiteSettings.slug).toBe("site-settings");
    expect(SiteSettings.initialData).toMatchObject({
      siteName: "Acme Studio",
      supportEmail: "hello@example.com",
    });
  });

  it("includes shared site fields", () => {
    expect(SiteSettings.fields.map((field) => field.name)).toEqual([
      "siteName",
      "tagline",
      "supportEmail",
      "primaryCta",
    ]);
  });
});
