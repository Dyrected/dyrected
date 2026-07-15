import { describe, expect, it } from "vitest";
import { Projects } from "./recipe.js";

describe("tenant scoped access recipe", () => {
  it("filters reads to the current workspace", async () => {
    expect(
      await Projects.access?.read?.({
        user: { workspaceId: "workspace-1" },
      } as never),
    ).toEqual({ workspaceId: { equals: "workspace-1" } });
    expect(await Projects.access?.read?.({} as never)).toBe(false);
  });

  it("stamps the workspace on create", async () => {
    const hook = Projects.hooks?.beforeChange?.[0];
    const result = await hook?.({
      data: { name: "Client work" },
      operation: "create",
      user: { workspaceId: "workspace-1" },
    } as never);
    expect(result).toMatchObject({ workspaceId: "workspace-1" });
  });

  it("allows tenant admins to bypass the delete constraint", async () => {
    expect(
      await Projects.access?.delete?.({
        user: { workspaceId: "workspace-1", roles: ["admin"] },
      } as never),
    ).toBe(true);
  });
});
