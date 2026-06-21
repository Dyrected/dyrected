import { describe, expect, it } from "vitest";
import { Articles } from "./recipe.js";

const args = (roles?: string[]) => ({ user: roles ? { id: "user-1", roles } : undefined }) as never;

describe("role based access recipe", () => {
  it("separates editor and administrator capabilities", async () => {
    expect(await Articles.access?.read?.(args())).toBe(true);
    expect(await Articles.access?.update?.(args(["editor"]))).toBe(true);
    expect(await Articles.access?.delete?.(args(["editor"]))).toBe(false);
    expect(await Articles.access?.delete?.(args(["admin"]))).toBe(true);
  });
});
