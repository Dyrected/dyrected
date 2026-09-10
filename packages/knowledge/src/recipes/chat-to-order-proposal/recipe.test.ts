import { describe, expect, it } from "vitest";
import { Orders, PricingRules, config } from "./recipe.js";

describe("chat-to-order-proposal recipe", () => {
  it("defines orders and pricing-rules collections", () => {
    expect(Orders.slug).toBe("orders");
    expect(PricingRules.slug).toBe("pricing-rules");
    expect(config.collections).toHaveLength(2);
  });

  it("configures the AI system prompt", () => {
    expect(config.ai?.systemPrompt).toContain("Parse chat transcripts");
  });
});
