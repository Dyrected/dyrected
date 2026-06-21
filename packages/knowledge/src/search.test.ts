import { describe, expect, it } from "vitest";
import { findRecipesByIntent, getRecipe, recipes } from "./index.js";

describe("Dyrected knowledge catalogue", () => {
  it("contains unique, portable recipe records", () => {
    expect(recipes.length).toBeGreaterThan(0);
    expect(new Set(recipes.map((recipe) => recipe.id)).size).toBe(
      recipes.length,
    );
    expect(
      recipes.every((recipe) => recipe.source.includes("defineCollection")),
    ).toBe(true);
  });

  it("finds a technical recipe from plain-language intent", () => {
    expect(
      findRecipesByIntent("I want the URL to follow the title")[0]?.recipe.id,
    ).toBe("auto-slug");
    expect(
      findRecipesByIntent("the state dropdown should depend on country")[0]
        ?.recipe.id,
    ).toBe("dependent-dropdown");
  });

  it("finds a recipe by stable id", () => {
    expect(getRecipe("cross-field-validation")?.title).toContain("Validate");
  });
});
