import { describe, expect, it, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { TextEncoder } from "node:util";
import { createDyrectedApp } from "../app.js";
import { defineCollection, defineConfig } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

const providerSecret = new TextEncoder().encode("provider-secret");

async function signProviderToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(providerSecret);
}

describe("external admin auth", () => {
  beforeEach(() => {
    process.env.DYRECTED_JWT_SECRET = "dyrected-test-secret";
  });

  it("exposes sanitized admin auth config in schemas", async () => {
    const app = await createDyrectedApp(
      defineConfig({
        collections: [
          defineCollection({
            slug: "__admins",
            auth: true,
            fields: [{ name: "name", type: "text", label: "Name" }],
          }),
        ],
        globals: [],
        db: new InMemoryAdapter(),
        adminAuth: {
          mode: "external",
          providers: [
            {
              id: "partner",
              type: "custom",
              displayName: "Partner SSO",
              secret: "provider-secret",
            },
          ],
        },
      }),
    );

    const res = await app.request("/api/schemas");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.adminAuth).toEqual({
      mode: "external",
      collectionSlug: undefined,
      provisioningMode: undefined,
      providers: [
        {
          id: "partner",
          type: "custom",
          displayName: "Partner SSO",
          autoRedirect: undefined,
        },
      ],
    });
  });

  it("supports JIT external provisioning for admin users", async () => {
    const db = new InMemoryAdapter();
    const app = await createDyrectedApp(
      defineConfig({
        collections: [
          defineCollection({
            slug: "__admins",
            auth: true,
            fields: [{ name: "name", type: "text", label: "Name" }],
          }),
        ],
        globals: [],
        db,
        adminAuth: {
          mode: "external",
          providers: [
            {
              id: "partner",
              type: "custom",
              displayName: "Partner SSO",
              secret: "provider-secret",
            },
          ],
          resolveAccess: ({ siteId }) => ({
            allowed: siteId === "site-a",
            roles: ["admin"],
          }),
        },
      }),
    );

    const providerToken = await signProviderToken({
      sub: "acct_123",
      email: "owner@example.com",
      name: "Owner",
    });

    const loginRes = await app.request("/api/admin/auth/partner/exchange", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-site-id": "site-a",
      },
      body: JSON.stringify({ token: providerToken }),
    });

    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.collectionSlug).toBe("__admins");
    expect(loginData.providerId).toBe("partner");

    const meRes = await app.request("/api/collections/__admins/me", {
      headers: {
        authorization: `Bearer ${loginData.token}`,
      },
    });

    expect(meRes.status).toBe(200);
    const me = await meRes.json();
    expect(me.email).toBe("owner@example.com");
    expect(me.authProvider).toBe("partner");
    expect(me.externalSubject).toBe("acct_123");

    const allAdmins = await db.find({ collection: "__admins", limit: 10 });
    expect(allAdmins.total).toBe(1);
    expect(allAdmins.docs[0].password).toBeTruthy();
  });

  it("rejects unknown external users when provisioning is preprovisioned-only", async () => {
    const app = await createDyrectedApp(
      defineConfig({
        collections: [
          defineCollection({
            slug: "__admins",
            auth: true,
            fields: [{ name: "name", type: "text", label: "Name" }],
          }),
        ],
        globals: [],
        db: new InMemoryAdapter(),
        adminAuth: {
          mode: "external",
          provisioningMode: "preprovisioned_only",
          providers: [
            {
              id: "partner",
              type: "custom",
              displayName: "Partner SSO",
              secret: "provider-secret",
            },
          ],
        },
      }),
    );

    const providerToken = await signProviderToken({
      sub: "acct_123",
      email: "owner@example.com",
    });

    const loginRes = await app.request("/api/admin/auth/partner/exchange", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ token: providerToken }),
    });

    expect(loginRes.status).toBe(401);
    expect(await loginRes.json()).toMatchObject({
      error: true,
      message: "This account has not been provisioned for admin access.",
    });
  });
});
