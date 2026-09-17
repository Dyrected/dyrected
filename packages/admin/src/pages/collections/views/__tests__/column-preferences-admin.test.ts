import { describe, expect, it } from "vitest";
import { isUserAdmin } from "@dyrected/core";

/**
 * Regression coverage for the "Save for everyone" visibility bug:
 * `@dyrected/admin` previously gated on `user?.role === "admin"`, hiding the
 * control for `super_admin` users and `roles: [...]` multi-role schemas.
 * The admin now delegates to `isUserAdmin` from `@dyrected/core`, so this
 * matrix pins the supported shapes in the admin package as well.
 */
describe("column preferences admin gate (isUserAdmin role matrix)", () => {
  it("treats singular role strings as admin", () => {
    expect(isUserAdmin({ role: "admin" }, null)).toBe(true);
    expect(isUserAdmin({ role: "super_admin" }, null)).toBe(true);
    expect(isUserAdmin({ role: "viewer" }, null)).toBe(false);
  });

  it("treats roles arrays as admin", () => {
    expect(isUserAdmin({ roles: ["super_admin"] }, null)).toBe(true);
    expect(isUserAdmin({ roles: ["admin"] }, null)).toBe(true);
    expect(isUserAdmin({ roles: ["viewer", "admin"] }, null)).toBe(true);
    expect(isUserAdmin({ roles: ["viewer"] }, null)).toBe(false);
  });

  it("honours a collection-level custom adminRole", () => {
    const collection = { slug: "staff", auth: { adminRole: "owner" } } as any;
    expect(isUserAdmin({ role: "owner" }, collection)).toBe(true);
    expect(isUserAdmin({ roles: ["owner"] }, collection)).toBe(true);
    // Built-ins still pass even with a custom role configured.
    expect(isUserAdmin({ role: "super_admin" }, collection)).toBe(true);
    expect(isUserAdmin({ role: "viewer" }, collection)).toBe(false);
  });

  it("denies missing users and empty roles", () => {
    expect(isUserAdmin(null, null)).toBe(false);
    expect(isUserAdmin(undefined, null)).toBe(false);
    expect(isUserAdmin({}, null)).toBe(false);
    expect(isUserAdmin({ roles: [] }, null)).toBe(false);
  });
});
