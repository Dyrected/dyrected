import { describe, expect, it } from "vitest";
import { Categories, Posts } from "./recipe.js";

describe("category taxonomy recipe", () => {
  it("creates a dedicated categories collection", () => {
    expect(Categories.slug).toBe("categories");
    expect(Categories.admin).toMatchObject({
      useAsTitle: "title",
      urlPattern: "/categories/{slug}",
    });
  });

  it("relates posts to many categories", () => {
    const categories = Posts.fields[2];
    expect(categories).toMatchObject({
      name: "categories",
      type: "relationship",
      relationTo: "categories",
      hasMany: true,
    });
  });
});
