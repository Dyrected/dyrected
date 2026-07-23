import type { Context } from "hono";
import { randomBytes } from "node:crypto";
import type { DyrectedContext } from "../app.js";
import type { CollectionConfig } from "../types/index.js";
import { getLockedUntilMs, resolveAuthLockoutConfig } from "../auth/lockout.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { signCollectionToken, verifyCollectionToken } from "../auth/token.js";
import {
  issueAuthSessionToken,
  revokeAllAuthSessions,
  revokeAuthSession,
} from "../auth/sessions.js";
import {
  sendEmail,
  buildWelcomeEmail,
  buildInviteEmail,
  buildResetPasswordEmail,
  buildPasswordChangedEmail,
} from "../services/email.service.js";
import { getRequestLogger } from "../observability.js";

/**
 * Handles auth endpoints for collections with `auth: true`.
 *
 * Routes registered (relative to `/api/collections/:slug`):
 *   POST   /login
 *   POST   /logout
 *   GET    /me
 *   POST   /refresh-token
 *   POST   /forgot-password
 *   POST   /reset-password
 *   POST   /invite
 *   POST   /accept-invite
 */
export class AuthController {
  private collection: CollectionConfig;

  constructor(collection: CollectionConfig) {
    this.collection = collection;
  }

  private sanitizeUser(user: Record<string, unknown>) {
    const {
      password: _password,
      loginAttempts: _loginAttempts,
      lockedUntil: _lockedUntil,
      ...safeUser
    } = user;
    return safeUser;
  }

  private hasField(name: string) {
    return (this.collection.fields || []).some((field) => field.name === name);
  }

  private async buildPendingInviteData(
    email: string,
    extraFields: Record<string, unknown> = {},
  ) {
    const {
      id: _id,
      password: _password,
      email: _email,
      ...safeExtraFields
    } = extraFields;
    const data: Record<string, unknown> = {
      ...safeExtraFields,
      email,
      password: await hashPassword(randomBytes(32).toString("hex")),
    };

    if (this.hasField("status")) {
      data.status = "pending";
    }

    return data;
  }

  private buildAcceptedInviteData(
    hashedPassword: string,
    extraFields: Record<string, unknown>,
  ) {
    const data: Record<string, unknown> = {
      ...extraFields,
      password: hashedPassword,
    };

    if (this.hasField("status")) {
      data.status = "active";
    }

    return data;
  }

  private clearLockoutState(c: Context<DyrectedContext>, userId: string) {
    const db = c.get("config").db;
    if (!db) return Promise.resolve(null);

    return db.update({
      collection: this.collection.slug,
      id: userId,
      data: {
        loginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  private async recordFailedLogin(
    c: Context<DyrectedContext>,
    user: Record<string, unknown>,
  ) {
    const db = c.get("config").db;
    if (!db)
      return { justLocked: false, retryAfterSeconds: null as number | null };

    const lockout = resolveAuthLockoutConfig(this.collection);
    if (!lockout.enabled) {
      return { justLocked: false, retryAfterSeconds: null as number | null };
    }

    const now = Date.now();
    const lockedUntilMs = getLockedUntilMs(user.lockedUntil);
    const lockExpired = lockedUntilMs !== null && lockedUntilMs <= now;
    const currentAttempts =
      !lockExpired &&
      typeof user.loginAttempts === "number" &&
      user.loginAttempts > 0
        ? user.loginAttempts
        : 0;
    const loginAttempts = currentAttempts + 1;
    const justLocked = loginAttempts >= lockout.maxLoginAttempts;
    const nextLockedUntil = justLocked
      ? new Date(now + lockout.lockTime).toISOString()
      : null;

    await db.update({
      collection: this.collection.slug,
      id: String(user.id),
      data: {
        loginAttempts,
        lockedUntil: nextLockedUntil,
      },
    });

    return {
      justLocked,
      retryAfterSeconds: justLocked
        ? Math.max(1, Math.ceil(lockout.lockTime / 1000))
        : null,
    };
  }

  // ---------------------------------------------------------------------------
  // GET /init
  // Checks if the first user needs to be created.
  // ---------------------------------------------------------------------------
  async init(c: Context<DyrectedContext>) {
    const db = c.get("config").db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const result = await db.find({
      collection: this.collection.slug,
      limit: 1,
    });

    return c.json({
      initialized: result.total > 0,
    });
  }

  // ---------------------------------------------------------------------------
  // POST /first-user
  // Creates the first user if none exist.
  // ---------------------------------------------------------------------------
  async registerFirstUser(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    // 1. Check if users already exist
    const check = await db.find({
      collection: this.collection.slug,
      limit: 1,
    });

    if (check.total > 0) {
      return c.json(
        { error: true, message: "Initial user already exists." },
        403,
      );
    }

    const body = await c.req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return c.json(
        { error: true, message: "email and password are required." },
        400,
      );
    }

    // 2. Create the user
    const hashedPassword = await hashPassword(body.password);
    const user = await db.create({
      collection: this.collection.slug,
      data: {
        ...body,
        password: hashedPassword,
        roles: ["admin"], // Default first user to admin
      },
    });

    // 3. Log them in immediately
    const token = await issueAuthSessionToken({
      config,
      userId: user.id,
      email: user.email,
      collection: this.collection.slug,
      ip: c.get("clientIp"),
      authSource: "local",
    });

    // Send welcome email (best-effort — never block login)
    const { subject, html } = buildWelcomeEmail(config, { email: body.email });
    sendEmail(config, { to: body.email, subject, html }).catch((err) =>
      getRequestLogger(c, "auth").error({
        err,
        msg: "Failed to send welcome email",
        email: body.email,
      }),
    );

    const safeUser = this.sanitizeUser(user);
    return c.json({ token, user: safeUser });
  }

  // ---------------------------------------------------------------------------
  // POST /login
  // ---------------------------------------------------------------------------
  async login(c: Context<DyrectedContext>) {
    const db = c.get("config").db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const body = await c.req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return c.json(
        { error: true, message: "email and password are required." },
        400,
      );
    }

    const result = await db.find({
      collection: this.collection.slug,
      where: { email: body.email },
      limit: 1,
    });

    const user = result.docs[0];

    if (!user) {
      return c.json(
        { error: true, message: "Invalid email or password." },
        401,
      );
    }

    if (user.status === "pending") {
      return c.json(
        { error: true, message: "This invitation has not been accepted yet." },
        403,
      );
    }

    const lockedUntilMs = getLockedUntilMs(user.lockedUntil);
    if (lockedUntilMs !== null && lockedUntilMs > Date.now()) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((lockedUntilMs - Date.now()) / 1000),
      );
      c.header("Retry-After", String(retryAfterSeconds));
      return c.json(
        {
          error: true,
          message: "Too many login attempts. Try again later.",
          retryAfterSeconds,
        },
        429,
      );
    }

    const valid = await verifyPassword(body.password, user.password as string);
    if (!valid) {
      const { justLocked, retryAfterSeconds } = await this.recordFailedLogin(
        c,
        user,
      );
      if (justLocked && retryAfterSeconds) {
        c.header("Retry-After", String(retryAfterSeconds));
        return c.json(
          {
            error: true,
            message: "Too many login attempts. Try again later.",
            retryAfterSeconds,
          },
          429,
        );
      }
      return c.json(
        { error: true, message: "Invalid email or password." },
        401,
      );
    }

    if (
      (typeof user.loginAttempts === "number" && user.loginAttempts > 0) ||
      user.lockedUntil != null
    ) {
      await this.clearLockoutState(c, String(user.id));
    }

    const token = await issueAuthSessionToken({
      config: c.get("config"),
      userId: user.id,
      email: user.email,
      collection: this.collection.slug,
      ip: c.get("clientIp"),
      authSource: "local",
    });

    // Strip password before returning
    const safeUser = this.sanitizeUser(user);
    return c.json({ token, user: safeUser });
  }

  // ---------------------------------------------------------------------------
  // POST /logout
  // Revoke the current session by default. Pass `?allSessions=true` to revoke
  // every active session for the current account.
  // ---------------------------------------------------------------------------
  async logout(c: Context<DyrectedContext>) {
    const requestUser = c.get("user") as any;
    const tokenPayload = c.get("authTokenPayload");
    const allSessions = ["1", "true", "yes"].includes(
      (c.req.query("allSessions") || "").toLowerCase(),
    );

    if (!requestUser) {
      if (allSessions) {
        return c.json(
          { error: true, message: "Authentication required." },
          401,
        );
      }

      return c.json({
        success: true,
        message: "Logged out. Discard your token.",
      });
    }

    if (allSessions) {
      await revokeAllAuthSessions(c.get("config"), {
        userId: requestUser.sub,
        collection: this.collection.slug,
      });
      return c.json({
        success: true,
        message: "All sessions have been logged out.",
      });
    }

    if (tokenPayload?.sid) {
      await revokeAuthSession(c.get("config"), tokenPayload.sid);
      return c.json({
        success: true,
        message: "Logged out.",
      });
    }

    return c.json({
      success: true,
      message: "Logged out. Discard your token.",
    });
  }

  // ---------------------------------------------------------------------------
  // GET /me
  // ---------------------------------------------------------------------------
  async me(c: Context<DyrectedContext>) {
    const db = c.get("config").db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const requestUser = c.get("user") as any;
    if (!requestUser) {
      return c.json({ error: true, message: "Authentication required." }, 401);
    }

    const user = await db.findOne({
      collection: this.collection.slug,
      id: requestUser.sub,
    });
    if (!user) {
      return c.json({ error: true, message: "User not found." }, 404);
    }

    const safeUser = this.sanitizeUser(user);
    return c.json(safeUser);
  }

  // ---------------------------------------------------------------------------
  // POST /refresh-token
  // ---------------------------------------------------------------------------
  async refreshToken(c: Context<DyrectedContext>) {
    const requestUser = c.get("user") as any;
    if (!requestUser) {
      return c.json({ error: true, message: "Authentication required." }, 401);
    }

    if (!requestUser.email) {
      return c.json(
        { error: true, message: "Authenticated user is missing an email." },
        400,
      );
    }

    const tokenPayload = c.get("authTokenPayload");
    if (tokenPayload?.sid) {
      const token = await signCollectionToken({
        sub: requestUser.sub,
        email: requestUser.email,
        collection: this.collection.slug,
        sid: tokenPayload.sid,
      });

      return c.json({ token });
    }

    const token = await issueAuthSessionToken({
      config: c.get("config"),
      userId: requestUser.sub,
      email: requestUser.email,
      collection: this.collection.slug,
      ip: c.get("clientIp"),
      authSource: "local",
    });

    return c.json({ token });
  }

  // ---------------------------------------------------------------------------
  // POST /forgot-password
  // Requires config.email to be set. Silently succeeds if email not found
  // to prevent email enumeration.
  // ---------------------------------------------------------------------------
  async forgotPassword(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const body = await c.req.json().catch(() => null);
    if (!body?.email) {
      return c.json({ error: true, message: "email is required." }, 400);
    }

    const result = await db.find({
      collection: this.collection.slug,
      where: { email: body.email },
      limit: 1,
    });

    const user = result.docs[0];

    if (user) {
      // Issue a short-lived reset token (1-hour)
      const resetToken = await signCollectionToken(
        {
          sub: user.id,
          email: user.email,
          collection: this.collection.slug,
          purpose: "reset",
        },
        "1h",
      );

      // Append token to resetUrl if provided
      const resetUrl = body?.resetUrl;
      const url = resetUrl
        ? `${resetUrl}${resetUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(resetToken)}`
        : undefined;

      try {
        const { subject, html } = buildResetPasswordEmail(config, {
          token: resetToken,
          url,
        });
        await sendEmail(config, { to: user.email as string, subject, html });
      } catch (err) {
        getRequestLogger(c, "auth").error({
          err,
          msg: "Failed to send password reset email",
          email: user.email as string,
        });
      }
    }

    return c.json({
      success: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
    });
  }

  // ---------------------------------------------------------------------------
  // POST /reset-password
  // Expects { token: string, password: string } in body.
  // The token is the reset JWT issued by /forgot-password.
  // ---------------------------------------------------------------------------
  async resetPassword(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const body = await c.req.json().catch(() => null);
    if (!body?.token || !body?.password) {
      return c.json(
        { error: true, message: "token and password are required." },
        400,
      );
    }

    // Verify the reset token
    let payload: any;
    try {
      payload = await verifyCollectionToken(body.token);
    } catch {
      return c.json(
        { error: true, message: "Reset token is invalid or has expired." },
        400,
      );
    }

    if (
      payload.collection !== this.collection.slug ||
      payload.purpose !== "reset"
    ) {
      return c.json(
        { error: true, message: "Reset token is invalid or has expired." },
        400,
      );
    }

    const hashedPassword = await hashPassword(body.password);
    await db.update({
      collection: this.collection.slug,
      id: payload.sub,
      data: {
        password: hashedPassword,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });
    await revokeAllAuthSessions(config, {
      userId: payload.sub,
      collection: this.collection.slug,
    });

    // Notify the user their password was changed (security alert)
    const { subject, html } = buildPasswordChangedEmail(config, {
      email: payload.email,
    });
    sendEmail(config, { to: payload.email, subject, html }).catch((err) =>
      getRequestLogger(c, "auth").error({
        err,
        msg: "Failed to send password-changed email",
        email: payload.email,
      }),
    );

    return c.json({
      success: true,
      message: "Password has been reset. You can now log in.",
    });
  }

  // ---------------------------------------------------------------------------
  // POST /invite
  // Requires auth. Issues a signed invite token and emails it to the invitee.
  // If inviteUrl is provided, the email uses a clickable acceptance URL.
  // ---------------------------------------------------------------------------
  async invite(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const requestUser = c.get("user") as any;
    if (!requestUser) {
      return c.json({ error: true, message: "Authentication required." }, 401);
    }

    const body = await c.req.json().catch(() => null);
    if (!body?.email) {
      return c.json({ error: true, message: "email is required." }, 400);
    }

    const inviteData =
      body?.data && typeof body.data === "object" && !Array.isArray(body.data)
        ? (body.data as Record<string, unknown>)
        : {};

    // Prevent inviting an email that already has an active account.
    const existing = await db.find({
      collection: this.collection.slug,
      where: { email: body.email },
      limit: 1,
    });
    const existingUser = existing.docs[0] as Record<string, unknown> | undefined;
    const existingIsPending = existingUser?.status === "pending";

    if (existingUser && !existingIsPending) {
      return c.json(
        { error: true, message: "An account with that email already exists." },
        409,
      );
    }

    if (!existingUser) {
      await db.create({
        collection: this.collection.slug,
        data: await this.buildPendingInviteData(body.email, inviteData),
      });
    } else if (Object.keys(inviteData).length > 0) {
      await db.update({
        collection: this.collection.slug,
        id: String(existingUser.id),
        data: await this.buildPendingInviteData(body.email, inviteData),
      });
    }

    // sub = invitee email (no user doc yet); purpose = 'invite'
    const inviteToken = await signCollectionToken(
      {
        sub: body.email,
        email: body.email,
        collection: this.collection.slug,
        purpose: "invite",
      },
      "7d",
    );

    const inviteUrl = body?.inviteUrl;
    const url = inviteUrl
      ? `${inviteUrl}${inviteUrl.includes("?") ? "&" : "?"}inviteToken=${encodeURIComponent(inviteToken)}`
      : undefined;

    try {
      const { subject, html } = buildInviteEmail(config, {
        token: inviteToken,
        invitedByEmail: requestUser.email,
        url,
      });
      await sendEmail(config, { to: body.email, subject, html });
    } catch (err) {
      getRequestLogger(c, "auth").error({
        err,
        msg: "Failed to send invite email",
        email: body.email,
      });
    }

    return c.json({
      success: true,
      message: `Invite sent to ${body.email}.`,
      token: inviteToken,
      inviteUrl: url,
    });
  }

  // ---------------------------------------------------------------------------
  // POST /accept-invite
  // Public. Validates the invite token and creates the user account.
  // Body: { token, password, ...extraFields }
  // ---------------------------------------------------------------------------
  async acceptInvite(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const body = await c.req.json().catch(() => null);
    if (!body?.token || !body?.password) {
      return c.json(
        { error: true, message: "token and password are required." },
        400,
      );
    }

    let payload: any;
    try {
      payload = await verifyCollectionToken(body.token);
    } catch {
      return c.json(
        { error: true, message: "Invite token is invalid or has expired." },
        400,
      );
    }

    if (
      payload.collection !== this.collection.slug ||
      payload.purpose !== "invite"
    ) {
      return c.json(
        { error: true, message: "Invite token is invalid or has expired." },
        400,
      );
    }

    const inviteeEmail = payload.sub;

    // Guard against double-accept while still supporting pending pre-provisioned users.
    const existing = await db.find({
      collection: this.collection.slug,
      where: { email: inviteeEmail },
      limit: 1,
    });
    const existingUser = existing.docs[0] as Record<string, unknown> | undefined;
    const existingIsPending = existingUser?.status === "pending";

    if (existingUser && !existingIsPending) {
      return c.json(
        { error: true, message: "An account with that email already exists." },
        409,
      );
    }

    const { token: _t, password: _p, ...extraFields } = body;
    const hashedPassword = await hashPassword(body.password);
    const user = existingUser
      ? await db.update({
        collection: this.collection.slug,
        id: String(existingUser.id),
        data: this.buildAcceptedInviteData(hashedPassword, extraFields),
      })
      : await db.create({
        collection: this.collection.slug,
        data: {
          ...extraFields,
          email: inviteeEmail,
          ...this.buildAcceptedInviteData(hashedPassword, {}),
        },
      });

    // Log them in immediately
    const sessionToken = await issueAuthSessionToken({
      config,
      userId: user.id,
      email: inviteeEmail,
      collection: this.collection.slug,
      ip: c.get("clientIp"),
      authSource: "local",
    });

    // Send welcome email (best-effort)
    const { subject, html } = buildWelcomeEmail(config, {
      email: inviteeEmail,
    });
    sendEmail(config, { to: inviteeEmail, subject, html }).catch((err) =>
      getRequestLogger(c, "auth").error({
        err,
        msg: "Failed to send welcome email",
        email: inviteeEmail,
      }),
    );

    const safeUser = this.sanitizeUser(user);
    return c.json({ token: sessionToken, user: safeUser }, 201);
  }
}
