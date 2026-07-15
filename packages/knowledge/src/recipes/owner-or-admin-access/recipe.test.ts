import { describe, expect, it } from "vitest";
import { Tickets } from "./recipe.js";

describe("owner or admin access recipe", () => {
  it("scopes normal users to their own records", async () => {
    expect(await Tickets.access?.update?.({ user: { sub: "user-1" } } as never)).toEqual({
      owner: { equals: "user-1" },
    });
  });

  it("lets admins manage every record", async () => {
    expect(
      await Tickets.access?.delete?.({
        user: { sub: "admin-1", roles: ["admin"] },
      } as never),
    ).toBe(true);
  });

  it("assigns ownership on create", async () => {
    const hook = Tickets.hooks?.beforeChange?.[0];
    const result = await hook?.({
      data: { subject: "Need help" },
      operation: "create",
      user: { sub: "user-1" },
    } as never);
    expect(result).toMatchObject({ owner: "user-1" });
  });
});
