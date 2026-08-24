import { describe, expect, it } from "vitest";
import { EventRsvps, rsvpMetricsView } from "./recipe.js";

describe("operational-metrics recipe", () => {
  it("configures a view with 3 metric cards", () => {
    expect(rsvpMetricsView.metrics).toHaveLength(3);
    const [attending, revenue, rate] = rsvpMetricsView.metrics ?? [];

    expect(attending.label).toBe("Total Attending");
    expect(attending.color).toBe("emerald");

    expect(revenue.label).toBe("Outfit Revenue");
    expect(revenue.format).toBe("currency");
    expect(revenue.currency).toBe("USD");
    expect(revenue.transform).toBe("value * 150");
    expect(revenue.subMetrics).toHaveLength(1);

    expect(rate.label).toBe("Attendance Rate");
    expect(rate.format).toBe("percent");
  });

  it("attaches the view with metrics to the collection", () => {
    expect(EventRsvps.views).toHaveLength(1);
  });
});
