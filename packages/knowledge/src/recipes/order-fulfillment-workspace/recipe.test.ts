import { describe, expect, it } from "vitest";
import { markPaidAction, markShippedAction, orderFulfillmentWorkspace } from "./recipe.js";

describe("order-fulfillment-workspace recipe", () => {
  it("pairs a kanban pipeline with a payment queue", () => {
    const [pipeline, queue] = orderFulfillmentWorkspace.views ?? [];
    expect(pipeline).toMatchObject({ slug: "pipeline", layout: "kanban", groupBy: "status" });
    expect(queue).toMatchObject({ slug: "awaiting-payment", layout: "table" });
    expect(queue.filter).toEqual({ status: { equals: "requested" } });
  });

  it("counts requested orders in the sidebar badge", () => {
    expect(orderFulfillmentWorkspace.badge).toEqual({
      aggregate: { collection: "orders", where: { status: { equals: "requested" } } },
      variant: "warning",
    });
  });

  it("shows metric cards on the pipeline view", () => {
    const pipeline = orderFulfillmentWorkspace.views?.[0];
    expect(pipeline?.metrics?.map((metric) => metric.label)).toEqual([
      "Open Orders",
      "Revenue Collected",
    ]);
  });

  it("moves orders through statuses with declarative mutations", () => {
    expect(markPaidAction.mutation).toMatchObject({ status: "paid" });
    expect(markShippedAction.mutation).toMatchObject({ status: "shipped" });
  });
});
