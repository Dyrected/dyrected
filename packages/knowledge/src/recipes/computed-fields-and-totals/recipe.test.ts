import { describe, expect, it } from "vitest";
import { Orders, calculateOrderTotals } from "./recipe.js";

describe("computed-fields-and-totals recipe", () => {
  it("calculates order totals correctly with discount", () => {
    const result = calculateOrderTotals({
      quantity: 3,
      unitPrice: 15000,
      discount: 5000,
    });
    expect(result).toEqual({
      subtotal: 45000,
      total: 40000,
    });
  });

  it("guarantees totalAmount calculation on server-side beforeChange", async () => {
    const hook = Orders.hooks?.beforeChange?.[0];
    const result = await hook?.({
      data: { quantity: 2, unitPrice: 20000, discount: 2000 },
      operation: "create",
    } as never);
    expect(result).toMatchObject({
      quantity: 2,
      unitPrice: 20000,
      discount: 2000,
      totalAmount: 38000,
    });
  });
});
