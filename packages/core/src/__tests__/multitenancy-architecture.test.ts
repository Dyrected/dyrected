import { beforeAll, describe, it, expect } from "vitest";
import { createDyrectedApp } from "../app.js";
import { defineConfig } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";
import { signCollectionToken } from "../auth/token.js";
import { createDyrectedAITools } from "../services/ai-tools.js";
import type { DyrectedConfig } from "../types/index.js";

describe("Dyrected Multi-Tenancy Architecture Test Suite", () => {
  beforeAll(() => {
    process.env.DYRECTED_JWT_SECRET = "test-jwt-secret-for-multitenancy-tests-12345";
  });

  async function authHeaders(userDoc: {
    id: string;
    email?: string;
    workspaceId?: string;
    allowedSites?: string[];
    roles?: string[];
  }) {
    const token = await signCollectionToken({
      sub: userDoc.id,
      email: userDoc.email || `${userDoc.id}@example.com`,
      collection: "users",
      workspaceId: userDoc.workspaceId,
      allowedSites: userDoc.allowedSites,
      roles: userDoc.roles,
    } as any);

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  // =========================================================================
  // Pattern 1: Row-Level Workspace Scoping
  // =========================================================================
  describe("Pattern 1: Row-Level Workspace Scoping (Shared Collections)", () => {
    const memoryDb = new InMemoryAdapter();

    const rowLevelConfig: any = defineConfig({
      db: memoryDb,
      collections: [
        {
          slug: "users",
          auth: true,
          fields: [
            { name: "email", type: "email" },
            { name: "workspaceId", type: "text" },
          ],
        },
        {
          slug: "projects",
          fields: [
            { name: "title", type: "text", required: true },
            { name: "workspaceId", type: "text", required: true },
            { name: "budget", type: "number" },
          ],
          access: {
            read: ({ user }: any) => {
              if (!user?.workspaceId) return false;
              return { workspaceId: { equals: user.workspaceId } };
            },
            update: ({ user }: any) => {
              if (!user?.workspaceId) return false;
              return { workspaceId: { equals: user.workspaceId } };
            },
            delete: ({ user }: any) => {
              if (!user?.workspaceId) return false;
              return { workspaceId: { equals: user.workspaceId } };
            },
          },
          hooks: {
            beforeChange: [
              ({ data, user }: any) => {
                if (user?.workspaceId) {
                  data.workspaceId = user.workspaceId;
                }
                return data;
              },
            ],
          },
        },
      ],
      globals: [],
    });

    // Seed users and projects
    memoryDb.seed("users", [
      { id: "u1", email: "u1@ws1.com", workspaceId: "ws-1" },
      { id: "u2", email: "u2@ws2.com", workspaceId: "ws-2" },
    ]);

    memoryDb.seed("projects", [
      { id: "p1-ws1", title: "Project Alpha", workspaceId: "ws-1", budget: 1000 },
      { id: "p2-ws1", title: "Project Beta", workspaceId: "ws-1", budget: 2000 },
      { id: "p3-ws2", title: "Project Gamma", workspaceId: "ws-2", budget: 5000 },
    ]);

    it("1.1 Core REST find scopes documents strictly to user's workspace", async () => {
      const app = await createDyrectedApp(rowLevelConfig);
      const headers = await authHeaders({ id: "u1", workspaceId: "ws-1" });

      const resWs1 = await app.request("/api/collections/projects", { headers });
      expect(resWs1.status).toBe(200);
      const dataWs1 = await resWs1.json();
      expect(dataWs1.docs).toHaveLength(2);
      expect(dataWs1.docs.map((d: any) => d.id)).toEqual(["p1-ws1", "p2-ws1"]);
    });

    it("1.2 Core REST findOne blocks reading another workspace's document", async () => {
      const app = await createDyrectedApp(rowLevelConfig);
      const headers = await authHeaders({ id: "u1", workspaceId: "ws-1" });

      const res = await app.request("/api/collections/projects/p3-ws2", { headers });
      expect(res.status).toBe(403);
    });

    it("1.3 Core REST create automatically stamps user workspaceId via hook", async () => {
      const app = await createDyrectedApp(rowLevelConfig);
      const headers = await authHeaders({ id: "u1", workspaceId: "ws-1" });

      const res = await app.request("/api/collections/projects", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "New Project Ws1", budget: 3500 }),
      });

      expect(res.status).toBe(201);
      const created = await res.json();
      expect(created.workspaceId).toBe("ws-1");
      expect(created.title).toBe("New Project Ws1");
    });

    it("1.4 AI Tools queryCollection respects row-level workspace constraints", async () => {
      const userWs1 = { id: "u1", workspaceId: "ws-1" } as any;
      const toolsWs1 = createDyrectedAITools({
        db: memoryDb as any,
        config: rowLevelConfig,
        user: userWs1,
        projectId: "default",
      });

      const result = await toolsWs1.queryCollection.execute({
        collection: "projects",
        limit: 10,
      });

      expect(result.docs.length).toBeGreaterThanOrEqual(2);
      expect(result.docs.every((d: any) => d.workspaceId === "ws-1")).toBe(true);
    });

    it("1.5 AI Tools getDocument prevents reading another workspace's document", async () => {
      const userWs1 = { id: "u1", workspaceId: "ws-1" } as any;
      const toolsWs1 = createDyrectedAITools({
        db: memoryDb as any,
        config: rowLevelConfig,
        user: userWs1,
        projectId: "default",
      });

      const result = await toolsWs1.getDocument.execute({
        collection: "projects",
        id: "p3-ws2", // Belonging to ws-2
      });

      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/not found/i);
    });

    it("1.6 AI Tools proposeUpdateDocument prevents updates to another workspace's document", async () => {
      const userWs1 = { id: "u1", workspaceId: "ws-1" } as any;
      const toolsWs1 = createDyrectedAITools({
        db: memoryDb as any,
        config: rowLevelConfig,
        user: userWs1,
        projectId: "default",
      });

      const result = await toolsWs1.proposeUpdateDocument.execute({
        collection: "projects",
        id: "p3-ws2",
        data: { budget: 99999 },
        summary: "Attempt unauthorized budget update",
      });

      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/not found|Access denied/i);
    });

    it("1.7 AI Tools aggregateCollection scopes computation strictly to user workspace", async () => {
      const userWs1 = { id: "u1", workspaceId: "ws-1" } as any;
      const toolsWs1 = createDyrectedAITools({
        db: memoryDb as any,
        config: rowLevelConfig,
        user: userWs1,
        projectId: "default",
      });

      const result = await toolsWs1.aggregateCollection.execute({
        collection: "projects",
        aggregates: {
          totalBudget: { sum: "budget" },
        },
      });

      // Budget for ws-1: 1000 + 2000 + 3500 = 6500 (does not include ws-2's 5000)
      expect(result.result.totalBudget).toBe(6500);
    });
  });

  // =========================================================================
  // Pattern 2: Header-Scoped Collections & Globals (X-Site-Id)
  // =========================================================================
  describe("Pattern 2: Header-Scoped Collections & Globals (X-Site-Id)", () => {
    const memoryDb = new InMemoryAdapter();

    const multiSiteConfig: any = defineConfig({
      db: memoryDb,
      collections: [
        {
          slug: "site-a-articles",
          siteId: "site-a",
          fields: [{ name: "title", type: "text", required: true }],
        },
        {
          slug: "site-b-articles",
          siteId: "site-b",
          fields: [{ name: "title", type: "text", required: true }],
        },
        {
          slug: "shared-faq",
          shared: true,
          fields: [{ name: "question", type: "text", required: true }],
        },
      ],
      globals: [
        {
          slug: "site-a-settings",
          siteId: "site-a",
          fields: [{ name: "siteTitle", type: "text" }],
        },
        {
          slug: "common-footer",
          shared: true,
          fields: [{ name: "copyright", type: "text" }],
        },
      ],
    });

    it("2.1 /api/schemas filters collections and globals according to X-Site-Id", async () => {
      const app = await createDyrectedApp(multiSiteConfig);

      const resSiteA = await app.request("/api/schemas", {
        headers: { "X-Site-Id": "site-a" },
      });
      expect(resSiteA.status).toBe(200);
      const schemaSiteA = await resSiteA.json();

      const colSlugsA = schemaSiteA.collections.map((c: any) => c.slug);
      expect(colSlugsA).toContain("site-a-articles");
      expect(colSlugsA).toContain("shared-faq");
      expect(colSlugsA).not.toContain("site-b-articles");

      const glbSlugsA = schemaSiteA.globals.map((g: any) => g.slug);
      expect(glbSlugsA).toContain("site-a-settings");
      expect(glbSlugsA).toContain("common-footer");

      // Query site-b
      const resSiteB = await app.request("/api/schemas", {
        headers: { "X-Site-Id": "site-b" },
      });
      const schemaSiteB = await resSiteB.json();
      const colSlugsB = schemaSiteB.collections.map((c: any) => c.slug);
      expect(colSlugsB).toContain("site-b-articles");
      expect(colSlugsB).toContain("shared-faq");
      expect(colSlugsB).not.toContain("site-a-articles");
    });

    it("2.2 Core REST rejects requests to another site's collection with 404", async () => {
      const app = await createDyrectedApp(multiSiteConfig);

      // Requesting site-b's collection with X-Site-Id: site-a
      const res = await app.request("/api/collections/site-b-articles", {
        headers: { "X-Site-Id": "site-a" },
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.message).toContain("not found in project");
    });

    it("2.3 Core REST allows access to site's own collection and shared collections", async () => {
      const app = await createDyrectedApp(multiSiteConfig);

      const resOwn = await app.request("/api/collections/site-a-articles", {
        headers: { "X-Site-Id": "site-a" },
      });
      expect(resOwn.status).toBe(200);

      const resShared = await app.request("/api/collections/shared-faq", {
        headers: { "X-Site-Id": "site-a" },
      });
      expect(resShared.status).toBe(200);
    });

    it("2.4 Core REST rejects requests to another site's global with 404", async () => {
      const app = await createDyrectedApp(multiSiteConfig);

      const res = await app.request("/api/globals/site-a-settings", {
        headers: { "X-Site-Id": "site-b" },
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.message).toContain("not found in project");
    });

    it("2.5 AI Tools only expose collections visible to current project", async () => {
      const toolsSiteA = createDyrectedAITools({
        db: memoryDb as any,
        config: multiSiteConfig,
        projectId: "site-a",
      });

      const listResult = await toolsSiteA.listCollections.execute();
      const slugs = listResult.collections.map((c: any) => c.slug);
      expect(slugs).toContain("site-a-articles");
      expect(slugs).toContain("shared-faq");
      expect(slugs).not.toContain("site-b-articles");

      // Querying site-b-articles should be blocked
      const queryResult = await toolsSiteA.queryCollection.execute({
        collection: "site-b-articles",
      });
      expect(queryResult.error).toMatch(/does not exist in this project|not found in project/i);

      // Proposing create in site-b-articles should be blocked
      const proposeResult = await toolsSiteA.proposeCreateDocument.execute({
        collection: "site-b-articles",
        data: { title: "Hacked Post" },
        summary: "Unauthorized post proposal",
      });
      expect(proposeResult.error).toMatch(/does not exist in this project|not found in project/i);
    });
  });

  // =========================================================================
  // Pattern 3: Dynamic Schemas via onSchemaFetch
  // =========================================================================
  describe("Pattern 3: Dynamic Schemas via onSchemaFetch", () => {
    const memoryDb = new InMemoryAdapter();

    const dynamicConfig: any = defineConfig({
      db: memoryDb,
      collections: [
        {
          slug: "core-users",
          fields: [{ name: "name", type: "text" }],
        },
      ],
      globals: [],
      onSchemaFetch: async (siteId: string) => {
        if (siteId === "tenant-enterprise") {
          return {
            collections: [
              {
                slug: "enterprise-audit-logs",
                fields: [{ name: "action", type: "text", required: true }],
              },
            ],
            globals: [
              {
                slug: "enterprise-branding",
                fields: [{ name: "logoUrl", type: "text" }],
              },
            ],
          };
        }
        return {};
      },
    });

    it("3.1 /api/schemas dynamically resolves tenant schema for authorized site", async () => {
      const app = await createDyrectedApp(dynamicConfig);

      const resEnterprise = await app.request("/api/schemas", {
        headers: { "X-Site-Id": "tenant-enterprise" },
      });
      expect(resEnterprise.status).toBe(200);
      const schemaEnterprise = await resEnterprise.json();
      const colSlugs = schemaEnterprise.collections.map((c: any) => c.slug);
      expect(colSlugs).toContain("core-users");
      expect(colSlugs).toContain("enterprise-audit-logs");

      // For standard tenant, enterprise collection should NOT appear
      const resStandard = await app.request("/api/schemas", {
        headers: { "X-Site-Id": "tenant-standard" },
      });
      const schemaStandard = await resStandard.json();
      const stdColSlugs = schemaStandard.collections.map((c: any) => c.slug);
      expect(stdColSlugs).toContain("core-users");
      expect(stdColSlugs).not.toContain("enterprise-audit-logs");
    });

    it("3.2 Dynamic REST routes dispatch tenant collection when site matches", async () => {
      const app = await createDyrectedApp(dynamicConfig);

      // Create document in dynamic tenant collection
      const createRes = await app.request("/api/collections/enterprise-audit-logs", {
        method: "POST",
        headers: {
          "X-Site-Id": "tenant-enterprise",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "user.login" }),
      });
      expect(createRes.status).toBe(201);
      const created = await createRes.json();
      expect(created.action).toBe("user.login");

      // Query from same tenant site succeeds
      const getRes = await app.request("/api/collections/enterprise-audit-logs", {
        headers: { "X-Site-Id": "tenant-enterprise" },
      });
      expect(getRes.status).toBe(200);

      // Query from another tenant returns 404
      const failRes = await app.request("/api/collections/enterprise-audit-logs", {
        headers: { "X-Site-Id": "tenant-standard" },
      });
      expect(failRes.status).toBe(404);
    });
  });

  // =========================================================================
  // Security & Anti-Spoofing Verification
  // =========================================================================
  describe("Security & Anti-Spoofing Verification", () => {
    const memoryDb = new InMemoryAdapter();

    const securityConfig: any = defineConfig({
      db: memoryDb,
      collections: [
        {
          slug: "users",
          auth: true,
          fields: [
            { name: "email", type: "email" },
            { name: "allowedSites", type: "json" },
          ],
        },
        {
          slug: "site-a-docs",
          siteId: "site-a",
          fields: [{ name: "title", type: "text" }],
        },
        {
          slug: "site-b-docs",
          siteId: "site-b",
          fields: [{ name: "title", type: "text" }],
        },
      ],
      globals: [],
    });

    memoryDb.seed("users", [
      { id: "u-site-a", email: "alice@site-a.com", allowedSites: ["site-a"] },
      { id: "admin-root", email: "admin@platform.com", roles: ["admin"] },
    ]);

    it("4.1 Rejects schema request with 403 when user attempts to spoof unauthorized site", async () => {
      const app = await createDyrectedApp(securityConfig);
      const headers = await authHeaders({
        id: "u-site-a",
        email: "alice@site-a.com",
        allowedSites: ["site-a"],
      });

      // Alice tries to request site-b schemas
      const res = await app.request("/api/schemas", {
        headers: {
          ...headers,
          "X-Site-Id": "site-b",
        },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain('Forbidden: User is not authorized to access site "site-b"');
    });

    it("4.2 Rejects collection request with 403 when user attempts to spoof unauthorized site", async () => {
      const app = await createDyrectedApp(securityConfig);
      const headers = await authHeaders({
        id: "u-site-a",
        email: "alice@site-a.com",
        allowedSites: ["site-a"],
      });

      const res = await app.request("/api/collections/site-b-docs", {
        headers: {
          ...headers,
          "X-Site-Id": "site-b",
        },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain('Forbidden: User is not authorized to access site "site-b"');
    });

    it("4.3 Rejects AI chat request with 403 when user attempts to spoof unauthorized site", async () => {
      const app = await createDyrectedApp(securityConfig);
      const headers = await authHeaders({
        id: "u-site-a",
        email: "alice@site-a.com",
        allowedSites: ["site-a"],
      });

      const res = await app.request("/api/ai/chat", {
        method: "POST",
        headers: {
          ...headers,
          "X-Site-Id": "site-b",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "List secret documents" }),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain('Forbidden: User is not authorized to access site "site-b"');
    });

    it("4.4 Allows unconstrained platform admin to access any site", async () => {
      const app = await createDyrectedApp(securityConfig);
      const headers = await authHeaders({
        id: "admin-root",
        email: "admin@platform.com",
        roles: ["admin"],
      });

      const resA = await app.request("/api/schemas", {
        headers: {
          ...headers,
          "X-Site-Id": "site-a",
        },
      });
      expect(resA.status).toBe(200);

      const resB = await app.request("/api/schemas", {
        headers: {
          ...headers,
          "X-Site-Id": "site-b",
        },
      });
      expect(resB.status).toBe(200);
    });
  });
});
