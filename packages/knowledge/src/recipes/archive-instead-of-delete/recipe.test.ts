import { describe, expect, it } from "vitest";
import { Announcements } from "./recipe.js";

describe("archive instead of delete recipe", () => {
  it("hides archived rows from non-admin readers", async () => {
    expect(await Announcements.access?.read?.({ user: { roles: ["editor"] } } as never)).toEqual({
      archived: { equals: false },
    });
    expect(await Announcements.access?.read?.({ user: { roles: ["admin"] } } as never)).toBe(true);
  });

  it("disables destructive deletion", async () => {
    expect(await Announcements.access?.delete?.({} as never)).toBe(false);
  });
});
