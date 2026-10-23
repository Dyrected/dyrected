import { describe, expect, it } from "vitest";
import { resolveAdminString, resolveAppName, resolveTitleSuffix } from "../utils/app-name.js";
import { generateOpenApi } from "../utils/openapi.js";
import { getSwaggerHtml } from "../utils/swagger.js";

describe("resolveAppName", () => {
  it("prefers appName, then logoText, then the title suffix", () => {
    expect(resolveAppName({ branding: { appName: "A", logoText: "B" }, meta: { titleSuffix: "- C" } })).toBe("A");
    expect(resolveAppName({ branding: { logoText: "B" }, meta: { titleSuffix: "- C" } })).toBe("B");
    expect(resolveAppName({ meta: { titleSuffix: "- C" } })).toBe("C");
  });

  it.each([
    ["- Acme Admin", "Acme Admin"],
    ["— Acme Admin", "Acme Admin"],
    ["– Acme Admin", "Acme Admin"],
    ["| Acme Admin", "Acme Admin"],
    ["Acme Admin", "Acme Admin"],
  ])("strips the separator from %s", (suffix, expected) => {
    expect(resolveAppName({ meta: { titleSuffix: suffix } })).toBe(expected);
  });

  it("returns an empty string, never Dyrected, when nothing is configured", () => {
    expect(resolveAppName(undefined)).toBe("");
    expect(resolveAppName({})).toBe("");
    expect(resolveAppName({ branding: { appName: "  " } })).toBe("");
  });
});

describe("resolveTitleSuffix", () => {
  it("uses an explicit suffix verbatim", () => {
    expect(resolveTitleSuffix({ meta: { titleSuffix: "— Acme Admin" } })).toBe("— Acme Admin");
  });

  it("derives the suffix from the app name", () => {
    expect(resolveTitleSuffix({ branding: { appName: "Acme" } })).toBe("- Acme");
    expect(resolveTitleSuffix({ branding: { logoText: "Acme" } })).toBe("- Acme");
  });

  it("is empty when no name is configured, and when the host sets an empty suffix", () => {
    expect(resolveTitleSuffix({})).toBe("");
    expect(resolveTitleSuffix({ branding: { appName: "Acme" }, meta: { titleSuffix: "" } })).toBe("");
  });
});

describe("resolveAdminString", () => {
  it("returns the fallback when not overridden", () => {
    expect(resolveAdminString({}, "auth.signIn.title", "Welcome back")).toBe("Welcome back");
  });

  it("uses an override and substitutes {appName}", () => {
    const admin = { branding: { appName: "Acme" }, strings: { "auth.signIn.title": "Sign in to {appName}" } };
    expect(resolveAdminString(admin, "auth.signIn.title", "Welcome back")).toBe("Sign in to Acme");
  });

  it("ignores blank overrides", () => {
    expect(resolveAdminString({ strings: { "auth.signIn.title": "  " } }, "auth.signIn.title", "Welcome back")).toBe("Welcome back");
  });
});

describe("server-rendered pages", () => {
  it("names the API docs page after the app, and stays neutral without a name", () => {
    expect(getSwaggerHtml(undefined, { appName: "Acme" })).toContain("<title>Acme API Documentation</title>");
    const neutral = getSwaggerHtml();
    expect(neutral).toContain("<title>API Documentation</title>");
    expect(neutral).not.toContain("Dyrected");
  });

  it("escapes the app name in the docs title", () => {
    expect(getSwaggerHtml(undefined, { appName: "<b>x" })).toContain("&lt;b&gt;x");
  });

  it("titles the OpenAPI document with the app name", () => {
    const named = generateOpenApi({ collections: [], globals: [], admin: { branding: { appName: "Acme" } } } as any);
    expect(named.info.title).toBe("Acme API");
    const neutral = generateOpenApi({ collections: [], globals: [] } as any);
    expect(neutral.info.title).toBe("API");
    expect(JSON.stringify(neutral.info)).not.toContain("Dyrected");
  });
});
