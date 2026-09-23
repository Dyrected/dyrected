import { describe, it, expect, beforeEach } from "vitest";
import { createDyrectedApp } from "../app.js";
import {
  defineConfig,
  defineCollection,
  defineNavItem,
  defineView,
} from "../index.js";
import { InMemoryAdapter } from "./mocks.js";
import { signCollectionToken } from "../auth/token.js";

describe("Navigation & Badges Endpoints", () => {
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
      defineCollection({
        slug: "tickets",
        fields: [
          { name: "title", type: "text" },
          { name: "status", type: "text" },
        ],
      }),
      defineCollection({
        slug: "disputes",
        fields: [
          { name: "reason", type: "text" },
        ],
      }),
    ],
    admin: {
      navigation: [
        defineNavItem({
          slug: "support-queue",
          label: "Support Queue",
          collection: "tickets",
          group: "Operations",
          badge: {
            count: true,
            variant: "warning",
          },
          views: [
            defineView({
              collection: "tickets",
              slug: "open-tickets",
              label: "Open Tickets",
              filter: { status: { equals: "open" } },
            }),
          ],
        }),
        defineNavItem({
          slug: "disputes-desk",
          label: "Disputes Desk",
          collection: "disputes",
          group: "Operations",
          badge: {
            aggregate: {
              collection: "disputes",
            },
            variant: "destructive",
          },
        }),
        defineNavItem({
          slug: "system-status",
          label: "Status",
          group: "Operations",
          badge: "Live",
          href: "https://status.example.com",
        }),
      ],
    },
    db,
  });

  let app: any;
  let userToken: string;

  beforeEach(async () => {
    (db as any).store = {};
    app = await createDyrectedApp(config);

    const user = await db.create({
      collection: "users",
      data: { id: "u-1", email: "support@corp.com", roles: ["agent"] },
    });

    userToken = await signCollectionToken({
      sub: user.id,
      email: user.email,
      collection: "users",
      roles: ["agent"],
    });

    // Seed tickets: 2 open, 1 closed
    await db.create({
      collection: "tickets",
      data: { title: "Ticket 1", status: "open" },
    });
    await db.create({
      collection: "tickets",
      data: { title: "Ticket 2", status: "open" },
    });
    await db.create({
      collection: "tickets",
      data: { title: "Ticket 3", status: "closed" },
    });

    // Seed disputes: 3 total
    await db.create({ collection: "disputes", data: { reason: "Dispute A" } });
    await db.create({ collection: "disputes", data: { reason: "Dispute B" } });
    await db.create({ collection: "disputes", data: { reason: "Dispute C" } });
  });

  it("should return the compiled and pruned navigation tree on GET /api/admin/navigation", async () => {
    const res = await app.request("/api/admin/navigation", {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.status).toBe(200);

    const tree = await res.json();
    expect(tree.groups).toBeDefined();

    const opsGroup = tree.groups.find((g: any) => g.name === "Operations");
    expect(opsGroup).toBeDefined();
    expect(opsGroup.items).toHaveLength(3);
    expect(opsGroup.items.map((i: any) => i.slug)).toEqual([
      "support-queue",
      "disputes-desk",
      "system-status",
    ]);
  });

  it("should evaluate real-time badge counts and variants on GET /api/admin/navigation/badges", async () => {
    const res = await app.request("/api/admin/navigation/badges", {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.badges).toBeDefined();

    // 1. Primary view filtered count: 2 open tickets
    expect(data.badges["support-queue"]).toEqual({
      count: 2,
      variant: "warning",
    });

    // 2. Custom aggregate count: 3 disputes total
    expect(data.badges["disputes-desk"]).toEqual({
      count: 3,
      variant: "destructive",
    });

    // 3. Static string badge: "Live"
    expect(data.badges["system-status"]).toEqual({
      count: "Live",
      variant: "default",
    });
  });
});
