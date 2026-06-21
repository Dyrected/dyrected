import { describe, expect, it } from "vitest";
import { Projects } from "./recipe.js";

describe("owner scoped access recipe", () => {
  it("returns a document constraint for an authenticated user", async () => {
    expect(await Projects.access?.read?.({ user: { sub: "user-1" } } as never)).toEqual({ owner: { equals: "user-1" } });
    expect(await Projects.access?.read?.({} as never)).toBe(false);
  });

  it("assigns ownership from the authenticated user on create", async () => {
    const hook = Projects.hooks?.beforeChange?.[0];
    const result = await hook?.({
      data: { name: "Private", owner: "attacker-selected" },
      operation: "create",
      user: { sub: "user-1" },
    } as never);
    expect(result).toMatchObject({ owner: "user-1" });
  });

  it("protects create, update, and delete", async () => {
    expect(await Projects.access?.create?.({} as never)).toBe(false);
    expect(await Projects.access?.create?.({ user: { sub: "user-1" } } as never)).toBe(true);
    expect(await Projects.access?.update?.({ user: { sub: "user-1" } } as never)).toEqual({ owner: { equals: "user-1" } });
    expect(await Projects.access?.delete?.({ user: { sub: "user-1" } } as never)).toEqual({ owner: { equals: "user-1" } });
  });
});
