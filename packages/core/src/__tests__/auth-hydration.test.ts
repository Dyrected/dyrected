import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import type { DyrectedContext } from "../app.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { signCollectionToken } from "../auth/token.js";
import { InMemoryAdapter } from "./mocks.js";

/**
 * The JWT only carries identity claims (sub/email/collection). These tests lock in that
 * the auth middleware re-hydrates the full user record from the database so access
 * functions and hooks can read collection fields like `roles`.
 */
describe("Auth middleware user hydration", () => {
  process.env.DYRECTED_JWT_SECRET = "my-test-secret-that-is-at-least-32-chars-long";

  const db = new InMemoryAdapter();
  const config = { db } as any;

  // Minimal app that echoes the resolved user so we can inspect what access functions
  // and hooks would receive.
  function makeApp() {
    const app = new Hono<DyrectedContext>();
    app.use("*", async (c, next) => {
      c.set("config", config);
      await next();
    });
    app.use("*", optionalAuth(config));
    app.get("/whoami", (c) => c.json({ user: c.get("user") ?? null }));
    app.get("/protected", requireAuth(config), (c) => c.json({ user: c.get("user") }));
    return app;
  }

  const app = makeApp();

  beforeEach(() => {
    (db as any).store = {};
  });

  async function tokenFor(id: string) {
    const user = await db.create({
      collection: "users",
      data: { id, email: `${id}@test.com`, password: "hashed-secret", roles: ["admin"] },
    });
    // Note: the token is signed with identity claims ONLY — no roles.
    return signCollectionToken({ sub: user.id, email: user.email, collection: "users" });
  }

  it("hydrates roles (and other fields) from the DB even though the token omits them", async () => {
    const token = await tokenFor("u1");

    const res = await app.request("/whoami", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user).toBeTruthy();
    expect(body.user.roles).toEqual(["admin"]);
    expect(body.user.sub).toBe("u1");
    expect(body.user.email).toBe("u1@test.com");
    expect(body.user.collection).toBe("users");
  });

  it("never exposes the password field on the resolved user", async () => {
    const token = await tokenFor("u2");

    const res = await app.request("/whoami", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();

    expect(body.user.password).toBeUndefined();
  });

  it("treats a valid token for a deleted user as unauthenticated", async () => {
    const token = await tokenFor("u3");
    // Delete the underlying record; the token is still cryptographically valid.
    (db as any).store = {};

    // optionalAuth: proceeds without a user.
    const open = await app.request("/whoami", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await open.json()).user).toBeNull();

    // requireAuth: rejects.
    const guarded = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(guarded.status).toBe(401);
  });

  it("still requires a token on protected routes", async () => {
    const res = await app.request("/protected");
    expect(res.status).toBe(401);
  });

  it("resolves the full user on protected routes", async () => {
    const token = await tokenFor("u4");
    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.user.roles).toEqual(["admin"]);
  });
});
