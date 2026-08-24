import { describe, expect, it } from "vitest";
import { Appointments, tastingScheduleView } from "./recipe.js";

describe("calendar-schedule-view recipe", () => {
  it("configures a calendar layout with dateField", () => {
    expect(tastingScheduleView.slug).toBe("tasting-schedule");
    expect(tastingScheduleView.layout).toBe("calendar");
    expect(tastingScheduleView.dateField).toBe("appointmentDate");
    expect(tastingScheduleView.columns).toContain("partySize");
  });

  it("attaches the calendar view to the collection", () => {
    expect(Appointments.views).toHaveLength(1);
    expect(Appointments.views?.[0].slug).toBe("tasting-schedule");
  });
});
