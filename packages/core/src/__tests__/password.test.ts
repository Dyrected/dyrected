import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, hasUsablePassword } from "../auth/password.js";

describe("password utilities", () => {
  it("hashes and verifies passwords correctly", async () => {
    const plain = "SuperSecret123!";
    const hashed = await hashPassword(plain);

    expect(hashed).toContain(":");
    expect(hasUsablePassword(hashed)).toBe(true);

    const isMatch = await verifyPassword(plain, hashed);
    expect(isMatch).toBe(true);

    const wrongMatch = await verifyPassword("WrongPassword", hashed);
    expect(wrongMatch).toBe(false);
  });

  it("handles null, undefined, empty, or malformed stored passwords safely without throwing", async () => {
    expect(hasUsablePassword(null)).toBe(false);
    expect(hasUsablePassword(undefined)).toBe(false);
    expect(hasUsablePassword("")).toBe(false);
    expect(hasUsablePassword("nopassword")).toBe(false);
    expect(hasUsablePassword("salt-only:")).toBe(false);
    expect(hasUsablePassword(":hash-only")).toBe(false);
    expect(hasUsablePassword("a:b:c")).toBe(false);

    expect(await verifyPassword("password", null)).toBe(false);
    expect(await verifyPassword("password", undefined)).toBe(false);
    expect(await verifyPassword("password", "")).toBe(false);
    expect(await verifyPassword("password", "invalid_format")).toBe(false);
    expect(await verifyPassword("password", "invalid:hex_values_here_not_hex")).toBe(false);
    expect(await verifyPassword("", "salt:hash")).toBe(false);
  });
});
