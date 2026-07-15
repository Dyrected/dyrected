import { beforeEach, describe, expect, it } from "vitest";
import { createDyrectedApp } from "../app.js";
import { hashPassword } from "../auth/password.js";
import { AUTH_SESSIONS_COLLECTION } from "../auth/sessions.js";
import { decodeCollectionToken, signCollectionToken } from "../auth/token.js";
import { defineCollection, defineConfig } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

describe("auth sessions", () => {
  beforeEach(() => {
    process.env.DYRECTED_JWT_SECRET = "dyrected-test-secret";
  });

  async function createAuthApp() {
    const db = new InMemoryAdapter();
    const app = await createDyrectedApp(
      defineConfig({
        collections: [
          defineCollection({
            slug: "users",
            auth: true,
            fields: [{ name: "name", type: "text" }],
          }),
        ],
        globals: [],
        db,
      }),
    );

    db.seed("users", [
      {
        id: "user_1",
        email: "owner@example.com",
        password: await hashPassword("correct-password"),
        roles: ["admin"],
      },
    ]);

    return { app, db };
  }

  async function login(app: Awaited<ReturnType<typeof createDyrectedApp>>) {
    const res = await app.request("/api/collections/users/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        password: "correct-password",
      }),
    });

    expect(res.status).toBe(200);
    return (await res.json()).token as string;
  }

  it("issues a stateful session token and revokes it on logout", async () => {
    const { app, db } = await createAuthApp();
    const token = await login(app);
    const payload = decodeCollectionToken(token);

    expect(payload?.sid).toBeTruthy();

    const logout = await app.request("/api/collections/users/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(logout.status).toBe(200);

    const session = await db.findOne({
      collection: AUTH_SESSIONS_COLLECTION,
      id: payload!.sid!,
    });
    expect(session?.revokedAt).toEqual(expect.any(String));

    const me = await app.request("/api/collections/users/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.status).toBe(401);
  });

  it("revokes every active session when allSessions=true", async () => {
    const { app } = await createAuthApp();
    const firstToken = await login(app);
    const secondToken = await login(app);

    const logout = await app.request(
      "/api/collections/users/logout?allSessions=true",
      {
        method: "POST",
        headers: { authorization: `Bearer ${firstToken}` },
      },
    );
    expect(logout.status).toBe(200);

    const me = await app.request("/api/collections/users/me", {
      headers: { authorization: `Bearer ${secondToken}` },
    });
    expect(me.status).toBe(401);
  });

  it("revokes existing sessions after a password reset", async () => {
    const { app } = await createAuthApp();
    const token = await login(app);
    const resetToken = await signCollectionToken(
      {
        sub: "user_1",
        email: "owner@example.com",
        collection: "users",
        purpose: "reset",
      },
      "1h",
    );

    const reset = await app.request("/api/collections/users/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: resetToken,
        password: "new-password-123",
      }),
    });
    expect(reset.status).toBe(200);

    const me = await app.request("/api/collections/users/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.status).toBe(401);
  });

  it("preserves the same session id when refreshing a token", async () => {
    const { app } = await createAuthApp();
    const token = await login(app);
    const payload = decodeCollectionToken(token);

    const refresh = await app.request("/api/collections/users/refresh-token", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(refresh.status).toBe(200);

    const refreshedToken = (await refresh.json()).token as string;
    const refreshedPayload = decodeCollectionToken(refreshedToken);

    expect(refreshedPayload?.sid).toBe(payload?.sid);
  });
});
