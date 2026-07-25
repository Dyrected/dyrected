import { describe, expect, it } from "vitest";
import {
  GENERATE_CMS_PROMPT,
  GENERATE_CMS_PROMPT_SELF_HOSTED,
} from "@dyrected/knowledge";
import { buildGuideUrl, buildPrompt } from "./utils";

describe("buildGuideUrl", () => {
  it("includes useful setup context without exposing credentials", () => {
    const url = new URL(
      buildGuideUrl({
        apiKey: "secret-api-key",
        baseUrl: "https://api.example.com/dyrected",
        defaultTechStack: "nextjs",
        siteId: "site_123",
      }),
    );

    expect(url.origin + url.pathname).toBe("https://www.dyrected.com/guide");
    expect(url.searchParams.get("source")).toBe("admin");
    expect(url.searchParams.get("stack")).toBe("nextjs");
    expect(url.searchParams.get("siteId")).toBe("site_123");
    expect(url.searchParams.get("endpoint")).toBe(
      "https://api.example.com/dyrected",
    );
    expect(url.toString()).not.toContain("secret-api-key");
  });
});

describe("buildPrompt", () => {
  it("returns the canonical Cloud prompt without credentials", () => {
    expect(buildPrompt({})).toBe(GENERATE_CMS_PROMPT);
  });

  it("injects Cloud credentials into the canonical prompt", () => {
    const prompt = buildPrompt({
      apiKey: "secret-api-key",
      baseUrl: "https://api.example.com/sites/site_123",
      siteId: "site_123",
    });

    expect(prompt).toContain("- Site ID: site_123");
    expect(prompt).toContain("- Site API key: secret-api-key");
    expect(prompt).toContain(
      "- Base URL: https://api.example.com/sites/site_123",
    );
    expect(prompt).not.toContain("If credentials are not already configured");
  });

  it("returns the self-hosted variant when requested", () => {
    expect(buildPrompt({ isSelfHosted: true })).toBe(
      GENERATE_CMS_PROMPT_SELF_HOSTED,
    );
  });
});
