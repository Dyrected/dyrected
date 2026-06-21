import { describe, expect, it } from "vitest";
import { Posts, Users } from "./recipe.js";

describe("relationship and reverse join recipe", () => {
  it("keeps both sides aligned", () => {
    expect(Posts.fields.find((field) => field.name === "author")).toMatchObject({ relationTo: "users" });
    expect(Users.fields.find((field) => field.name === "posts")).toMatchObject({ collection: "posts", on: "author" });
  });
});
