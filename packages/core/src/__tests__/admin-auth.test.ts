import { describe, expect, it, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { TextEncoder } from "node:util";
import { Hono } from "hono";
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
      collectionSlug: "__admins",
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

  it("starts a provider from dynamic site admin auth config", async () => {
    const app = await createDyrectedApp(
      defineConfig({
        collections: [],
        globals: [],
        db: new InMemoryAdapter(),
        onSchemaFetch: async (siteId) => ({
          collections: [
            defineCollection({
              slug: "__admins",
              auth: true,
              siteId,
              fields: [{ name: "name", type: "text", label: "Name" }],
            }),
          ],
          adminAuth: {
            mode: "external",
            providers: [
              {
                id: "cloud",
                type: "cloud",
                displayName: "Dyrected Cloud",
                startUrl: "https://dashboard.test/cloud/auth/admin/start",
                secret: "provider-secret",
              },
            ],
          },
        }),
      }),
    );

    const host = new Hono();
    host.use("/sites/:siteId/*", async (c, next) => {
      c.set("siteId", c.req.param("siteId"));
      await next();
    });
    host.route("/sites/:siteId", app);

    const res = await host.request(
      "/sites/site-a/api/admin/auth/cloud/start?returnTo=http%3A%2F%2Flocalhost%3A3000%2Fadmin",
    );

    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location")!);
    expect(location.origin).toBe("https://dashboard.test");
    expect(location.pathname).toBe("/cloud/auth/admin/start");
    expect(location.searchParams.get("siteId")).toBe("site-a");
    expect(location.searchParams.get("provider")).toBe("cloud");
    expect(location.searchParams.get("returnTo")).toBe("http://localhost:3000/admin");
  });

  it("starts a provider with a relative start URL", async () => {
    const app = await createDyrectedApp(
      defineConfig({
        collections: [],
        globals: [],
        db: new InMemoryAdapter(),
        adminAuth: {
          mode: "external",
          providers: [
            {
              id: "cloud",
              type: "cloud",
              displayName: "Dyrected Cloud",
              startUrl: "/cloud/auth/admin/start",
              secret: "provider-secret",
            },
          ],
        },
      }),
    );

    const res = await app.request(
      "https://dashboard.test/api/admin/auth/cloud/start?returnTo=http%3A%2F%2Flocalhost%3A3000%2Fadmin",
    );

    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location")!);
    expect(location.origin).toBe("https://dashboard.test");
    expect(location.pathname).toBe("/cloud/auth/admin/start");
    expect(location.searchParams.get("provider")).toBe("cloud");
    expect(location.searchParams.get("returnTo")).toBe("http://localhost:3000/admin");
  });

  it("returns a configuration error for unresolved provider start URLs", async () => {
    const app = await createDyrectedApp(
      defineConfig({
        collections: [],
        globals: [],
        db: new InMemoryAdapter(),
        adminAuth: {
          mode: "external",
          providers: [
            {
              id: "cloud",
              type: "cloud",
              displayName: "Dyrected Cloud",
              startUrl: "undefined/cloud/auth/admin/start",
              secret: "provider-secret",
            },
          ],
        },
      }),
    );

    const res = await app.request("/api/admin/auth/cloud/start");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: true,
      message: 'Admin auth provider "cloud" has an invalid start URL.',
    });
  });

  it("exchanges a token against dynamic site admin auth config", async () => {
    const db = new InMemoryAdapter();
    const app = await createDyrectedApp(
      defineConfig({
        collections: [],
        globals: [],
        db,
        onSchemaFetch: async (siteId) => ({
          collections: [
            defineCollection({
              slug: "__admins",
              auth: true,
              siteId,
              fields: [{ name: "name", type: "text", label: "Name" }],
            }),
          ],
          adminAuth: {
            mode: "external",
            providers: [
              {
                id: "cloud",
                type: "cloud",
                displayName: "Dyrected Cloud",
                secret: "provider-secret",
              },
            ],
            resolveAccess: ({ siteId: resolvedSiteId }) => ({
              allowed: resolvedSiteId === "site-a",
              roles: ["admin"],
            }),
          },
        }),
      }),
    );

    const providerToken = await signProviderToken({
      sub: "acct_123",
      email: "owner@example.com",
      name: "Owner",
    });

    const loginRes = await app.request("/api/admin/auth/cloud/exchange", {
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
    expect(loginData.providerId).toBe("cloud");

    const allAdmins = await db.find({ collection: "__admins", limit: 10 });
    expect(allAdmins.total).toBe(1);
    expect(allAdmins.docs[0].email).toBe("owner@example.com");
    expect(allAdmins.docs[0].authProvider).toBe("cloud");
  });

  it("prefers __admins over a stale configured adminAuth collection slug", async () => {
    const db = new InMemoryAdapter();
    const app = await createDyrectedApp(
      defineConfig({
        collections: [],
        globals: [],
        db,
        onSchemaFetch: async (siteId) => ({
          collections: [
            defineCollection({
              slug: "__admins",
              auth: true,
              siteId,
              fields: [{ name: "name", type: "text", label: "Name" }],
            }),
            defineCollection({
              slug: "accounts",
              auth: true,
              siteId,
              fields: [{ name: "name", type: "text", label: "Name" }],
            }),
          ],
          adminAuth: {
            mode: "external",
            collectionSlug: "accounts",
            providers: [
              {
                id: "cloud",
                type: "cloud",
                displayName: "Dyrected Cloud",
                secret: "provider-secret",
              },
            ],
            resolveAccess: ({ siteId: resolvedSiteId }) => ({
              allowed: resolvedSiteId === "site-a",
              roles: ["admin"],
            }),
          },
        }),
      }),
    );

    const schemasRes = await app.request("/api/schemas", {
      headers: {
        "x-site-id": "site-a",
      },
    });
    const schemasData = await schemasRes.json();

    expect(schemasRes.status).toBe(200);
    expect(schemasData.adminAuth).toMatchObject({
      mode: "external",
      collectionSlug: "__admins",
    });

    const providerToken = await signProviderToken({
      sub: "acct_123",
      email: "owner@example.com",
      name: "Owner",
    });

    const loginRes = await app.request("/api/admin/auth/cloud/exchange", {
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

    const allAdmins = await db.find({ collection: "__admins", limit: 10 });
    expect(allAdmins.total).toBe(1);
    expect(allAdmins.docs[0].email).toBe("owner@example.com");
  });

  it("passes a normalized hook request context to delegated provider member handlers", async () => {
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
          collectionSlug: "__admins",
          providers: [
            {
              id: "cloud",
              type: "cloud",
              displayName: "Dyrected Cloud",
              secret: "provider-secret",
              members: {
                list: async ({ req, limit, page, sort, where }) => {
                  expect(req.headers["x-site-id"]).toBe("site-a");
                  expect(req.query.limit).toBe("2");
                  expect(req.query.page).toBe("3");
                  expect(req.query.sort).toBe("-email");
                  expect(req.query.where).toBe(JSON.stringify({ email: { equals: "owner@example.com" } }));
                  expect(req.raw?.headers.get("x-site-id")).toBe("site-a");
                  expect(limit).toBe(2);
                  expect(page).toBe(3);
                  expect(sort).toBe("-email");
                  expect(where).toEqual({ email: { equals: "owner@example.com" } });

                  return {
                    docs: [{ id: "acct_123", email: "owner@example.com", roles: ["admin"] }],
                    totalDocs: 1,
                    limit: limit ?? 10,
                    page: page ?? 1,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                  };
                },
              },
            },
          ],
        },
      }),
    );

    const res = await app.request(
      `/api/collections/__admins?limit=2&page=3&sort=-email&where=${encodeURIComponent(JSON.stringify({ email: { equals: "owner@example.com" } }))}`,
      {
        headers: {
          "x-site-id": "site-a",
        },
      },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.docs).toHaveLength(1);
    expect(data.docs[0]).toMatchObject({
      id: "acct_123",
      email: "owner@example.com",
      externalSubject: "acct_123",
    });
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
