import { describe, expect, it } from "vitest";
import { Customers } from "./recipe.js";

describe("safe field rename recipe", () => {
  it("retains the previous storage key as a read fallback", () => {
    expect(Customers.fields[0]).toMatchObject({ name: "fullName", renameTo: "name", defaultValue: "" });
  });
});
