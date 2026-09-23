import { describe, it, expect, beforeEach } from "vitest";
import { createDyrectedApp } from "../app.js";
import { defineConfig, defineCollection } from "../index.js";
import { normalizeConfig } from "../utils/config.js";
import { InMemoryAdapter } from "./mocks.js";
import { signCollectionToken } from "../auth/token.js";

describe("Cascading Preferences and Promotion", () => {
  process.env.DYRECTED_JWT_SECRET = "my-test-secret-that-is-at-least-32-chars-long";

  it("should automatically inject __preferences field with promoted: true and hidden: true in auth collections", () => {
    const rawConfig = defineConfig({
      collections: [
        defineCollection({
          slug: "staff",
          auth: true,
          fields: [
            { name: "department", type: "text", label: "Department" },
          ],
        }),
      ],
      globals: [],
    });

    const normalized = normalizeConfig(rawConfig as any);
    const staffCol = normalized.collections?.find((c) => c.slug === "staff");
    expect(staffCol).toBeDefined();

    const prefField = staffCol?.fields.find((f) => f.name === "__preferences");
    expect(prefField).toBeDefined();
    expect(prefField?.type).toBe("json");
    expect(prefField?.promoted).toBe(true);
    expect(prefField?.admin?.hidden).toBe(true);
    expect(prefField?.admin?.readOnly).toBe(true);
  });

  describe("3-Tier Cascading Waterfall (Personal -> Role -> Global -> null)", () => {
    const db = new InMemoryAdapter();

    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "users",
          auth: true,
          fields: [
            { name: "email", type: "email", label: "Email" },
            { name: "roles", type: "json", label: "Roles" },
          ],
        }),
      ],
      globals: [],
      db,
    });

    let app: any;
    let adminToken: string;
    let managerToken: string;
    let staffToken: string;

    beforeEach(async () => {
      (db as any).store = {};
      app = await createDyrectedApp(config);

      const adminUser = await db.create({
        collection: "users",
        data: { id: "u-admin", email: "admin@corp.com", roles: ["admin"] },
      });
      const managerUser = await db.create({
        collection: "users",
        data: { id: "u-manager", email: "mgr@corp.com", roles: ["manager"] },
      });
      const staffUser = await db.create({
        collection: "users",
        data: { id: "u-staff", email: "staff@corp.com", roles: ["staff"] },
      });

      adminToken = await signCollectionToken({
        sub: adminUser.id,
        email: adminUser.email,
        collection: "users",
        roles: ["admin"],
      });
      managerToken = await signCollectionToken({
        sub: managerUser.id,
        email: managerUser.email,
        collection: "users",
        roles: ["manager"],
      });
      staffToken = await signCollectionToken({
        sub: staffUser.id,
        email: staffUser.email,
        collection: "users",
        roles: ["staff"],
      });
    });

    it("should cascade from global default when no personal or role preference exists", async () => {
      // 1. Set global preference as admin
      const putRes = await app.request("/api/preferences/sidebar_nav?scope=global", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: { collapsed: false } }),
      });
      expect(putRes.status).toBe(200);

      // 2. Fetch as manager (no manager role default or personal setting yet)
      const res = await app.request("/api/preferences/sidebar_nav", {
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        key: "sidebar_nav",
        value: { collapsed: false },
      });
    });

    it("should allow role default to override global default", async () => {
      // 1. Set global default
      await app.request("/api/preferences/sidebar_nav?scope=global", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: { collapsed: false } }),
      });

      // 2. Admin sets role default for 'manager'
      const rolePut = await app.request("/api/preferences/sidebar_nav?scope=role&role=manager", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: { collapsed: true, density: "compact" } }),
      });
      expect(rolePut.status).toBe(200);

      // 3. Manager user fetches: should receive manager role default
      const mgrRes = await app.request("/api/preferences/sidebar_nav", {
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      const mgrData = await mgrRes.json();
      expect(mgrData.value).toEqual({ collapsed: true, density: "compact" });

      // 4. Staff user fetches: should still fall back to global default
      const staffRes = await app.request("/api/preferences/sidebar_nav", {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const staffData = await staffRes.json();
      expect(staffData.value).toEqual({ collapsed: false });
    });

    it("should allow personal preference to override both role and global defaults", async () => {
      // 1. Set global default
      await app.request("/api/preferences/sidebar_nav?scope=global", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: "global_val" }),
      });

      // 2. Set manager role default
      await app.request("/api/preferences/sidebar_nav?scope=role&role=manager", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: "manager_role_val" }),
      });

      // 3. Manager sets personal preference
      const personalPut = await app.request("/api/preferences/sidebar_nav?scope=personal", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${managerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: "my_personal_val" }),
      });
      expect(personalPut.status).toBe(200);

      // 4. Manager fetches: personal overrides role & global
      const mgrRes = await app.request("/api/preferences/sidebar_nav", {
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      const mgrData = await mgrRes.json();
      expect(mgrData.value).toBe("my_personal_val");

      // 5. Manager deletes personal preference: should fall back to manager role default
      const delRes = await app.request("/api/preferences/sidebar_nav?scope=personal", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      expect(delRes.status).toBe(200);

      const mgrResAfterDel = await app.request("/api/preferences/sidebar_nav", {
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      const mgrDataAfterDel = await mgrResAfterDel.json();
      expect(mgrDataAfterDel.value).toBe("manager_role_val");
    });

    it("should enforce admin RBAC on role and global saves/deletions", async () => {
      // Non-admin attempting to save role preference -> 403
      const nonAdminRolePut = await app.request("/api/preferences/nav?scope=role&role=manager", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${managerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: "hacked" }),
      });
      expect(nonAdminRolePut.status).toBe(403);

      // Non-admin attempting to delete role preference -> 403
      const nonAdminRoleDel = await app.request("/api/preferences/nav?scope=role&role=manager", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      expect(nonAdminRoleDel.status).toBe(403);

      // Missing role parameter when saving role preference -> 400
      const missingRolePut = await app.request("/api/preferences/nav?scope=role", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: "test" }),
      });
      expect(missingRolePut.status).toBe(400);
    });
  });
});
