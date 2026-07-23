import { describe, expect, it, vi } from "vitest";
import { createDyrectedApp } from "../app.js";
import { hashPassword } from "../auth/password.js";
import { defineCollection, defineConfig } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

describe("auth invite flow", () => {
  async function createAuthApp() {
    process.env.DYRECTED_JWT_SECRET = "dyrected-test-secret";

    const db = new InMemoryAdapter();
    const emailSend = vi.fn().mockResolvedValue(undefined);
    const app = await createDyrectedApp(
      defineConfig({
        collections: [
          defineCollection({
            slug: "users",
            auth: true,
            fields: [
              { name: "name", type: "text" },
              { name: "roles", type: "select", hasMany: true, options: ["admin", "editor"] },
            ],
          }),
        ],
        globals: [],
        db,
        email: {
          from: "test@example.com",
          send: emailSend,
        },
      }),
    );

    return { app, db, emailSend };
  }

  async function loginAsAdmin(app: Awaited<ReturnType<typeof createAuthApp>>["app"]) {
    const loginRes = await app.request("/api/collections/users/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "correct-password",
      }),
    });

    const loginBody = await loginRes.json();
    return loginBody.token as string;
  }

  it("creates a pending user record when inviting someone new", async () => {
    const { app, db, emailSend } = await createAuthApp();

    db.seed("users", [
      {
        id: "admin_1",
        email: "admin@example.com",
        password: await hashPassword("correct-password"),
        roles: ["admin"],
        status: "active",
      },
    ]);

    const adminToken = await loginAsAdmin(app);

    const res = await app.request("/api/collections/users/invite", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: "invitee@example.com",
        inviteUrl: "https://cms.example.com/admin",
        data: { roles: ["editor"] },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.inviteUrl).toContain("inviteToken=");

    const created = await db.find({
      collection: "users",
      where: { email: "invitee@example.com" },
      limit: 1,
    });

    expect(created.total).toBe(1);
    expect(created.docs[0]?.status).toBe("pending");
    expect(created.docs[0]?.roles).toEqual(["editor"]);
    expect(typeof created.docs[0]?.password).toBe("string");
    expect(emailSend).toHaveBeenCalledTimes(1);
    expect(emailSend.mock.calls[0]?.[0]?.html).toContain("Accept invitation");
  });

  it("blocks login for pending invited users", async () => {
    const { app, db } = await createAuthApp();

    db.seed("users", [
      {
        id: "invitee_1",
        email: "invitee@example.com",
        password: "salt:hash",
        status: "pending",
      },
    ]);

    const res = await app.request("/api/collections/users/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "invitee@example.com",
        password: "anything",
      }),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: true,
      message: "This invitation has not been accepted yet.",
    });
  });

  it("accepts an invite by activating the existing pending user", async () => {
    const { app, db } = await createAuthApp();

    db.seed("users", [
      {
        id: "admin_1",
        email: "admin@example.com",
        password: await hashPassword("correct-password"),
        roles: ["admin"],
        status: "active",
      },
      {
        id: "invitee_1",
        email: "invitee@example.com",
        password: "salt:hash",
        status: "pending",
      },
    ]);

    const adminToken = await loginAsAdmin(app);

    const inviteRes = await app.request("/api/collections/users/invite", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: "invitee@example.com",
        inviteUrl: "https://cms.example.com/admin",
        data: { roles: ["editor"] },
      }),
    });

    const inviteBody = await inviteRes.json();

    const acceptRes = await app.request("/api/collections/users/accept-invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: inviteBody.token,
        password: "StrongPass123!",
        name: "Invited User",
      }),
    });

    expect(acceptRes.status).toBe(201);

    const users = await db.find({
      collection: "users",
      where: { email: "invitee@example.com" },
      limit: 10,
    });

    expect(users.total).toBe(1);
    expect(users.docs[0]?.id).toBe("invitee_1");
    expect(users.docs[0]?.status).toBe("active");
    expect(users.docs[0]?.name).toBe("Invited User");
    expect(users.docs[0]?.roles).toEqual(["editor"]);
  });
});
