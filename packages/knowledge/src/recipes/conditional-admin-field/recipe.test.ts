import { describe, expect, it } from "vitest";
import { Orders } from "./recipe.js";

describe("conditional admin field recipe", () => {
  it("uses a cloud-safe serializable condition", () => {
    const discount = Orders.fields.find((field) => field.name === "discountPercent");
    expect(discount?.admin?.condition).toBeTypeOf("string");
  });
});
