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
    expect(created.docs[0]?.password).toBeNull();
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

  it("allows inviting an existing user record that has no password set (e.g. pre-created customer/KYC account)", async () => {
    const { app, db, emailSend } = await createAuthApp();

    db.seed("users", [
      {
        id: "admin_1",
        email: "admin@example.com",
        password: await hashPassword("correct-password"),
        roles: ["admin"],
        status: "active",
      },
      {
        id: "kyc_user_1",
        email: "investor@example.com",
        name: "Jane Investor",
        password: null, // no password set yet
        status: "approved", // custom status
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
        email: "investor@example.com",
        roles: ["editor"],
      }),
    });

    expect(inviteRes.status).toBe(200);
    const body = await inviteRes.json();
    expect(body.success).toBe(true);
    expect(body.emailSent).toBe(true);
    expect(body.token).toBeDefined();

    // Verify database record was updated without creating duplicate
    const users = await db.find({
      collection: "users",
      where: { email: "investor@example.com" },
    });
    expect(users.total).toBe(1);
    expect(users.docs[0]?.id).toBe("kyc_user_1");
    expect(users.docs[0]?.roles).toEqual(["editor"]);
    expect(users.docs[0]?.invitedAt).toBeTypeOf("number");
  });

  it("blocks inviting an existing user that already has a usable password set", async () => {
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
        id: "existing_user_1",
        email: "existing@example.com",
        password: await hashPassword("existing-password"),
        status: "active",
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
        email: "existing@example.com",
      }),
    });

    expect(inviteRes.status).toBe(409);
    const body = await inviteRes.json();
    expect(body.code).toBe("USER_ALREADY_EXISTS");
  });

  it("blocks double acceptance of an invite token", async () => {
    const { app, db } = await createAuthApp();

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

    // 1. Issue invite
    const inviteRes = await app.request("/api/collections/users/invite", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ email: "user@example.com" }),
    });
    const { token } = await inviteRes.json();

    // 2. Accept invite first time
    const acceptRes1 = await app.request("/api/collections/users/accept-invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: "NewPassword123!" }),
    });
    expect(acceptRes1.status).toBe(201);

    // 3. Attempt to accept same invite again
    const acceptRes2 = await app.request("/api/collections/users/accept-invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: "AnotherPassword123!" }),
    });
    expect(acceptRes2.status).toBe(409);
    const body2 = await acceptRes2.json();
    expect(body2.code).toBe("INVITE_ALREADY_ACCEPTED");
  });

  it("rejects superseded invite tokens when a newer invite was issued", async () => {
    const { app, db } = await createAuthApp();

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

    // 1. Issue first invite
    const inviteRes1 = await app.request("/api/collections/users/invite", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ email: "supersede@example.com" }),
    });
    const { token: token1 } = await inviteRes1.json();

    // Small delay to ensure timestamp progression
    await new Promise((r) => setTimeout(r, 20));

    // Manually advance invitedAt in DB to simulate re-invite issued later
    await db.update({
      collection: "users",
      id: (await db.find({ collection: "users", where: { email: "supersede@example.com" } })).docs[0].id,
      data: { invitedAt: Date.now() + 5000 },
    });

    // 2. Attempt to accept using older token
    const acceptRes = await app.request("/api/collections/users/accept-invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: token1, password: "NewPassword123!" }),
    });

    expect(acceptRes.status).toBe(400);
    const body = await acceptRes.json();
    expect(body.code).toBe("INVITE_SUPERSEDED");
  });

  it("supports headless token generation with sendEmail: false", async () => {
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

    // Headless invite
    const inviteRes = await app.request("/api/collections/users/invite", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: "headless@example.com",
        sendEmail: false,
      }),
    });

    expect(inviteRes.status).toBe(200);
    const inviteBody = await inviteRes.json();
    expect(inviteBody.emailSent).toBe(false);
    expect(inviteBody.token).toBeDefined();
    expect(emailSend).not.toHaveBeenCalled();

    // Headless password reset
    const resetRes = await app.request("/api/collections/users/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        sendEmail: false,
      }),
    });

    expect(resetRes.status).toBe(200);
    const resetBody = await resetRes.json();
    expect(resetBody.token).toBeDefined();
    expect(resetBody.resetUrl).toContain("token=");
  });

  it("validates tokens via GET /api/collections/:slug/tokens/verify", async () => {
    const { app, db } = await createAuthApp();

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

    const inviteRes = await app.request("/api/collections/users/invite", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ email: "verifier@example.com" }),
    });
    const { token } = await inviteRes.json();

    // 1. Verify valid invite token
    const verifyValid = await app.request(`/api/collections/users/tokens/verify?token=${token}&purpose=invite`);
    expect(verifyValid.status).toBe(200);
    expect(await verifyValid.json()).toMatchObject({
      valid: true,
      email: "verifier@example.com",
      collection: "users",
    });

    // 2. Verify with wrong purpose
    const verifyWrongPurpose = await app.request(`/api/collections/users/tokens/verify?token=${token}&purpose=reset`);
    expect(await verifyWrongPurpose.json()).toMatchObject({
      valid: false,
      code: "PURPOSE_MISMATCH",
    });

    // 3. Verify bad token string
    const verifyBad = await app.request(`/api/collections/users/tokens/verify?token=corrupted.jwt.here`);
    expect(await verifyBad.json()).toMatchObject({
      valid: false,
      code: "TOKEN_EXPIRED_OR_INVALID",
    });
  });
});
