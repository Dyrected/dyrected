import { describe, expect, it } from "vitest";
import { Posts, toSlug } from "./recipe.js";

describe("auto-slug recipe", () => {
  it("normalizes a title into a URL-safe slug", () => {
    expect(toSlug("  Hello, Dyrected World!  ")).toBe("hello-dyrected-world");
  });

  it("generates the slug for server-side writes", async () => {
    const hook = Posts.hooks?.beforeChange?.[0];
    const result = await hook?.({
      data: { title: "A Better URL" },
      operation: "create",
    } as never);
    expect(result).toMatchObject({
      title: "A Better URL",
      slug: "a-better-url",
    });
  });
});
