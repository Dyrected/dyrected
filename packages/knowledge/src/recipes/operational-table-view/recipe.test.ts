import { describe, expect, it } from "vitest";
import { GuestResponses, attendingGuestsView, checkInAction } from "./recipe.js";

describe("operational-table-view recipe", () => {
  it("defines a table operational view with filters and columns", () => {
    expect(attendingGuestsView.slug).toBe("attending-guests");
    expect(attendingGuestsView.layout).toBe("table");
    expect(attendingGuestsView.filter).toEqual({ attending: { equals: true } });
    expect(attendingGuestsView.columns).toContain("checkedIn");
    expect(attendingGuestsView.actions).toHaveLength(1);
    expect(attendingGuestsView.actions?.[0].name).toBe("checkIn");
  });

  it("attaches the view to the collection", () => {
    expect(GuestResponses.views).toHaveLength(1);
    expect(GuestResponses.views?.[0].slug).toBe("attending-guests");
  });

  it("configures a declarative checkIn mutation", () => {
    expect(checkInAction.type).toBe("row");
    expect(checkInAction.mutation).toEqual({
      checkedIn: true,
      checkedInAt: "now()",
    });
  });
});
