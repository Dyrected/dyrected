import { afterEach, describe, expect, it } from "vitest";
import { appendQueryParam, resolveAdminUrl } from "../utils/admin-url.js";

const c = { req: { url: "https://api.example.com/api/users/invite" } } as any;

describe("resolveAdminUrl", () => {
  afterEach(() => {
    delete process.env.DYRECTED_ADMIN_URL;
  });

  it("falls back to /admin on the request origin", () => {
    expect(resolveAdminUrl(c, {})).toBe("https://api.example.com/admin");
  });

  it("uses the client-provided URL over the default", () => {
    expect(resolveAdminUrl(c, {}, "http://localhost:3007/cms")).toBe("http://localhost:3007/cms");
  });

  it("prefers the env var over the client URL", () => {
    process.env.DYRECTED_ADMIN_URL = "https://admin.example.com/";
    expect(resolveAdminUrl(c, {}, "http://localhost:3007/")).toBe("https://admin.example.com/");
  });

  it("prefers config.admin.adminUrl over the env var", () => {
    process.env.DYRECTED_ADMIN_URL = "https://env.example.com/";
    expect(resolveAdminUrl(c, { admin: { adminUrl: "/dashboard" } })).toBe("https://api.example.com/dashboard");
  });
});

describe("appendQueryParam", () => {
  it("handles existing query strings and encodes values", () => {
    expect(appendQueryParam("https://a.com/admin", "inviteToken", "a b")).toBe("https://a.com/admin?inviteToken=a%20b");
    expect(appendQueryParam("https://a.com/admin?x=1", "token", "t")).toBe("https://a.com/admin?x=1&token=t");
  });
});
