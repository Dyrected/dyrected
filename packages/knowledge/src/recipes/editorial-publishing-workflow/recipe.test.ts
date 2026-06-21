import { describe, expect, it } from "vitest";
import { Posts } from "./recipe.js";

describe("editorial publishing workflow recipe", () => {
  it("requires review before publishing", () => {
    expect(Posts.workflow?.initialState).toBe("draft");
    expect(Posts.workflow?.transitions.find((transition) => transition.name === "publish")).toMatchObject({ from: "in_review", to: "published" });
  });
});
