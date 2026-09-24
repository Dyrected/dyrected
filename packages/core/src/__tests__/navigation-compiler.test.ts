import { describe, it, expect } from "vitest";
import {
  defineConfig,
  defineCollection,
  defineGlobal,
  defineWorkspace,
  defineView,
  compileNavigation,
  pruneNavigationForUser,
  assertValidNavigationSlugs,
} from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

describe("Navigation Compiler Pipeline", () => {
  const db = new InMemoryAdapter();

  it("should assert reserved navigation slugs and throw descriptive error", () => {
    expect(() => {
      assertValidNavigationSlugs([
        defineWorkspace({
          slug: "collections",
          label: "Invalid Collections Workspace",
        }),
      ]);
    }).toThrow(/reserved system path/i);

    expect(() => {
      assertValidNavigationSlugs([
        defineWorkspace({
          slug: "api",
          label: "Invalid API Workspace",
        }),
      ]);
    }).toThrow(/reserved system path/i);

    expect(() => {
      assertValidNavigationSlugs([
        defineWorkspace({
          slug: "custom-ops",
          label: "Valid Workspace",
        }),
      ]);
    }).not.toThrow();
  });

  it("should auto-merge unmentioned collections and globals into default groups", () => {
    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "posts",
          fields: [{ name: "title", type: "text" }],
        }),
        defineCollection({
          slug: "categories",
          fields: [{ name: "name", type: "text" }],
        }),
      ],
      globals: [
        defineGlobal({
          slug: "site_settings",
          label: "Site Settings",
          fields: [{ name: "siteName", type: "text" }],
        }),
      ],
      db,
    });

    const tree = compileNavigation(config);

    // Default groups: Collections (order 900) and Configuration (order 1000)
    const collectionsGroup = tree.groups.find((g) => g.name === "Collections");
    const configGroup = tree.groups.find((g) => g.name === "Configuration");

    expect(collectionsGroup).toBeDefined();
    expect(configGroup).toBeDefined();

    expect(collectionsGroup?.items.map((i) => i.slug)).toEqual(["posts", "categories"]);
    expect(configGroup?.items.map((i) => i.slug)).toEqual(["site_settings"]);
  });

  it("should compile explicit navigation items and place them into specified groups", () => {
    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "investors",
          fields: [{ name: "name", type: "text" }],
        }),
      ],
      admin: {
        navigation: [
          defineWorkspace({
            slug: "kyc-ops",
            label: "KYC Queue",
            icon: "ShieldAlert",
            group: {
              name: "Compliance",
              slug: "compliance",
              icon: "Lock",
              order: 10,
            },
            views: [
              defineView({
                collection: "investors",
                slug: "pending-kyc",
                label: "Pending KYC",
                filter: { status: { equals: "pending" } },
              }),
            ],
          }),
        ],
      },
      db,
    });

    const tree = compileNavigation(config);

    const complianceGroup = tree.groups.find((g) => g.name === "Compliance");
    expect(complianceGroup).toBeDefined();
    expect(complianceGroup?.slug).toBe("compliance");
    expect(complianceGroup?.icon).toBe("Lock");
    expect(complianceGroup?.items).toHaveLength(1);

    const kycItem = complianceGroup?.items[0];
    expect(kycItem?.slug).toBe("kyc-ops");
    expect(kycItem?.label).toBe("KYC Queue");
    expect(kycItem?.type).toBe("workspace");
    expect(kycItem?.views).toHaveLength(1);
    expect(kycItem?.views[0].slug).toBe("pending-kyc");

    // Unmentioned collection 'investors' should be auto-merged into Collections group
    const colGroup = tree.groups.find((g) => g.name === "Collections");
    expect(colGroup?.items.some((i) => i.slug === "investors")).toBe(true);
  });

  it("should support relative sparse ordering with 'after', 'before', and 'order'", () => {
    const config = defineConfig({
      collections: [
        defineCollection({ slug: "alpha", fields: [] }),
        defineCollection({ slug: "beta", fields: [] }),
        defineCollection({ slug: "gamma", fields: [] }),
      ],
      admin: {
        navigation: [
          defineWorkspace({
            collection: "gamma",
            group: "Workspace",
            order: 10,
          }),
          defineWorkspace({
            collection: "alpha",
            group: "Workspace",
            after: "gamma", // should be placed right after gamma
          }),
          defineWorkspace({
            collection: "beta",
            group: "Workspace",
            before: "gamma", // should be placed right before gamma
          }),
        ],
      },
      db,
    });

    const tree = compileNavigation(config);
    const group = tree.groups.find((g) => g.name === "Workspace");
    expect(group).toBeDefined();

    const orderSlugs = group?.items.map((i) => i.slug);
    expect(orderSlugs).toEqual(["beta", "gamma", "alpha"]);
  });

  it("should support position: 'first' and position: 'last'", () => {
    const config = defineConfig({
      collections: [],
      globals: [],
      admin: {
        navigation: [
          defineWorkspace({
            slug: "item-middle",
            label: "Middle",
            group: "Ops",
            order: 100,
          }),
          defineWorkspace({
            slug: "item-last",
            label: "Last",
            group: "Ops",
            position: "last",
          }),
          defineWorkspace({
            slug: "item-first",
            label: "First",
            group: "Ops",
            position: "first",
          }),
        ],
      },
      db,
    });

    const tree = compileNavigation(config);
    const group = tree.groups.find((g) => g.name === "Ops");
    const slugs = group?.items.map((i) => i.slug);
    expect(slugs).toEqual(["item-first", "item-middle", "item-last"]);
  });

  it("should inject views into collection submenus via addToCollection", () => {
    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "orders",
          fields: [{ name: "amount", type: "number" }],
          views: [
            defineView({
              slug: "all-orders",
              label: "All Orders",
            }),
          ],
        }),
      ],
      admin: {
        navigation: [
          defineWorkspace({
            addToCollection: "orders",
            views: [
              defineView({
                slug: "pending-orders",
                label: "Pending Orders",
                filter: { status: { equals: "pending" } },
              }),
            ],
          }),
        ],
      },
      db,
    });

    const tree = compileNavigation(config);
    const colGroup = tree.groups.find((g) => g.name === "Collections");
    const ordersItem = colGroup?.items.find((i) => i.slug === "orders");

    expect(ordersItem).toBeDefined();
    expect(ordersItem?.views).toHaveLength(2);
    expect(ordersItem?.views.map((v) => v.slug)).toEqual(["all-orders", "pending-orders"]);
  });

  it("should prune navigation tree based on user roles and access rules", () => {
    const config = defineConfig({
      collections: [],
      globals: [],
      admin: {
        navigation: [
          defineWorkspace({
            slug: "public-ops",
            label: "Public Ops",
            group: "Common",
          }),
          defineWorkspace({
            slug: "admin-ops",
            label: "Admin Ops",
            group: "Common",
            access: ["admin"],
          }),
          defineWorkspace({
            slug: "auditor-ops",
            label: "Auditor Ops",
            group: "Auditing",
            access: ["auditor"],
          }),
        ],
      },
      db,
    });

    const compiled = compileNavigation(config);

    // 1. Viewer user (no admin, no auditor)
    const viewerTree = pruneNavigationForUser(compiled, {
      sub: "1",
      roles: ["viewer"],
    });
    const commonGroup = viewerTree.groups.find((g) => g.name === "Common");
    expect(commonGroup?.items.map((i) => i.slug)).toEqual(["public-ops"]);
    // Auditing group should be completely pruned away since it has no accessible items
    expect(viewerTree.groups.some((g) => g.name === "Auditing")).toBe(false);

    // 2. Admin user
    const adminTree = pruneNavigationForUser(compiled, {
      sub: "2",
      roles: ["admin"],
    });
    const adminCommon = adminTree.groups.find((g) => g.name === "Common");
    expect(adminCommon?.items.map((i) => i.slug)).toEqual(["public-ops", "admin-ops"]);

    // 3. Auditor user
    const auditorTree = pruneNavigationForUser(compiled, {
      sub: "3",
      roles: ["auditor"],
    });
    expect(auditorTree.groups.some((g) => g.name === "Auditing")).toBe(true);
  });
});
