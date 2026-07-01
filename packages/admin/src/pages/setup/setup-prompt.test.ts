import { describe, expect, it } from "vitest";
import { buildGuideUrl } from "./utils";

describe("buildGuideUrl", () => {
  it("includes useful setup context without exposing credentials", () => {
    const url = new URL(buildGuideUrl({
      apiKey: "secret-api-key",
      baseUrl: "https://api.example.com/dyrected",
      defaultTechStack: "nextjs",
      siteId: "site_123",
    }));

    expect(url.origin + url.pathname).toBe("https://www.dyrected.com/guide");
    expect(url.searchParams.get("source")).toBe("admin");
    expect(url.searchParams.get("stack")).toBe("nextjs");
    expect(url.searchParams.get("siteId")).toBe("site_123");
    expect(url.searchParams.get("endpoint")).toBe("https://api.example.com/dyrected");
    expect(url.toString()).not.toContain("secret-api-key");
  });
});
