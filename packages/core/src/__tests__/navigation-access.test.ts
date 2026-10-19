import { describe, it, expect, beforeEach } from "vitest";
import { createDyrectedApp } from "../app.js";
import {
  defineConfig,
  defineCollection,
  defineGlobal,
  defineWorkspace,
  defineView,
  definePage,
} from "../index.js";
import { InMemoryAdapter } from "./mocks.js";
import { signCollectionToken } from "../auth/token.js";

const hasRole = (role: string) => ({ user }: { user: any }) => (user?.roles ?? []).includes(role);

describe("Navigation access enforcement", () => {
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
      // Function rule.
      defineCollection({
        slug: "payroll",
        access: { read: hasRole("finance") },
        fields: [{ name: "amount", type: "number" }],
      }),
      // Jexl string rule.
      defineCollection({
        slug: "drafts",
        access: { read: "'editor' in user.roles" },
        fields: [{ name: "body", type: "text" }],
      }),
      // Row-level rule: returns a where constraint, so the collection stays visible.
      defineCollection({
        slug: "tasks",
        access: { read: ({ user }: { user: any }) => ({ owner: { equals: user?.sub } }) },
        fields: [{ name: "owner", type: "text" }],
      }),
      // Static denial.
      defineCollection({
        slug: "vault",
        access: { read: false },
        fields: [{ name: "secret", type: "text" }],
      }),
      // Rule that throws must fail closed.
      defineCollection({
        slug: "flaky",
        access: {
          read: () => {
            throw new Error("boom");
          },
        },
        fields: [{ name: "x", type: "text" }],
      }),
      // Collections that back a workspace are listed through it, not on their own.
      defineCollection({ slug: "audit", fields: [{ name: "event", type: "text" }] }),
      defineCollection({ slug: "ledger", fields: [{ name: "entry", type: "text" }] }),
      defineCollection({
        slug: "reports",
        fields: [{ name: "name", type: "text" }],
        views: [
          defineView({
            slug: "all",
            label: "All",
            actions: [
              {
                name: "archive",
                label: "Archive",
                type: "row",
                access: { update: hasRole("exec") },
                handler: async () => ({ success: true }),
              } as any,
            ],
          }),
          defineView({ slug: "exec", label: "Exec", access: { read: hasRole("exec") } }),
        ],
        actions: [
          {
            name: "approve",
            label: "Approve",
            type: "row",
            access: { update: hasRole("exec") },
            handler: async () => ({ success: true }),
          } as any,
        ],
      }),
    ],
    globals: [
      defineGlobal({ slug: "site", fields: [{ name: "title", type: "text" }] }),
      defineGlobal({
        slug: "billing",
        access: { read: hasRole("finance") },
        fields: [{ name: "plan", type: "text" }],
      }),
    ],
    admin: {
      navigation: [
        definePage({ slug: "ops-board", label: "Ops board", access: { read: hasRole("ops") } } as any),
        definePage({ slug: "welcome", label: "Welcome" } as any),
        defineWorkspace({
          slug: "admin-desk",
          label: "Admin desk",
          collection: "audit",
          access: ["admin"],
          badge: { count: true },
        }),
        defineWorkspace({
          slug: "exec-only",
          label: "Exec only",
          collection: "ledger",
          views: [
            defineView({
              collection: "ledger",
              slug: "board",
              label: "Board",
              access: { read: hasRole("exec") },
            }),
          ],
        }),
      ],
    },
    db,
  });

  let app: any;

  const tokenFor = async (id: string, roles: string[]) => {
    await db.create({ collection: "users", data: { id, email: `${id}@corp.com`, roles } });
    return signCollectionToken({ sub: id, email: `${id}@corp.com`, collection: "users", roles });
  };

  const get = (path: string, token?: string) =>
    app.request(path, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);

  const navSlugs = async (token: string) => {
    const res = await get("/api/admin/navigation", token);
    expect(res.status).toBe(200);
    const tree = await res.json();
    return [...tree.groups.flatMap((g: any) => g.items), ...tree.ungrouped].map((i: any) => i.slug);
  };

  let viewer: string;
  let finance: string;
  let editor: string;
  let exec: string;
  let admin: string;
  let ops: string;

  beforeEach(async () => {
    (db as any).store = {};
    app = await createDyrectedApp(config);
    viewer = await tokenFor("viewer", ["viewer"]);
    finance = await tokenFor("finance", ["finance"]);
    editor = await tokenFor("editor", ["editor"]);
    exec = await tokenFor("exec", ["exec"]);
    admin = await tokenFor("admin", ["admin"]);
    ops = await tokenFor("ops", ["ops"]);
  });

  describe("GET /api/admin/navigation", () => {
    it("hides items guarded by function, Jexl and static rules from a plain viewer", async () => {
      const slugs = await navSlugs(viewer);
      expect(slugs).toContain("posts");
      expect(slugs).toContain("site");
      expect(slugs).not.toContain("payroll");
      expect(slugs).not.toContain("drafts");
      expect(slugs).not.toContain("vault");
      expect(slugs).not.toContain("billing");
    });

    it("shows each guarded item only to the role that satisfies the rule", async () => {
      expect(await navSlugs(finance)).toEqual(expect.arrayContaining(["payroll", "billing"]));
      expect(await navSlugs(editor)).toContain("drafts");
      expect(await navSlugs(editor)).not.toContain("payroll");
    });

    it("keeps collections whose read rule returns a row-level constraint", async () => {
      expect(await navSlugs(viewer)).toContain("tasks");
    });

    it("fails closed when a rule throws", async () => {
      expect(await navSlugs(admin)).not.toContain("flaky");
    });

    it("prunes custom pages by their access rule", async () => {
      expect(await navSlugs(viewer)).not.toContain("ops-board");
      expect(await navSlugs(ops)).toContain("ops-board");
      expect(await navSlugs(viewer)).toContain("welcome");
    });

    it("prunes workspaces by role array", async () => {
      expect(await navSlugs(viewer)).not.toContain("admin-desk");
      expect(await navSlugs(admin)).toContain("admin-desk");
    });

    it("drops a workspace whose views are all unreadable for the user", async () => {
      expect(await navSlugs(viewer)).not.toContain("exec-only");
      expect(await navSlugs(exec)).toContain("exec-only");
    });

    it("applies the same rules to anonymous requests", async () => {
      const res = await get("/api/admin/navigation");
      const tree = await res.json();
      const slugs = [...tree.groups.flatMap((g: any) => g.items), ...tree.ungrouped].map((i: any) => i.slug);
      expect(slugs).not.toContain("payroll");
      expect(slugs).not.toContain("admin-desk");
    });
  });

  describe("GET /api/schemas", () => {
    it("omits views the user cannot read and keeps the rest", async () => {
      const viewerRes = await (await get("/api/schemas", viewer)).json();
      const viewerReports = viewerRes.collections.find((c: any) => c.slug === "reports");
      expect(viewerReports.views.map((v: any) => v.slug)).toEqual(expect.arrayContaining(["all"]));
      expect(viewerReports.views.map((v: any) => v.slug)).not.toContain("exec");

      const execRes = await (await get("/api/schemas", exec)).json();
      const execReports = execRes.collections.find((c: any) => c.slug === "reports");
      expect(execReports.views.map((v: any) => v.slug)).toContain("exec");
    });

    it("resolves function read rules to a boolean per user", async () => {
      const viewerRes = await (await get("/api/schemas", viewer)).json();
      expect(viewerRes.collections.find((c: any) => c.slug === "payroll").access.read).toBe(false);
      expect(viewerRes.globals.find((g: any) => g.slug === "billing").access.read).toBe(false);

      const financeRes = await (await get("/api/schemas", finance)).json();
      expect(financeRes.collections.find((c: any) => c.slug === "payroll").access.read).toBe(true);
      expect(financeRes.globals.find((g: any) => g.slug === "billing").access.read).toBe(true);
    });

    it("serializes action access resolved for the user", async () => {
      const viewerRes = await (await get("/api/schemas", viewer)).json();
      const action = viewerRes.collections.find((c: any) => c.slug === "reports").actions[0];
      expect(action.access.update).toBe(false);

      const execRes = await (await get("/api/schemas", exec)).json();
      expect(execRes.collections.find((c: any) => c.slug === "reports").actions[0].access.update).toBe(true);
    });
  });

  describe("GET /api/admin/navigation/badges", () => {
    it("does not compute badges for items the user cannot access", async () => {
      const viewerBadges = (await (await get("/api/admin/navigation/badges", viewer)).json()).badges;
      expect(Object.keys(viewerBadges)).not.toContain("admin-desk");

      const adminBadges = (await (await get("/api/admin/navigation/badges", admin)).json()).badges;
      expect(Object.keys(adminBadges)).toContain("admin-desk");
    });

    it("still enforces access when the user has customized their navigation", async () => {
      const prefs = encodeURIComponent(
        JSON.stringify({ _version: 1, pinned: [], hidden: [], groupOrder: [], itemOrder: {}, groups: [], items: [] }),
      );
      const viewerBadges = (await (await get(`/api/admin/navigation/badges?prefs=${prefs}`, viewer)).json()).badges;
      expect(Object.keys(viewerBadges)).not.toContain("admin-desk");

      const adminBadges = (await (await get(`/api/admin/navigation/badges?prefs=${prefs}`, admin)).json()).badges;
      expect(Object.keys(adminBadges)).toContain("admin-desk");
    });
  });

  describe("action enforcement", () => {
    const run = (path: string, token: string) =>
      app.request(path, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: "r-1" }),
      });

    it("rejects a collection action the user may not run", async () => {
      expect((await run("/api/collections/reports/actions/approve", viewer)).status).toBe(403);
    });

    it("rejects a view action the user may not run", async () => {
      expect((await run("/api/collections/reports/views/all/actions/archive", viewer)).status).toBe(403);
    });

    it("lets an authorized user past the access gate", async () => {
      // The document does not exist, so the run reports per-document failure
      // instead of an access denial.
      expect((await run("/api/collections/reports/views/all/actions/archive", exec)).status).not.toBe(403);
    });
  });
});
