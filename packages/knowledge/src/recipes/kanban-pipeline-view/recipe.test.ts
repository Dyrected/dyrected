import { describe, expect, it } from "vitest";
import { Orders, fulfillmentPipelineView, markPaidAction, markCollectedAction } from "./recipe.js";

describe("kanban-pipeline-view recipe", () => {
  it("configures a kanban layout with groupBy", () => {
    expect(fulfillmentPipelineView.slug).toBe("fulfillment-pipeline");
    expect(fulfillmentPipelineView.layout).toBe("kanban");
    expect(fulfillmentPipelineView.groupBy).toBe("status");
    expect(fulfillmentPipelineView.columns).toEqual(["customerName", "itemSize", "quantity"]);
  });

  it("attaches fulfillment actions to the kanban board", () => {
    expect(fulfillmentPipelineView.actions).toHaveLength(2);
    expect(fulfillmentPipelineView.actions?.map((a) => a.name)).toEqual(["markPaid", "markCollected"]);
  });

  it("attaches the kanban view to the collection", () => {
    expect(Orders.views).toHaveLength(1);
    expect(Orders.views?.[0].slug).toBe("fulfillment-pipeline");
  });
});
