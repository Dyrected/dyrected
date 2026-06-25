import { describe, it, expect, beforeEach } from "vitest";
import { createDyrectedApp } from "../app.js";
import { defineConfig, defineCollection } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";
import { signCollectionToken } from "../auth/token.js";

describe("Preferences API Scopes", async () => {
  process.env.DYRECTED_JWT_SECRET = "my-test-secret-that-is-at-least-32-chars-long";

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

  const app = await createDyrectedApp(config);

  let editorToken: string;
  let adminToken: string;

  beforeEach(async () => {
    // Clear in-memory DB
    (db as any).store = {};

    // Seed users
    const editor = await db.create({
      collection: "users",
      data: { id: "user-editor", email: "editor@test.com", roles: ["editor"] },
    });

    const admin = await db.create({
      collection: "users",
      data: { id: "user-admin", email: "admin@test.com", roles: ["admin"] },
    });

    editorToken = await signCollectionToken({
      sub: editor.id,
      email: editor.email,
      collection: "users",
      roles: ["editor"],
    });

    adminToken = await signCollectionToken({
      sub: admin.id,
      email: admin.email,
      collection: "users",
      roles: ["admin"],
    });
  });

  it("should return null if no personal or global preference exists", async () => {
    const res = await app.request("/api/preferences/test-key", {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.value).toBeNull();
  });

  it("should set and get personal preference successfully", async () => {
    const putRes = await app.request("/api/preferences/test-key?scope=personal", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${editorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: ["fieldA", "fieldB"] }),
    });
    expect(putRes.status).toBe(200);

    const getRes = await app.request("/api/preferences/test-key", {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.value).toEqual(["fieldA", "fieldB"]);
  });

  it("should block non-admins from saving global preferences", async () => {
    const putRes = await app.request("/api/preferences/test-key?scope=global", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${editorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: ["fieldA", "fieldB"] }),
    });
    expect(putRes.status).toBe(403);
  });

  it("should allow admins to save global preferences and fallback for editors", async () => {
    const putRes = await app.request("/api/preferences/test-key?scope=global", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: ["fieldA", "fieldB"] }),
    });
    expect(putRes.status).toBe(200);

    // Editor should fall back to global preference
    const editorGetRes = await app.request("/api/preferences/test-key", {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    expect(editorGetRes.status).toBe(200);
    const editorData = await editorGetRes.json();
    expect(editorData.value).toEqual(["fieldA", "fieldB"]);
  });

  it("should allow retrieving only global preferences bypassing personal override when scope=global", async () => {
    // 1. Save global default
    await app.request("/api/preferences/test-key?scope=global", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: ["globalField"] }),
    });

    // 2. Editor overrides personally
    await app.request("/api/preferences/test-key?scope=personal", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${editorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: ["personalField"] }),
    });

    // 3. GET with scope=personal/default should return personal
    const resPersonal = await app.request("/api/preferences/test-key", {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    expect(await resPersonal.json()).toEqual({ key: "test-key", value: ["personalField"] });

    // 4. GET with scope=global should return global
    const resGlobal = await app.request("/api/preferences/test-key?scope=global", {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    expect(await resGlobal.json()).toEqual({ key: "test-key", value: ["globalField"] });
  });

  it("should support DELETE personal preference falling back to global", async () => {
    // Save global
    await app.request("/api/preferences/test-key?scope=global", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: ["globalField"] }),
    });

    // Save personal
    await app.request("/api/preferences/test-key?scope=personal", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${editorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: ["personalField"] }),
    });

    // Delete personal
    const delRes = await app.request("/api/preferences/test-key?scope=personal", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    expect(delRes.status).toBe(200);

    // Get (should fall back to global)
    const getRes = await app.request("/api/preferences/test-key", {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    expect(getRes.status).toBe(200);
    expect(await getRes.json()).toEqual({ key: "test-key", value: ["globalField"] });
  });
});
