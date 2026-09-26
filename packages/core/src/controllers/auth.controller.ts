import type { Context } from "hono";
import { appendQueryParam, resolveActionUrl } from "../utils/admin-url.js";
import type { DyrectedContext } from "../app.js";
import type { CollectionConfig } from "../types/index.js";
import { getLockedUntilMs, resolveAuthLockoutConfig } from "../auth/lockout.js";
import { hashPassword, verifyPassword, hasUsablePassword } from "../auth/password.js";
import {
  resolveSessionTokenExpiry,
  resolveInviteTokenExpiry,
  resolveResetPasswordTokenExpiry,
  signCollectionToken,
  verifyCollectionToken,
} from "../auth/token.js";
import {
  issueAuthSessionToken,
  revokeAllAuthSessions,
  revokeAuthSession,
} from "../auth/sessions.js";
import {
  sendEmail,
  resolveEmailTemplate,
  toOutboundEmail,
} from "../services/email.service.js";
import { getRequestLogger } from "../observability.js";
import { getAdminRoleForCollection } from "../utils/admin-auth.js";

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

    const roles = Array.isArray(safeUser.roles)
      ? safeUser.roles
      : typeof safeUser.role === "string"
        ? [safeUser.role]
        : [];
    const role =
      typeof safeUser.role === "string" ? safeUser.role : roles[0];

    return {
      ...safeUser,
      collection:
        (safeUser.collection as string | undefined) || this.collection.slug,
      ...(role !== undefined ? { role } : {}),
      roles,
    };
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
      password: null,
      invitedAt: Date.now(),
    };

    if (this.hasField("status") && !data.status) {
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

    // 2. Create the user with resolved admin role
    let initialRole = getAdminRoleForCollection(this.collection);
    const rolesField = this.collection.fields?.find((f: any) => f.name === "roles");
    if (rolesField && Array.isArray((rolesField as any).options) && (rolesField as any).options.length > 0) {
      const optionValues = (rolesField as any).options.map((opt: any) =>
        typeof opt === "string" ? opt : opt?.value
      );
      if (!optionValues.includes(initialRole)) {
        if (optionValues.includes("super_admin")) {
          initialRole = "super_admin";
        } else if (optionValues.includes("admin")) {
          initialRole = "admin";
        } else {
          initialRole = optionValues[0];
        }
      }
    }

    const hasRoleField = this.collection.fields?.some((f) => f.name === "role");
    const hasRolesField = this.collection.fields?.some((f) => f.name === "roles");
    const rolePayload = hasRoleField && !hasRolesField
      ? { role: initialRole }
      : { roles: [initialRole] };

    const hashedPassword = await hashPassword(body.password);
    const user = await db.create({
      collection: this.collection.slug,
      data: {
        ...body,
        password: hashedPassword,
        ...rolePayload,
      },
    });

    const safeUser = this.sanitizeUser(user);

    // 3. Log them in immediately
    const token = await issueAuthSessionToken({
      config,
      userId: user.id,
      email: user.email,
      collection: this.collection.slug,
      expiresIn: resolveSessionTokenExpiry(this.collection),
      ip: c.get("clientIp"),
      authSource: "local",
    });

    // Send welcome email (best-effort — never block login)
    resolveEmailTemplate({
      config,
      collection: this.collection,
      purpose: "welcome",
      args: { email: body.email, user: safeUser },
      db,
    })
      .then((emailResult) =>
        sendEmail(
          config,
          toOutboundEmail(body.email, emailResult, {
            collection: this.collection.slug,
            purpose: "welcome",
            user: safeUser,
          }),
        ),
      )
      .catch((err) =>
        getRequestLogger(c, "auth").error({
          err,
          msg: "Failed to send welcome email",
          email: body.email,
        }),
      );

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

    if (!hasUsablePassword(user.password)) {
      return c.json(
        {
          error: true,
          code: "PASSWORD_NOT_SET",
          message:
            "This account does not have a password set. Please use the invite link or reset password.",
        },
        401,
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
      expiresIn: resolveSessionTokenExpiry(this.collection),
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
    return c.json({
      ...safeUser,
      collection: this.collection.slug,
    });
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
      const token = await signCollectionToken(
        {
          sub: requestUser.sub,
          email: requestUser.email,
          collection: this.collection.slug,
          sid: tokenPayload.sid,
        },
        resolveSessionTokenExpiry(this.collection),
      );

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

    let resetToken: string | undefined;
    let url: string | undefined;
    let emailSent = false;
    let emailError: string | undefined;

    if (user) {
      const siteId = c.get("siteId");
      resetToken = await signCollectionToken(
        {
          sub: String(user.id),
          email: user.email as string,
          collection: this.collection.slug,
          purpose: "reset",
          ...(siteId ? { siteId } : {}),
        },
        resolveResetPasswordTokenExpiry(this.collection),
      );

      const customResetUrl =
        body?.resetUrl ??
        (typeof this.collection.auth === "object"
          ? this.collection.auth.urls?.resetPassword
          : undefined);
      url = appendQueryParam(
        resolveActionUrl(c, config, customResetUrl),
        "token",
        resetToken,
      );

      if (body?.sendEmail !== false) {
        try {
          const emailResult = await resolveEmailTemplate({
            config,
            collection: this.collection,
            purpose: "resetPassword",
            args: {
              token: resetToken,
              url,
              user,
            },
            db,
          });
          await sendEmail(
            config,
            toOutboundEmail(user.email as string, emailResult, {
              collection: this.collection.slug,
              purpose: "resetPassword",
              user,
            }),
          );
          emailSent = true;
        } catch (err: any) {
          emailSent = false;
          emailError = err?.message ?? "Email delivery failed";
          getRequestLogger(c, "auth").error({
            err,
            msg: "Failed to send password reset email",
            email: user.email as string,
          });
        }
      }
    }

    return c.json({
      success: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
      ...(body?.sendEmail === false && resetToken
        ? { token: resetToken, resetUrl: url }
        : {}),
      emailSent,
      ...(emailError ? { emailError } : {}),
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

    const currentSiteId = c.get("siteId");
    if (payload.siteId && currentSiteId && payload.siteId !== currentSiteId) {
      return c.json(
        { error: true, code: "SITE_MISMATCH", message: "Token is not valid for this site." },
        403,
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
    resolveEmailTemplate({
      config,
      collection: this.collection,
      purpose: "passwordChanged",
      args: {
        email: payload.email,
        user: { id: payload.sub, email: payload.email },
      },
      db,
    })
      .then((emailResult) =>
        sendEmail(
          config,
          toOutboundEmail(payload.email, emailResult, {
            collection: this.collection.slug,
            purpose: "passwordChanged",
          }),
        ),
      )
      .catch((err) =>
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

    const {
      email,
      inviteUrl,
      sendEmail: shouldSendEmail,
      data: nestedData,
      ...topLevelFields
    } = body;
    const inviteData = {
      ...topLevelFields,
      ...(nestedData && typeof nestedData === "object" && !Array.isArray(nestedData)
        ? nestedData
        : {}),
    };

    // Prevent inviting an email that already has an active account with a set password.
    const existing = await db.find({
      collection: this.collection.slug,
      where: { email },
      limit: 1,
    });
    const existingUser = existing.docs[0] as Record<string, unknown> | undefined;
    const existingIsPending = existingUser?.status === "pending";

    if (existingUser && !existingIsPending && hasUsablePassword(existingUser.password)) {
      return c.json(
        {
          error: true,
          code: "USER_ALREADY_EXISTS",
          message:
            "An account with that email already exists and has a password set. Use forgot password if needed.",
        },
        409,
      );
    }

    const now = Date.now();
    let targetUser: Record<string, unknown>;

    if (!existingUser) {
      const pendingData = await this.buildPendingInviteData(email, inviteData);
      pendingData.invitedAt = now;
      targetUser = await db.create({
        collection: this.collection.slug,
        data: pendingData,
      });
    } else {
      const updateData: Record<string, unknown> = {
        ...inviteData,
        invitedAt: now,
      };
      if (this.hasField("status") && !existingUser.status) {
        updateData.status = "pending";
      }
      targetUser = await db.update({
        collection: this.collection.slug,
        id: String(existingUser.id),
        data: updateData,
      });
    }

    const siteId = c.get("siteId");
    const inviteToken = await signCollectionToken(
      {
        sub: email,
        email,
        collection: this.collection.slug,
        purpose: "invite",
        ...(siteId ? { siteId } : {}),
      },
      resolveInviteTokenExpiry(this.collection),
    );

    const customInviteUrl =
      inviteUrl ??
      (typeof this.collection.auth === "object"
        ? this.collection.auth.urls?.invite
        : undefined);
    const url = appendQueryParam(
      resolveActionUrl(c, config, customInviteUrl),
      "inviteToken",
      inviteToken,
    );

    let emailSent = false;
    let emailError: string | undefined;

    if (shouldSendEmail !== false) {
      try {
        const emailResult = await resolveEmailTemplate({
          config,
          collection: this.collection,
          purpose: "invite",
          args: {
            token: inviteToken,
            invitedByEmail: requestUser.email,
            url,
            data: inviteData,
            user: targetUser,
          },
          db,
        });
        await sendEmail(
          config,
          toOutboundEmail(email, emailResult, {
            collection: this.collection.slug,
            purpose: "invite",
            user: targetUser,
          }),
        );
        emailSent = true;
      } catch (err: any) {
        emailSent = false;
        emailError = err?.message ?? "Email delivery failed";
        getRequestLogger(c, "auth").error({
          err,
          msg: "Failed to send invite email",
          email,
        });
      }
    }

    return c.json({
      success: true,
      message: emailSent
        ? `Invite sent to ${email}.`
        : shouldSendEmail === false
          ? `Invite created for ${email}.`
          : `Invite created for ${email}, but email delivery failed.`,
      token: inviteToken,
      inviteUrl: url,
      emailSent,
      ...(emailError ? { emailError } : {}),
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

    const currentSiteId = c.get("siteId");
    if (payload.siteId && currentSiteId && payload.siteId !== currentSiteId) {
      return c.json(
        { error: true, code: "SITE_MISMATCH", message: "Token is not valid for this site." },
        403,
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

    if (existingUser && !existingIsPending && hasUsablePassword(existingUser.password)) {
      return c.json(
        {
          error: true,
          code: "INVITE_ALREADY_ACCEPTED",
          message:
            "This invitation has already been accepted. Please log in or use forgot password.",
        },
        409,
      );
    }

    if (
      existingUser &&
      payload.iat &&
      typeof existingUser.invitedAt === "number" &&
      payload.iat * 1000 < existingUser.invitedAt - 2000
    ) {
      return c.json(
        {
          error: true,
          code: "INVITE_SUPERSEDED",
          message:
            "This invitation link has been superseded by a newer invitation. Please use the latest link.",
        },
        400,
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
      expiresIn: resolveSessionTokenExpiry(this.collection),
      ip: c.get("clientIp"),
      authSource: "local",
    });

    const safeUser = this.sanitizeUser(user);

    // Send welcome email (best-effort)
    resolveEmailTemplate({
      config,
      collection: this.collection,
      purpose: "welcome",
      args: {
        email: inviteeEmail,
        user: safeUser,
      },
      db,
    })
      .then((emailResult) =>
        sendEmail(
          config,
          toOutboundEmail(inviteeEmail, emailResult, {
            collection: this.collection.slug,
            purpose: "welcome",
            user: safeUser,
          }),
        ),
      )
      .catch((err) =>
        getRequestLogger(c, "auth").error({
          err,
          msg: "Failed to send welcome email",
          email: inviteeEmail,
        }),
      );

    return c.json({ token: sessionToken, user: safeUser }, 201);
  }

  // ---------------------------------------------------------------------------
  // GET /tokens/verify?token=...&purpose=invite|reset
  // Public. Validates token signature, expiration, database existence, and state.
  // ---------------------------------------------------------------------------
  async verifyToken(c: Context<DyrectedContext>) {
    const db = c.get("config").db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const token = c.req.query("token");
    const purpose = c.req.query("purpose");

    if (!token) {
      return c.json(
        { valid: false, code: "TOKEN_REQUIRED", message: "Token is required." },
        400,
      );
    }

    let payload: any;
    try {
      payload = await verifyCollectionToken(token);
    } catch {
      return c.json(
        {
          valid: false,
          code: "TOKEN_EXPIRED_OR_INVALID",
          message: "Token is invalid or has expired.",
        },
        200,
      );
    }

    if (payload.collection !== this.collection.slug) {
      return c.json(
        {
          valid: false,
          code: "COLLECTION_MISMATCH",
          message: "Token does not belong to this collection.",
        },
        200,
      );
    }

    if (purpose && payload.purpose !== purpose) {
      return c.json(
        {
          valid: false,
          code: "PURPOSE_MISMATCH",
          message: `Token was issued for '${payload.purpose}', not '${purpose}'.`,
        },
        200,
      );
    }

    const currentSiteId = c.get("siteId");
    if (payload.siteId && currentSiteId && payload.siteId !== currentSiteId) {
      return c.json(
        {
          valid: false,
          code: "SITE_MISMATCH",
          message: "Token is not valid for this site.",
        },
        200,
      );
    }

    if (payload.purpose === "invite") {
      const result = await db.find({
        collection: this.collection.slug,
        where: { email: payload.email ?? payload.sub },
        limit: 1,
      });
      const user = result.docs[0] as Record<string, unknown> | undefined;

      if (!user) {
        return c.json(
          {
            valid: false,
            code: "USER_NOT_FOUND",
            message: "Invited account was not found.",
          },
          200,
        );
      }

      if (user._deleted || user.deletedAt) {
        return c.json(
          {
            valid: false,
            code: "USER_DELETED",
            message: "Account has been deleted.",
          },
          200,
        );
      }

      if (user.status !== "pending" && hasUsablePassword(user.password)) {
        return c.json(
          {
            valid: false,
            code: "INVITE_ALREADY_ACCEPTED",
            message: "This invitation has already been accepted.",
          },
          200,
        );
      }

      if (
        payload.iat &&
        typeof user.invitedAt === "number" &&
        payload.iat * 1000 < user.invitedAt - 2000
      ) {
        return c.json(
          {
            valid: false,
            code: "INVITE_SUPERSEDED",
            message: "This invitation link has been superseded by a newer one.",
          },
          200,
        );
      }

      return c.json({
        valid: true,
        email: user.email,
        collection: this.collection.slug,
      });
    }

    if (payload.purpose === "reset") {
      const result = await db.find({
        collection: this.collection.slug,
        where: { id: payload.sub },
        limit: 1,
      });
      const user = result.docs[0] as Record<string, unknown> | undefined;

      if (!user || user._deleted || user.deletedAt) {
        return c.json(
          {
            valid: false,
            code: "USER_NOT_FOUND",
            message: "Account was not found.",
          },
          200,
        );
      }

      return c.json({
        valid: true,
        email: user.email,
        collection: this.collection.slug,
      });
    }

    return c.json({
      valid: true,
      email: payload.email,
      collection: this.collection.slug,
    });
  }
}
