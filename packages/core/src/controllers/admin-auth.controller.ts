import { randomBytes } from "node:crypto";
import { TextEncoder } from "node:util";
import type { Context } from "hono";
import {
  SignJWT,
  createRemoteJWKSet,
  jwtVerify,
  decodeJwt,
  type JWTPayload,
} from "jose";
import type { DyrectedContext } from "../app.js";
import { signCollectionToken } from "../auth/token.js";
import { hashPassword } from "../auth/password.js";
import type {
  AdminAuthProvider,
  AdminAuthResolvedIdentity,
  CustomAdminAuthProvider,
  DyrectedConfig,
  OIDCAdminAuthProvider,
} from "../types/index.js";
import { getAdminAuthCollection, getPublicAdminAuthConfig } from "../utils/admin-auth.js";

interface AdminAuthStatePayload extends JWTPayload {
  providerId: string;
  returnTo: string;
  siteId?: string;
  nonce?: string;
}

export class AdminAuthController {
  constructor(private readonly config: DyrectedConfig) {}

  async providers(c: Context<DyrectedContext>) {
    const requestConfig = await this.getRequestConfig(c);
    return c.json(getPublicAdminAuthConfig(requestConfig.adminAuth, requestConfig.collections));
  }

  async start(c: Context<DyrectedContext>) {
    const requestConfig = await this.getRequestConfig(c);
    const provider = this.getProvider(requestConfig, c.req.param("provider"));
    if (!provider) {
      return c.json({ error: true, message: "Admin auth provider not found." }, 404);
    }

    const siteId = this.getSiteId(c);
    const returnTo = this.normalizeReturnTo(c.req.query("returnTo"), c);

    if (provider.type === "oidc") {
      const redirectUrl = await this.buildOidcStartUrl(
        provider,
        returnTo,
        siteId,
        new URL(c.req.url).origin,
      );
      return c.redirect(redirectUrl, 302);
    }

    if (!provider.startUrl) {
      return c.json({ error: true, message: "This provider does not expose a start URL." }, 400);
    }

    const url = this.buildCustomProviderStartUrl(provider.startUrl, new URL(c.req.url).origin);
    if (!url) {
      return c.json(
        {
          error: true,
          message: `Admin auth provider "${provider.id}" has an invalid start URL.`,
        },
        500,
      );
    }
    url.searchParams.set("returnTo", returnTo);
    if (siteId) url.searchParams.set("siteId", siteId);
    url.searchParams.set("provider", provider.id);
    return c.redirect(url.toString(), 302);
  }

  async callback(c: Context<DyrectedContext>) {
    const requestConfig = await this.getRequestConfig(c);
    const provider = this.getProvider(requestConfig, c.req.param("provider"));
    if (!provider) {
      return c.json({ error: true, message: "Admin auth provider not found." }, 404);
    }

    try {
      const exchange = await this.completeProviderAuth(requestConfig, provider, c);
      const redirectUrl = new URL(exchange.returnTo);
      redirectUrl.searchParams.set("dyrectedExternalToken", exchange.token);
      redirectUrl.searchParams.set("dyrectedAdminCollection", exchange.collectionSlug);
      return c.redirect(redirectUrl.toString(), 302);
    } catch (error) {
      const message = error instanceof Error ? error.message : "External authentication failed.";
      const fallback = this.normalizeReturnTo(c.req.query("returnTo"), c);
      const redirectUrl = new URL(fallback);
      redirectUrl.searchParams.set("dyrectedExternalError", message);
      return c.redirect(redirectUrl.toString(), 302);
    }
  }

  async exchange(c: Context<DyrectedContext>) {
    const requestConfig = await this.getRequestConfig(c);
    const provider = this.getProvider(requestConfig, c.req.param("provider"));
    if (!provider) {
      return c.json({ error: true, message: "Admin auth provider not found." }, 404);
    }

    try {
      const exchange = await this.completeProviderAuth(requestConfig, provider, c);
      return c.json({
        token: exchange.token,
        collectionSlug: exchange.collectionSlug,
        providerId: provider.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "External authentication failed.";
      const status = message === "Access denied for this site." ? 403 : 401;
      return c.json({ error: true, message }, status);
    }
  }

  async logout(c: Context<DyrectedContext>) {
    return c.json({ success: true, message: "Logged out. Discard your token." });
  }

  private getProvider(config: DyrectedConfig, id: string): AdminAuthProvider | undefined {
    if (config.adminAuth?.mode !== "external") return undefined;
    return config.adminAuth.providers.find((provider) => provider.id === id);
  }

  private async completeProviderAuth(
    requestConfig: DyrectedConfig,
    provider: AdminAuthProvider,
    c: Context<DyrectedContext>,
  ) {
    const resolved =
      provider.type === "oidc"
        ? await this.resolveOidcIdentity(provider, c)
        : await this.resolveCustomIdentity(provider, c);
    const identity = resolved.identity;

    const siteId = this.getSiteId(c);
    const adminCollection = getAdminAuthCollection(requestConfig);
    if (!adminCollection?.auth) {
      throw new Error("Admin auth collection is not configured.");
    }

    const db = c.get("config").db;
    if (!db) throw new Error("Database not configured.");

    let user =
      (await this.findUserByExternalIdentity(db, adminCollection.slug, provider.id, identity.sub)) ??
      (identity.email
        ? (
            await db.find({
              collection: adminCollection.slug,
              where: { email: identity.email },
              limit: 1,
            })
          ).docs[0]
        : null);

    const provisioningMode = requestConfig.adminAuth?.provisioningMode ?? "jit_plus_membership_management";
    const allowJitProvisioning =
      provisioningMode !== "preprovisioned_only" && provider.allowJitProvisioning !== false;

    if (!user && !allowJitProvisioning) {
      throw new Error("This account has not been provisioned for admin access.");
    }

    const access = await this.resolveAccess(requestConfig, identity, provider.id, siteId, c, user);
    if (!access.allowed) {
      throw new Error("Access denied for this site.");
    }

    if (!user && allowJitProvisioning) {
      user = await db.create({
        collection: adminCollection.slug,
        data: {
          ...(await this.buildUserData(identity, provider.id, access.roles, access.data)),
          password: await hashPassword(randomBytes(32).toString("hex")),
        },
      });
    } else if (user) {
      user = await db.update({
        collection: adminCollection.slug,
        id: user.id,
        data: await this.buildUserData(identity, provider.id, access.roles, access.data),
      });
    }

    if (!user?.email) {
      throw new Error("Authenticated admin user is missing an email address.");
    }

    const token = await signCollectionToken({
      sub: user.id,
      email: user.email,
      collection: adminCollection.slug,
      providerId: provider.id,
      authSource: "external",
    });

    return {
      token,
      collectionSlug: adminCollection.slug,
      returnTo: resolved.returnTo,
    };
  }

  private async resolveAccess(
    requestConfig: DyrectedConfig,
    identity: AdminAuthResolvedIdentity,
    providerId: string,
    siteId: string | undefined,
    c: Context<DyrectedContext>,
    user: any,
  ) {
    const resolved = await requestConfig.adminAuth?.resolveAccess?.({
      identity,
      providerId,
      siteId,
      workspaceId: c.get("workspaceId"),
      req: {
        method: c.req.method,
        path: c.req.path,
        url: c.req.url,
        headers: Object.fromEntries(c.req.raw.headers.entries()),
      },
      user,
    });

    if (resolved) return resolved;
    return { allowed: true, roles: identity.roles, data: {} };
  }

  private async buildUserData(
    identity: AdminAuthResolvedIdentity,
    providerId: string,
    roles?: string[],
    extraData?: Record<string, unknown>,
  ) {
    return {
      ...(identity.email ? { email: identity.email } : {}),
      ...(identity.name ? { name: identity.name } : {}),
      ...(roles ? { roles } : {}),
      ...(extraData ?? {}),
      authProvider: providerId,
      externalSubject: identity.sub,
      authSource: "external",
      lastLoginAt: new Date().toISOString(),
    };
  }

  private async findUserByExternalIdentity(
    db: NonNullable<DyrectedConfig["db"]>,
    collection: string,
    providerId: string,
    externalSubject: string,
  ) {
    const result = await db.find({
      collection,
      where: {
        authProvider: providerId,
        externalSubject,
      },
      limit: 1,
    });
    return result.docs[0] ?? null;
  }

  private getSiteId(c: Context<DyrectedContext>): string | undefined {
    return c.req.header("X-Site-Id") || c.get("siteId");
  }

  private async getRequestConfig(c: Context<DyrectedContext>): Promise<DyrectedConfig> {
    const siteId = this.getSiteId(c);
    if (!siteId || !this.config.onSchemaFetch) return this.config;

    const dynamic = await this.config.onSchemaFetch(siteId);
    return {
      ...this.config,
      ...(dynamic.admin ? { admin: { ...this.config.admin, ...dynamic.admin } } : {}),
      ...(dynamic.adminAuth
        ? { adminAuth: { ...this.config.adminAuth, ...dynamic.adminAuth } }
        : {}),
      collections: dynamic.collections ? [...this.config.collections, ...dynamic.collections] : this.config.collections,
      globals: dynamic.globals ? [...this.config.globals, ...dynamic.globals] : this.config.globals,
    };
  }

  private async buildOidcStartUrl(
    provider: OIDCAdminAuthProvider,
    returnTo: string,
    siteId?: string,
    origin?: string,
  ) {
    const discovery = await this.getOidcDiscovery(provider);
    const nonce = randomBytes(16).toString("hex");
    const state = await this.signState({
      providerId: provider.id,
      returnTo,
      siteId,
      nonce,
    });
    const url = new URL(provider.authorizationEndpoint || discovery.authorization_endpoint);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", provider.clientId);
    url.searchParams.set("redirect_uri", provider.redirectUri || this.defaultCallbackPath(provider.id, origin));
    url.searchParams.set("scope", (provider.scopes ?? ["openid", "profile", "email"]).join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    return url.toString();
  }

  private async resolveOidcIdentity(provider: OIDCAdminAuthProvider, c: Context<DyrectedContext>) {
    const code = c.req.query("code");
    const state = c.req.query("state");
    if (!code || !state) throw new Error("Missing OIDC callback parameters.");

    const parsedState = await this.verifyState(state, provider.id);
    const discovery = await this.getOidcDiscovery(provider);
    const redirectUri = provider.redirectUri || this.defaultCallbackPath(provider.id, new URL(c.req.url).origin);

    const tokenResponse = await fetch(provider.tokenEndpoint || discovery.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("OIDC token exchange failed.");
    }

    const tokenBody = await tokenResponse.json();
    const idToken = tokenBody.id_token as string | undefined;
    let claims: Record<string, unknown> = {};

    if (idToken) {
      const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));
      const { payload } = await jwtVerify(idToken, jwks, {
        issuer: provider.issuer,
        audience: provider.clientId,
      });
      if (parsedState.nonce && payload.nonce !== parsedState.nonce) {
        throw new Error("OIDC nonce verification failed.");
      }
      claims = payload as Record<string, unknown>;
    } else if (tokenBody.access_token && (provider.userInfoEndpoint || discovery.userinfo_endpoint)) {
      const userInfo = await fetch(provider.userInfoEndpoint || discovery.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${tokenBody.access_token}` },
      });
      if (!userInfo.ok) throw new Error("OIDC userinfo request failed.");
      claims = await userInfo.json();
    } else {
      throw new Error("OIDC provider did not return usable identity claims.");
    }

    return {
      identity: this.mapClaims(claims, provider.claimMapping),
      returnTo: parsedState.returnTo,
    };
  }

  private async resolveCustomIdentity(provider: CustomAdminAuthProvider, c: Context<DyrectedContext>) {
    const body = c.req.method === "POST" ? await c.req.json().catch(() => ({})) : {};
    const tokenParam = provider.tokenParam || "token";
    const token = (body?.[tokenParam] as string | undefined) || c.req.query(tokenParam);
    if (!token) {
      throw new Error(`Missing ${tokenParam} for external auth exchange.`);
    }

    let claims: JWTPayload;
    if (provider.secret) {
      const secret = new TextEncoder().encode(provider.secret);
      const verified = await jwtVerify(token, secret, {
        issuer: provider.issuer,
        audience: provider.audience,
      });
      claims = verified.payload;
    } else if (provider.jwksUri) {
      const jwks = createRemoteJWKSet(new URL(provider.jwksUri));
      const verified = await jwtVerify(token, jwks, {
        issuer: provider.issuer,
        audience: provider.audience,
      });
      claims = verified.payload;
    } else {
      claims = decodeJwt(token);
      if (provider.issuer && claims.iss !== provider.issuer) {
        throw new Error("External auth issuer mismatch.");
      }
      if (provider.audience) {
        const aud = claims.aud;
        const matches = Array.isArray(aud) ? aud.includes(provider.audience) : aud === provider.audience;
        if (!matches) throw new Error("External auth audience mismatch.");
      }
    }

    return {
      identity: this.mapClaims(claims as Record<string, unknown>, provider.claimMapping),
      returnTo: this.normalizeReturnTo(
        (body?.returnTo as string | undefined) || c.req.query("returnTo"),
        c,
      ),
    };
  }

  private mapClaims(
    claims: Record<string, unknown>,
    mapping?: OIDCAdminAuthProvider["claimMapping"],
  ): AdminAuthResolvedIdentity {
    const subKey = mapping?.sub || "sub";
    const emailKey = mapping?.email || "email";
    const nameKey = mapping?.name || "name";
    const rolesKey = mapping?.roles;
    const groupsKey = mapping?.groups;
    const siteIdsKey = mapping?.siteIds;
    const workspaceIdsKey = mapping?.workspaceIds;

    const sub = claims[subKey];
    if (typeof sub !== "string" || !sub) {
      throw new Error("External identity is missing a subject.");
    }

    return {
      sub,
      email: this.readStringClaim(claims[emailKey]),
      name: this.readStringClaim(claims[nameKey]),
      roles: this.readStringArrayClaim(rolesKey ? claims[rolesKey] : undefined),
      groups: this.readStringArrayClaim(groupsKey ? claims[groupsKey] : undefined),
      siteIds: this.readStringArrayClaim(siteIdsKey ? claims[siteIdsKey] : undefined),
      workspaceIds: this.readStringArrayClaim(workspaceIdsKey ? claims[workspaceIdsKey] : undefined),
      rawClaims: claims,
    };
  }

  private readStringClaim(value: unknown) {
    return typeof value === "string" ? value : undefined;
  }

  private readStringArrayClaim(value: unknown) {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === "string");
    }
    if (typeof value === "string") return [value];
    return undefined;
  }

  private async getOidcDiscovery(provider: OIDCAdminAuthProvider) {
    const discoveryUrl = new URL(
      provider.issuer.replace(/\/$/, "") + "/.well-known/openid-configuration",
    );
    const response = await fetch(discoveryUrl.toString());
    if (!response.ok) throw new Error("Failed to load OIDC discovery document.");
    return response.json() as Promise<{
      authorization_endpoint: string;
      token_endpoint: string;
      userinfo_endpoint?: string;
      jwks_uri: string;
    }>;
  }

  private defaultCallbackPath(providerId: string, origin = "") {
    return `${origin}/api/admin/auth/${providerId}/callback`;
  }

  private buildCustomProviderStartUrl(startUrl: string, origin: string): URL | null {
    const value = startUrl.trim();
    if (!value || /^(undefined|null)(\/|$)/i.test(value)) return null;

    try {
      const url = new URL(value, origin);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url;
    } catch {
      return null;
    }
  }

  private async signState(payload: Omit<AdminAuthStatePayload, "iat" | "exp">) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(this.getStateSecret());
  }

  private async verifyState(token: string, providerId: string) {
    const { payload } = await jwtVerify(token, this.getStateSecret());
    const state = payload as AdminAuthStatePayload;
    if (state.providerId !== providerId) {
      throw new Error("OIDC state verification failed.");
    }
    return state;
  }

  private getStateSecret() {
    const secret = process.env.DYRECTED_JWT_SECRET;
    if (!secret) {
      throw new Error("[dyrected/core] DYRECTED_JWT_SECRET is not set.");
    }
    return new TextEncoder().encode(secret);
  }

  private normalizeReturnTo(returnTo: string | undefined, c: Context<DyrectedContext>) {
    if (returnTo) return returnTo;
    const url = new URL(c.req.url);
    return `${url.origin}/admin`;
  }
}
