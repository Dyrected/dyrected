import { describe, it, expect } from "vitest";
import { createDyrectedApp } from "../app.js";
import { defineConfig } from "../index.js";
import { MockDatabaseAdapter } from "./mocks.js";

describe("App Shell", () => {
  const config = defineConfig({
    collections: [],
    globals: [],
    db: new MockDatabaseAdapter(),
  });

  it("should respond to health check", async () => {
    const app = await createDyrectedApp(config);
    const res = await app.request("/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", version: "0.0.1" });
  });

  it("should set configuration in context", async () => {
    const app = await createDyrectedApp(config);

    app.get("/test-ctx", (c) => {
      const cfg = c.get("config");
      return c.json({ hasConfig: !!cfg });
    });

    const res = await app.request("/test-ctx");
    expect(await res.json()).toEqual({ hasConfig: true });
  });

  it("should rate limit API requests with Payload-style defaults and headers", async () => {
    const app = await createDyrectedApp(
      defineConfig({
        collections: [],
        globals: [],
        db: new MockDatabaseAdapter(),
        rateLimit: {
          max: 1,
          window: 60_000,
        },
      }),
    );

    app.get("/api/limited", (c) => c.json({ ok: true }));

    const first = await app.request("/api/limited");
    expect(first.status).toBe(200);
    expect(first.headers.get("x-ratelimit-limit")).toBe("1");
    expect(first.headers.get("x-ratelimit-remaining")).toBe("0");

    const second = await app.request("/api/limited");
    expect(second.status).toBe(429);
    expect(second.headers.get("retry-after")).toBe("60");
    expect(await second.json()).toMatchObject({
      error: true,
      message: "Too many requests. Try again later.",
      retryAfterSeconds: 60,
    });
  });

  it("should not rate limit routes outside the protected prefixes", async () => {
    const app = await createDyrectedApp(
      defineConfig({
        collections: [],
        globals: [],
        db: new MockDatabaseAdapter(),
        rateLimit: {
          max: 1,
          window: 60_000,
        },
      }),
    );

    app.get("/public", (c) => c.json({ ok: true }));

    const first = await app.request("/public");
    const second = await app.request("/public");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers.get("x-ratelimit-limit")).toBeNull();
  });

  it("should respect trustProxy when resolving the client IP", async () => {
    const app = await createDyrectedApp(
      defineConfig({
        collections: [],
        globals: [],
        db: new MockDatabaseAdapter(),
        rateLimit: {
          enabled: false,
          trustProxy: true,
        },
      }),
    );

    app.get("/api/ip", (c) => c.json({ ip: c.get("clientIp") ?? null }));

    const trusted = await app.request("/api/ip", {
      headers: {
        "x-forwarded-for": "198.51.100.12, 10.0.0.1",
      },
    });
    expect(await trusted.json()).toEqual({ ip: "198.51.100.12" });

    const untrustedApp = await createDyrectedApp(
      defineConfig({
        collections: [],
        globals: [],
        db: new MockDatabaseAdapter(),
        rateLimit: {
          enabled: false,
          trustProxy: false,
        },
      }),
    );

    untrustedApp.get("/api/ip", (c) => c.json({ ip: c.get("clientIp") ?? null }));

    const untrusted = await untrustedApp.request("/api/ip", {
      headers: {
        "x-forwarded-for": "198.51.100.12, 10.0.0.1",
      },
    });
    expect(await untrusted.json()).toEqual({ ip: "127.0.0.1" });
  });

  it("should trust provider client IP headers without enabling proxy mode", async () => {
    const app = await createDyrectedApp(config);

    app.get("/api/ip", (c) => c.json({ ip: c.get("clientIp") ?? null }));

    const res = await app.request("/api/ip", {
      headers: {
        "cf-connecting-ip": "203.0.113.9",
      },
    });

    expect(await res.json()).toEqual({ ip: "203.0.113.9" });
  });
});
