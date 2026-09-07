import { describe, expect, it } from "vitest";
import { evaluateJexlSync } from "@dyrected/core";
import { Invoices } from "./recipe.js";

describe("declarative-reactive-hooks recipe", () => {
  it("compiles match expression for basePrice calculation", () => {
    const basePriceField = Invoices.fields.find((f: any) => f.name === "basePrice") as any;
    const expr = basePriceField.admin?.hooks?.onChange;
    expect(typeof expr).toBe("string");

    const trialPrice = evaluateJexlSync(expr, { siblingData: { planTier: "trial" } });
    const standardPrice = evaluateJexlSync(expr, { siblingData: { planTier: "standard" } });
    const enterprisePrice = evaluateJexlSync(expr, { siblingData: { planTier: "enterprise" } });

    expect(trialPrice).toBe(0);
    expect(standardPrice).toBe(25000);
    expect(enterprisePrice).toBe(100000);
  });

  it("compiles string concatenation for referenceCode", () => {
    const refField = Invoices.fields.find((f: any) => f.name === "referenceCode") as any;
    const expr = refField.admin?.hooks?.onChange;

    const ref = evaluateJexlSync(expr, {
      siblingData: { planTier: "standard", title: "Q3 Strategy Consulting" },
    });
    expect(ref).toBe("INV-STANDARD-q3-strategy-consulting");
  });
});
