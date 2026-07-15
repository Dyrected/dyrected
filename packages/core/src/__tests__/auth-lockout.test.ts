import { beforeEach, describe, expect, it } from "vitest";
import { createDyrectedApp } from "../app.js";
import { hashPassword } from "../auth/password.js";
import { defineCollection, defineConfig } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

describe("auth lockout", () => {
  beforeEach(() => {
    process.env.DYRECTED_JWT_SECRET = "dyrected-test-secret";
  });

  async function createAuthApp(
    auth: true | { maxLoginAttempts?: number; lockTime?: number },
  ) {
    const db = new InMemoryAdapter();
    const app = await createDyrectedApp(
      defineConfig({
        collections: [
          defineCollection({
            slug: "users",
            auth,
            fields: [{ name: "name", type: "text" }],
          }),
        ],
        globals: [],
        db,
      }),
    );

    return { app, db };
  }

  it("locks an account after the configured number of failed logins", async () => {
    const { app, db } = await createAuthApp({
      maxLoginAttempts: 2,
      lockTime: 60_000,
    });

    db.seed("users", [
      {
        id: "user_1",
        email: "owner@example.com",
        password: await hashPassword("correct-password"),
      },
    ]);

    const firstAttempt = await app.request("/api/collections/users/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        password: "wrong-password",
      }),
    });

    expect(firstAttempt.status).toBe(401);

    const secondAttempt = await app.request("/api/collections/users/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        password: "wrong-password",
      }),
    });

    expect(secondAttempt.status).toBe(429);
    expect(secondAttempt.headers.get("retry-after")).toBe("60");
    expect(await secondAttempt.json()).toMatchObject({
      error: true,
      message: "Too many login attempts. Try again later.",
      retryAfterSeconds: 60,
    });

    const user = await db.findOne({ collection: "users", id: "user_1" });
    expect(user?.loginAttempts).toBe(2);
    expect(typeof user?.lockedUntil).toBe("string");
  });

  it("blocks even correct credentials while the lock window is still active", async () => {
    const { app, db } = await createAuthApp({
      maxLoginAttempts: 3,
      lockTime: 120_000,
    });

    db.seed("users", [
      {
        id: "user_1",
        email: "owner@example.com",
        password: await hashPassword("correct-password"),
        loginAttempts: 3,
        lockedUntil: new Date(Date.now() + 120_000).toISOString(),
      },
    ]);

    const res = await app.request("/api/collections/users/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        password: "correct-password",
      }),
    });

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({
      error: true,
      message: "Too many login attempts. Try again later.",
    });
  });

  it("clears login attempts after a successful login", async () => {
    const { app, db } = await createAuthApp({
      maxLoginAttempts: 5,
      lockTime: 60_000,
    });

    db.seed("users", [
      {
        id: "user_1",
        email: "owner@example.com",
        password: await hashPassword("correct-password"),
        loginAttempts: 2,
      },
    ]);

    const res = await app.request("/api/collections/users/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        password: "correct-password",
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      token: expect.any(String),
      user: {
        id: "user_1",
        email: "owner@example.com",
      },
    });

    const user = await db.findOne({ collection: "users", id: "user_1" });
    expect(user?.loginAttempts).toBe(0);
    expect(user?.lockedUntil).toBeNull();
  });

  it("lets you disable built-in lockout per collection", async () => {
    const { app, db } = await createAuthApp({
      maxLoginAttempts: 0,
      lockTime: 60_000,
    });

    db.seed("users", [
      {
        id: "user_1",
        email: "owner@example.com",
        password: await hashPassword("correct-password"),
      },
    ]);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await app.request("/api/collections/users/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "owner@example.com",
          password: "wrong-password",
        }),
      });

      expect(res.status).toBe(401);
    }

    const user = await db.findOne({ collection: "users", id: "user_1" });
    expect(user?.loginAttempts).toBeUndefined();
    expect(user?.lockedUntil).toBeUndefined();
  });
});
