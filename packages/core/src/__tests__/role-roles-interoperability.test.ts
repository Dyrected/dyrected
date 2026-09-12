import { beforeEach, describe, expect, it } from "vitest";
import { normalizeConfig } from "../utils/config.js";
import { isUserAdmin } from "../utils/admin-auth.js";
import { workflowCapabilities } from "../workflows.js";
import { createDyrectedApp } from "../app.js";
import { issueAuthSessionToken } from "../auth/sessions.js";
import jexl from "jexl";

describe("Role and Roles Interoperability", () => {
  beforeEach(() => {
    process.env.DYRECTED_JWT_SECRET = "test-secret-at-least-32-chars-long-abc-123";
  });
  describe("1. Schema field synthesis", () => {
    it("does not inject a redundant roles field when role (singular) is explicitly defined", () => {
      const config = normalizeConfig({
        collections: [
          {
            slug: "staff",
            auth: true,
            fields: [
              {
                name: "role",
                type: "select",
                label: "Role",
                options: ["admin", "editor", "viewer"],
              },
            ],
          },
        ],
        globals: [],
      });

      const staffCollection = config.collections.find((c) => c.slug === "staff");
      expect(staffCollection).toBeDefined();

      const fieldNames = staffCollection!.fields.map((f) => f.name);
      expect(fieldNames).toContain("role");
      expect(fieldNames).not.toContain("roles");
    });

    it("injects default roles field when neither role nor roles is defined", () => {
      const config = normalizeConfig({
        collections: [
          {
            slug: "members",
            auth: true,
            fields: [],
          },
        ],
        globals: [],
      });

      const memberCollection = config.collections.find((c) => c.slug === "members");
      expect(memberCollection).toBeDefined();

      const fieldNames = memberCollection!.fields.map((f) => f.name);
      expect(fieldNames).toContain("roles");
      expect(fieldNames).not.toContain("role");
    });
  });

  describe("2. User Admin and Workflow helpers with role vs roles", () => {
    it("isUserAdmin handles singular role string", () => {
      expect(isUserAdmin({ role: "admin" })).toBe(true);
      expect(isUserAdmin({ role: "super_admin" })).toBe(true);
      expect(isUserAdmin({ role: "viewer" })).toBe(false);
    });

    it("isUserAdmin handles plural roles array", () => {
      expect(isUserAdmin({ roles: ["admin"] })).toBe(true);
      expect(isUserAdmin({ roles: ["super_admin"] })).toBe(true);
      expect(isUserAdmin({ roles: ["viewer", "admin"] })).toBe(true);
      expect(isUserAdmin({ roles: ["viewer"] })).toBe(false);
    });

    it("workflowCapabilities resolves capabilities with singular role", () => {
      const workflow = {
        enabled: true,
        roles: [
          { role: "editor", capabilities: ["entry.edit", "entry.submit"] },
          { role: "reviewer", capabilities: ["entry.publish"] },
        ],
        transitions: [],
      };

      const capabilities = workflowCapabilities(workflow as any, {
        id: "1",
        email: "editor@test.com",
        role: "editor",
      } as any);

      expect(capabilities.has("entry.edit")).toBe(true);
      expect(capabilities.has("entry.submit")).toBe(true);
      expect(capabilities.has("entry.publish")).toBe(false);
    });

    it("workflowCapabilities resolves capabilities with plural roles array", () => {
      const workflow = {
        enabled: true,
        roles: [
          { role: "editor", capabilities: ["entry.edit", "entry.submit"] },
          { role: "reviewer", capabilities: ["entry.publish"] },
        ],
        transitions: [],
      };

      const capabilities = workflowCapabilities(workflow as any, {
        id: "1",
        email: "editor@test.com",
        roles: ["editor", "reviewer"],
      } as any);

      expect(capabilities.has("entry.edit")).toBe(true);
      expect(capabilities.has("entry.submit")).toBe(true);
      expect(capabilities.has("entry.publish")).toBe(true);
    });
  });

  describe("3. Jexl evaluation parity across role and roles", () => {
    it("evaluates both user.role == '...' and '...' in user.roles identically", () => {
      // Scenario A: User object originating from singular role record
      const userFromSingular = {
        id: "1",
        collection: "__admins",
        role: "ops",
        roles: ["ops"],
      };

      expect(jexl.evalSync("user.role == 'ops'", { user: userFromSingular })).toBe(true);
      expect(jexl.evalSync("'ops' in user.roles", { user: userFromSingular })).toBe(true);
      expect(jexl.evalSync("user.role == 'finance'", { user: userFromSingular })).toBe(false);
      expect(jexl.evalSync("'finance' in user.roles", { user: userFromSingular })).toBe(false);

      // Scenario B: User object originating from multi-role array
      const userFromPlural = {
        id: "2",
        collection: "__admins",
        role: "ops",
        roles: ["ops", "compliance"],
      };

      expect(jexl.evalSync("user.role == 'ops'", { user: userFromPlural })).toBe(true);
      expect(jexl.evalSync("'ops' in user.roles", { user: userFromPlural })).toBe(true);
      expect(jexl.evalSync("'compliance' in user.roles", { user: userFromPlural })).toBe(true);
      expect(jexl.evalSync("user.collection == '__admins'", { user: userFromPlural })).toBe(true);
    });
  });

  describe("4. End-to-End API Authentication and /me Hydration", () => {
    it("hydrates both role and roles and attaches collection on GET /me for a singular role collection", async () => {
      const memoryDbDocs: Record<string, any[]> = {
        staff: [
          {
            id: "user-1",
            email: "staff@example.com",
            role: "compliance",
          },
        ],
        __auth_sessions: [
          {
            id: "sess-1",
            userId: "user-1",
            collection: "staff",
            revokedAt: null,
            expiresAt: null,
          },
        ],
      };

      const mockDb: any = {
        find: async ({ collection }: any) => {
          const docs = memoryDbDocs[collection] || [];
          return { docs, total: docs.length };
        },
        findOne: async ({ collection, id }: any) => {
          const docs = memoryDbDocs[collection] || [];
          return docs.find((d) => d.id === id) || null;
        },
        create: async ({ collection, data }: any) => {
          const doc = { id: data.id || "id", ...data };
          (memoryDbDocs[collection] = memoryDbDocs[collection] || []).push(doc);
          return doc;
        },
        update: async ({ collection, id, data }: any) => {
          const doc = (memoryDbDocs[collection] || []).find((d) => d.id === id);
          if (doc) Object.assign(doc, data);
          return doc;
        },
      };

      const config = {
        db: mockDb,
        collections: [
          {
            slug: "staff",
            auth: true,
            fields: [
              {
                name: "role",
                type: "select",
                options: ["compliance", "ops"],
              },
            ],
          },
        ],
        globals: [],
      };

      const app = await createDyrectedApp(config);

      const token = await issueAuthSessionToken({
        config: config as any,
        userId: "user-1",
        email: "staff@example.com",
        collection: "staff",
      });

      const res = await app.fetch(
        new Request("http://localhost/api/collections/staff/me", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.id).toBe("user-1");
      expect(body.email).toBe("staff@example.com");
      expect(body.collection).toBe("staff");
      expect(body.role).toBe("compliance");
      expect(body.roles).toEqual(["compliance"]);
    });

    it("hydrates both role and roles on GET /me for a plural roles collection", async () => {
      const memoryDbDocs: Record<string, any[]> = {
        __admins: [
          {
            id: "admin-1",
            email: "admin@example.com",
            roles: ["super_admin", "finance"],
          },
        ],
        __auth_sessions: [
          {
            id: "sess-2",
            userId: "admin-1",
            collection: "__admins",
            revokedAt: null,
            expiresAt: null,
          },
        ],
      };

      const mockDb: any = {
        find: async ({ collection }: any) => {
          const docs = memoryDbDocs[collection] || [];
          return { docs, total: docs.length };
        },
        findOne: async ({ collection, id }: any) => {
          const docs = memoryDbDocs[collection] || [];
          return docs.find((d) => d.id === id) || null;
        },
        create: async ({ collection, data }: any) => {
          const doc = { id: data.id || "id", ...data };
          (memoryDbDocs[collection] = memoryDbDocs[collection] || []).push(doc);
          return doc;
        },
        update: async ({ collection, id, data }: any) => {
          const doc = (memoryDbDocs[collection] || []).find((d) => d.id === id);
          if (doc) Object.assign(doc, data);
          return doc;
        },
      };

      const config = {
        db: mockDb,
        collections: [
          {
            slug: "__admins",
            auth: true,
            fields: [
              {
                name: "roles",
                type: "select",
                options: ["super_admin", "finance"],
              },
            ],
          },
        ],
        globals: [],
      };

      const app = await createDyrectedApp(config);

      const token = await issueAuthSessionToken({
        config: config as any,
        userId: "admin-1",
        email: "admin@example.com",
        collection: "__admins",
      });

      const res = await app.fetch(
        new Request("http://localhost/api/collections/__admins/me", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.id).toBe("admin-1");
      expect(body.collection).toBe("__admins");
      expect(body.roles).toEqual(["super_admin", "finance"]);
      expect(body.role).toBe("super_admin");
    });
  });
});
