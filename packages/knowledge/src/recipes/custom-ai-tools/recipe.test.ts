import { describe, expect, it } from "vitest";
import { config } from "./recipe.js";

describe("custom-ai-tools recipe", () => {
  it("registers custom AI tools", () => {
    expect(config.ai?.tools?.checkConsultationSlots).toBeDefined();
  });

  it("executes the availability tool handler", async () => {
    const tool = config.ai?.tools?.checkConsultationSlots;
    const mockDb = {
      find: async () => ({ docs: [{ timeSlot: "09:00 AM" }] }),
    };

    const result = await tool?.execute(
      { date: "2026-09-01" },
      { db: mockDb as never, config, projectId: "test" } as never
    );

    expect(result).toMatchObject({
      date: "2026-09-01",
      totalSlots: 4,
      availableSlots: ["11:30 AM", "02:00 PM", "04:30 PM"],
      isFullyBooked: false,
    });
  });
});
