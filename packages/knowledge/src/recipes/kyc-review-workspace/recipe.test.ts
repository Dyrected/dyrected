import { describe, expect, it } from "vitest";
import { Investors, approveAction, kycReviewWorkspace, rejectAction } from "./recipe.js";

describe("kyc-review-workspace recipe", () => {
  it("defines a standalone workspace with a group and role access", () => {
    expect(kycReviewWorkspace.slug).toBe("kyc-review");
    expect(kycReviewWorkspace.group).toMatchObject({ name: "Compliance" });
    expect(kycReviewWorkspace.access).toEqual(["admin", "compliance"]);
  });

  it("shows a live badge counting pending investors", () => {
    expect(kycReviewWorkspace.badge).toEqual({
      aggregate: { collection: "investors", where: { kycStatus: { equals: "pending" } } },
      variant: "warning",
    });
  });

  it("orders pending first so it is the default view", () => {
    expect(kycReviewWorkspace.views?.map((view) => view.slug)).toEqual([
      "pending",
      "approved",
      "rejected",
    ]);
    for (const view of kycReviewWorkspace.views ?? []) {
      expect(view.collection).toBe("investors");
    }
  });

  it("attaches approve and reject mutations to the pending queue", () => {
    const pending = kycReviewWorkspace.views?.[0];
    expect(pending?.actions).toHaveLength(2);
    expect(approveAction.mutation).toMatchObject({ kycStatus: "approved" });
    expect(rejectAction.mutation).toMatchObject({ kycStatus: "rejected" });
  });

  it("uses a status field that matches the view filters", () => {
    const status = Investors.fields.find((field) => field.name === "kycStatus");
    expect(status).toBeDefined();
  });
});
