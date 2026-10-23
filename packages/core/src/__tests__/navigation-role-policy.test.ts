import { describe, it, expect, beforeEach } from "vitest";
import { createDyrectedApp } from "../app.js";
import { defineConfig, defineCollection, defineGlobal, defineWorkspace, NAVIGATION_POLICY_KEY } from "../index.js";
import { applyNavigationRolePolicies, sanitizeNavigationLayout } from "../utils/navigation-policy.js";
import { InMemoryAdapter } from "./mocks.js";
import { signCollectionToken } from "../auth/token.js";

const hasRole = (role: string) => ({ user }: { user: any }) => (user?.roles ?? []).includes(role);

describe("Role menu policy", () => {
  process.env.DYRECTED_JWT_SECRET = "my-test-secret-that-is-at-least-32-chars-long";

  const db = new InMemoryAdapter();
  const config = defineConfig({
    collections: [
      defineCollection({
        slug: "users",
        auth: true,
        fields: [
          { name: "email", type: "email" },
          { name: "roles", type: "json" },
        ],
      }),
      defineCollection({ slug: "posts", fields: [{ name: "title", type: "text" }] }),
      defineCollection({ slug: "customers", fields: [{ name: "name", type: "text" }] }),
      defineCollection({ slug: "payroll", access: { read: hasRole("finance") }, fields: [{ name: "amount", type: "number" }] }),
    ],
    globals: [defineGlobal({ slug: "site", fields: [{ name: "title", type: "text" }] })],
    admin: {
      navigation: [
        defineWorkspace({ slug: "customer-search", label: "Customer Search", collection: "customers" }),
      ],
    },
    db,
  });

  let app: any;
  let admin: string;
  let external: string;
  let finance: string;

  const tokenFor = async (id: string, roles: string[]) => {
    await db.create({ collection: "users", data: { id, email: `${id}@corp.com`, roles } });
    return signCollectionToken({ sub: id, email: `${id}@corp.com`, collection: "users", roles });
  };
  const call = (path: string, token: string, init: RequestInit = {}) =>
    app.request(path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  const slugsOf = (tree: any) => [...tree.groups.flatMap((g: any) => g.items), ...tree.ungrouped].map((i: any) => i.slug);
  const navFor = async (token: string, qs = "") => (await call(`/api/admin/navigation${qs}`, token)).json();
  const putPolicy = (token: string, role: string, value: unknown) =>
    call(`/api/preferences/${encodeURIComponent(NAVIGATION_POLICY_KEY)}?scope=role&role=${role}`, token, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });

  beforeEach(async () => {
    (db as any).store = {};
    app = await createDyrectedApp(config);
    admin = await tokenFor("admin", ["admin"]);
    external = await tokenFor("external", ["external"]);
    finance = await tokenFor("finance", ["finance"]);
  });

  it("gives an unrestricted role its full access-pruned menu when no policy exists", async () => {
    const tree = await navFor(external);
    expect(tree.locked).toBeUndefined();
    expect(slugsOf(tree)).toEqual(expect.arrayContaining(["posts", "customer-search"]));
  });

  it("limits an enforced role to exactly the allowed items", async () => {
    const res = await putPolicy(admin, "external", { enforced: true, allowed: ["customer-search"] });
    expect(res.status).toBe(200);

    const tree = await navFor(external);
    expect(tree.locked).toBe(true);
    expect(slugsOf(tree)).toEqual(["customer-search"]);
  });

  it("does not affect other roles", async () => {
    await putPolicy(admin, "external", { enforced: true, allowed: ["customer-search"] });
    expect(slugsOf(await navFor(finance))).toEqual(expect.arrayContaining(["posts", "payroll"]));
  });

  it("never grants an item the role's access rules deny", async () => {
    await putPolicy(admin, "external", { enforced: true, allowed: ["customer-search", "payroll"] });
    expect(slugsOf(await navFor(external))).toEqual(["customer-search"]);
  });

  it("ignores a stored policy that is switched off", async () => {
    await putPolicy(admin, "external", { enforced: false, allowed: ["customer-search"] });
    const tree = await navFor(external);
    expect(tree.locked).toBeUndefined();
    expect(slugsOf(tree)).toContain("posts");
  });

  it("applies the policy layout order", async () => {
    await putPolicy(admin, "external", {
      enforced: true,
      allowed: ["posts", "customer-search"],
      layout: { _version: 1, itemOrder: {}, groupOrder: [], hidden: [], groups: [], items: [] },
    });
    expect(slugsOf(await navFor(external)).sort()).toEqual(["customer-search", "posts"]);
  });

  it("rejects policy writes from non-admins and malformed policies", async () => {
    expect((await putPolicy(external, "external", { enforced: true, allowed: ["posts"] })).status).toBe(403);
    expect((await putPolicy(admin, "external", { enforced: "yes" })).status).toBe(400);
    const personal = await call(`/api/preferences/${encodeURIComponent(NAVIGATION_POLICY_KEY)}?scope=personal`, admin, {
      method: "PUT",
      body: JSON.stringify({ value: { enforced: true, allowed: [] } }),
    });
    expect(personal.status).toBe(400);
  });

  it("lets a user with any unrestricted role keep the wider menu", async () => {
    await putPolicy(admin, "external", { enforced: true, allowed: ["customer-search"] });
    const both = await tokenFor("both", ["external", "finance"]);
    const tree = await navFor(both);
    expect(tree.locked).toBeUndefined();
    expect(slugsOf(tree)).toEqual(expect.arrayContaining(["posts", "payroll"]));
  });

  describe("view as role", () => {
    it("lets an admin preview the menu a role receives, with and without the policy", async () => {
      await putPolicy(admin, "external", { enforced: true, allowed: ["customer-search"] });
      expect(slugsOf(await navFor(admin, "?asRole=external"))).toEqual(["customer-search"]);
      expect(slugsOf(await navFor(admin, "?asRole=external&raw=true"))).toEqual(
        expect.arrayContaining(["posts", "customer-search"]),
      );
    });

    it("evaluates access rules as the previewed role", async () => {
      const raw = slugsOf(await navFor(admin, "?asRole=external&raw=true"));
      expect(raw).not.toContain("payroll");
      expect(slugsOf(await navFor(admin, "?asRole=finance&raw=true"))).toContain("payroll");
    });

    it("rejects previews from non-admins", async () => {
      expect((await call("/api/admin/navigation?asRole=finance", external)).status).toBe(403);
    });
  });

  describe("shared navigation defaults", () => {
    it("strips the publisher's pins and own items before storing a role default", async () => {
      const res = await call("/api/preferences/admin%3Anavigation?scope=role&role=external", admin, {
        method: "PUT",
        body: JSON.stringify({
          value: {
            _version: 1,
            hidden: ["posts"],
            pinned: [{ type: "collection", slug: "payroll" }],
            items: [{ slug: "my-secret-queue", collection: "payroll", label: "Mine" }],
          },
        }),
      });
      expect(res.status).toBe(200);
      const stored = (await res.json()).value;
      expect(stored.hidden).toEqual(["posts"]);
      expect(stored.pinned).toBeUndefined();
      expect(stored.items).toEqual([]);
    });
  });

  describe("pure helpers", () => {
    const tree = {
      groups: [
        {
          id: "g",
          name: "G",
          slug: "g",
          order: 1,
          items: [
            { id: "collection_a", type: "collection" as const, slug: "a", label: "A", order: 1, views: [] },
            { id: "collection_b", type: "collection" as const, slug: "b", label: "B", order: 2, views: [] },
          ],
        },
      ],
      ungrouped: [],
    };

    it("treats an empty policy list as unrestricted", () => {
      expect(applyNavigationRolePolicies(tree, [])).toBe(tree);
    });

    it("unions the allowed items of several enforced roles", () => {
      const p = (allowed: string[]) => ({ _version: 1, enforced: true, allowed });
      const out = applyNavigationRolePolicies(tree, [p(["a"]), p(["b"])]);
      expect(slugsOf(out)).toEqual(["a", "b"]);
      expect(out.locked).toBe(true);
    });

    it("sanitizeNavigationLayout keeps regrouped existing items only", () => {
      const out = sanitizeNavigationLayout(
        { _version: 1, items: [{ slug: "a", group: "X" }, { slug: "zzz" }] } as any,
        tree,
      );
      expect(out.items?.map((i) => i.slug)).toEqual(["a"]);
    });
  });
});
