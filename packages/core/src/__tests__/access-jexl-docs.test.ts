import { describe, it, expect } from "vitest";
import { evaluateAccess } from "../auth/jexl.js";

// Guards the Jexl example in the `AccessFunction` docs: Jexl has no `contains`
// operator, role checks use `in`.
describe("documented Jexl role check", () => {
  it("allows a user holding the role", async () => {
    expect(await evaluateAccess("'editor' in user.roles", { user: { roles: ["editor"] } })).toBe(true);
  });
  it("denies a user without the role", async () => {
    expect(await evaluateAccess("'editor' in user.roles", { user: { roles: ["viewer"] } })).toBe(false);
  });
  it("rejects the non-existent `contains` operator", async () => {
    expect(await evaluateAccess("user.roles contains 'editor'", { user: { roles: ["editor"] } })).toBe(false);
  });
});
