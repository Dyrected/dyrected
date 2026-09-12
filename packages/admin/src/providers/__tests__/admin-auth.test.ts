import { describe, expect, it } from "vitest";
import { decodeTokenPayload, normalizeAdminUser } from "../admin-auth";

function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe("admin-auth normalization", () => {
  describe("normalizeAdminUser", () => {
    it("preserves collection from argument if not present on user", () => {
      const normalized = normalizeAdminUser({ id: "1", email: "admin@test.com" }, "__admins");
      expect(normalized).toEqual({
        id: "1",
        email: "admin@test.com",
        collection: "__admins",
        roles: [],
      });
    });

    it("keeps existing collection if already present on user", () => {
      const normalized = normalizeAdminUser({ id: "1", collection: "custom_admins" }, "__admins");
      expect(normalized?.collection).toBe("custom_admins");
    });

    it("normalizes array roles to provide role fallback", () => {
      const normalized = normalizeAdminUser({
        id: "1",
        roles: ["super_admin", "ops"],
      });
      expect(normalized?.role).toBe("super_admin");
      expect(normalized?.roles).toEqual(["super_admin", "ops"]);
    });

    it("normalizes string role to provide roles array fallback", () => {
      const normalized = normalizeAdminUser({
        id: "1",
        role: "editor",
      });
      expect(normalized?.role).toBe("editor");
      expect(normalized?.roles).toEqual(["editor"]);
    });

    it("normalizes cloud role owner to admin", () => {
      const normalized = normalizeAdminUser({
        id: "1",
        role: "owner",
        roles: ["owner"],
      });
      expect(normalized?.role).toBe("admin");
      expect(normalized?.roles).toEqual(["admin"]);
    });
  });

  describe("decodeTokenPayload", () => {
    it("decodes payload and normalizes role and collection", () => {
      const token = makeToken({
        sub: "user-99",
        email: "staff@test.com",
        collection: "__admins",
        roles: ["ops"],
      });
      const user = decodeTokenPayload(token);
      expect(user).toMatchObject({
        sub: "user-99",
        email: "staff@test.com",
        collection: "__admins",
        role: "ops",
        roles: ["ops"],
      });
    });
  });
});
