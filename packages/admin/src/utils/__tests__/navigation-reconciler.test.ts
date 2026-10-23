import { describe, expect, it } from "vitest"
import { reconcileNavigation } from "../navigation-reconciler"
import type { CompiledNavTree } from "@dyrected/core"
import type { UserNavigationPreferences } from "../../types/preferences"

describe("Navigation Delta Reconciler", () => {
  const baseTree: CompiledNavTree = {
    groups: [
      {
        id: "group_ops",
        name: "Operations",
        slug: "operations",
        icon: "Briefcase",
        defaultExpanded: true,
        order: 10,
        items: [
          {
            id: "workspace_kyc",
            type: "workspace",
            slug: "kyc",
            label: "KYC Review",
            icon: "Shield",
            order: 1,
            views: [{ slug: "pending", label: "Pending" }],
          },
          {
            id: "collection_orders",
            type: "collection",
            slug: "orders",
            collection: "orders",
            label: "Orders",
            icon: "Package",
            order: 2,
            views: [],
          },
        ],
      },
      {
        id: "group_content",
        name: "Content",
        slug: "content",
        icon: "FileText",
        defaultExpanded: true,
        order: 20,
        items: [
          {
            id: "collection_articles",
            type: "collection",
            slug: "articles",
            collection: "articles",
            label: "Articles",
            icon: "File",
            order: 1,
            views: [],
          },
        ],
      },
    ],
    ungrouped: [],
  }

  it("returns base navigation unchanged when preferences are null or empty", () => {
    const res = reconcileNavigation(baseTree, null)
    expect(res.groups).toHaveLength(2)
    expect(res.groups[0].name).toBe("Operations")
    expect(res.groups[0].items).toHaveLength(2)
    expect(res.pinnedItems).toHaveLength(0)
  })

  it("applies hidden items and hidden groups from preferences", () => {
    const prefs: UserNavigationPreferences = {
      _version: 1,
      hidden: ["workspace_kyc", "group_content"],
    }

    const res = reconcileNavigation(baseTree, prefs)
    expect(res.groups).toHaveLength(1)
    expect(res.groups[0].name).toBe("Operations")
    expect(res.groups[0].items).toHaveLength(1)
    expect(res.groups[0].items[0].slug).toBe("orders")
  })

  it("reorders groups according to user groupOrder", () => {
    const prefs: UserNavigationPreferences = {
      _version: 1,
      groupOrder: ["group_content", "group_ops"],
    }

    const res = reconcileNavigation(baseTree, prefs)
    expect(res.groups[0].name).toBe("Content")
    expect(res.groups[1].name).toBe("Operations")
  })

  it("reorders items within a group according to user itemOrder", () => {
    const prefs: UserNavigationPreferences = {
      _version: 1,
      itemOrder: {
        group_ops: ["collection_orders", "workspace_kyc"],
      },
    }

    const res = reconcileNavigation(baseTree, prefs)
    expect(res.groups[0].items[0].slug).toBe("orders")
    expect(res.groups[0].items[1].slug).toBe("kyc")
  })

  it("injects user-created groups and workspaces into the tree", () => {
    const prefs: UserNavigationPreferences = {
      _version: 1,
      groups: [
        {
          name: "VIP Triage",
          slug: "vip-triage",
          icon: "Star",
          order: 5,
        },
      ],
      items: [
        {
          slug: "vip-queue",
          label: "VIP Queue",
          icon: "Crown",
          group: "VIP Triage",
          views: [{ slug: "high-value", label: "High Value" }],
        },
      ],
    }

    const res = reconcileNavigation(baseTree, prefs)
    expect(res.groups).toHaveLength(3)
    const vipGroup = res.groups.find((g) => g.name === "VIP Triage")
    expect(vipGroup).toBeDefined()
    expect(vipGroup?.icon).toBe("Star")
    expect(vipGroup?.items).toHaveLength(1)
    expect(vipGroup?.items[0].slug).toBe("vip-queue")
  })

  it("extracts pinned shortcuts into pinnedItems", () => {
    const prefs: UserNavigationPreferences = {
      _version: 1,
      pinned: [
        { type: "workspace", slug: "kyc", label: "Quick KYC", icon: "ShieldAlert" },
      ],
    }

    const res = reconcileNavigation(baseTree, prefs)
    expect(res.pinnedItems).toHaveLength(1)
    expect(res.pinnedItems[0].label).toBe("Quick KYC")
    expect(res.pinnedItems[0].slug).toBe("kyc")
  })

  it("marks unknown collections as tombstones without crashing", () => {
    const schemas = {
      collections: [{ slug: "orders" }], // "articles" was deleted!
    }

    const res = reconcileNavigation(baseTree, null, schemas)
    const contentGroup = res.groups.find((g) => g.name === "Content")
    const articleItem = contentGroup?.items[0] as any
    expect(articleItem.isTombstone).toBe(true)
  })

  it("filters out hidden subviews from item.views by default", () => {
    const prefs: UserNavigationPreferences = {
      _version: 1,
      hidden: ["kyc_pending"],
    }

    const res = reconcileNavigation(baseTree, prefs)
    const kycItem = res.groups[0].items.find((i) => i.slug === "kyc")
    expect(kycItem?.views).toHaveLength(0)
  })

  it("retains hidden items and subviews when includeHidden is true", () => {
    const prefs: UserNavigationPreferences = {
      _version: 1,
      hidden: ["workspace_kyc", "kyc_pending"],
    }

    const res = reconcileNavigation(baseTree, prefs, undefined, { includeHidden: true })
    expect(res.groups[0].items).toHaveLength(2)
    const kycItem = res.groups[0].items.find((i) => i.slug === "kyc")
    expect(kycItem?.views).toHaveLength(1)
  })

  it("inherits metricsScope and metric scope/groupBy from base views when user preferences are sparse", () => {
    const customBaseTree: any = {
      groups: [
        {
          id: "ops",
          name: "Operations",
          items: [
            {
              id: "workspace_guests",
              slug: "guests",
              label: "Guests",
              type: "workspace",
              views: [
                {
                  slug: "rsvp",
                  label: "RSVP",
                  layout: "table",
                  metricsScope: "filtered",
                  metrics: [
                    {
                      label: "Attending",
                      aggregate: { count: "*" },
                      scope: "filtered",
                      groupBy: "tableNumber",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      ungrouped: [],
    }

    // User preference edited label but didn't touch metricsScope or metric scope
    const prefs: UserNavigationPreferences = {
      _version: 1,
      items: [
        {
          slug: "guests",
          label: "Guest Directory",
          views: [
            {
              slug: "rsvp",
              label: "RSVP Directory",
              layout: "table",
              metrics: [
                {
                  label: "Attending",
                  aggregate: { count: "*" },
                },
              ],
            },
          ],
        },
      ],
    }

    const res = reconcileNavigation(customBaseTree, prefs)
    const view = res.groups[0].items[0].views?.[0]
    expect(view?.label).toBe("RSVP Directory")
    expect(view?.metricsScope).toBe("filtered")
    expect(view?.metrics?.[0].scope).toBe("filtered")
    expect(view?.metrics?.[0].groupBy).toBe("tableNumber")
  })

  describe("server-owned policy", () => {
    const guarded: CompiledNavTree = {
      groups: [
        {
          id: "group_ops",
          name: "Operations",
          slug: "operations",
          order: 1,
          items: [
            {
              id: "workspace_kyc",
              type: "workspace",
              slug: "kyc",
              label: "KYC Review",
              order: 1,
              collection: "customers",
              access: ["compliance"],
              badge: "3",
              views: [{ slug: "pending", label: "Pending", collection: "customers", access: { read: ["compliance"] } } as any],
            },
          ],
        },
      ],
      ungrouped: [
        { id: "link_home", type: "link", slug: "home", label: "Home", order: 1, views: [], access: ["staff"] },
      ],
    }

    it("never lets a preference replace the access, badge or view access of a server item", () => {
      const prefs = {
        _version: 1,
        items: [
          {
            slug: "kyc",
            label: "Mine",
            collection: "orders",
            access: [],
            badge: "999",
            views: [{ slug: "pending", label: "Pending", access: { read: true } }],
          },
        ],
      } as unknown as UserNavigationPreferences

      const item = reconcileNavigation(guarded, prefs).groups[0].items[0] as any
      expect(item.label).toBe("Mine")
      expect(item.access).toEqual(["compliance"])
      expect(item.badge).toBe("3")
      expect(item.collection).toBe("customers")
      expect(item.userDefined).toBeUndefined()
      expect(item.views[0].access).toEqual({ read: ["compliance"] })
    })

    it("flags items injected from preferences as userDefined and drops their access and badge", () => {
      const prefs = {
        _version: 1,
        items: [{ slug: "mine", label: "Mine", collection: "orders", access: [], badge: "9", views: [] }],
      } as unknown as UserNavigationPreferences

      const injected = reconcileNavigation(guarded, prefs)
        .groups.flatMap((g) => g.items)
        .find((i) => i.slug === "mine") as any
      expect(injected.userDefined).toBe(true)
      expect(injected.access).toBeUndefined()
      expect(injected.badge).toBeUndefined()
    })

    it("does not duplicate or override a server item that lives in the ungrouped list", () => {
      const prefs = {
        _version: 1,
        items: [{ slug: "home", label: "Hijacked", group: "Custom", access: [] }],
      } as unknown as UserNavigationPreferences

      const res = reconcileNavigation(guarded, prefs)
      expect(res.groups.flatMap((g) => g.items).some((i) => i.slug === "home")).toBe(false)
      expect(res.ungrouped[0].access).toEqual(["staff"])
      expect(res.ungrouped[0].label).toBe("Home")
    })
  })

  describe("allowUserItems: false (menu locked to a role policy)", () => {
    it("ignores injected items and pins but still reorders and hides existing ones", () => {
      const prefs = {
        _version: 1,
        hidden: ["collection_articles"],
        items: [{ slug: "smuggled", label: "Smuggled", collection: "orders" }],
        pinned: [{ type: "collection", slug: "secret" }],
        itemOrder: { group_ops: ["collection_orders", "workspace_kyc"] },
      } as unknown as UserNavigationPreferences

      const res = reconcileNavigation(baseTree, prefs, undefined, { allowUserItems: false })
      const slugs = res.groups.flatMap((g) => g.items.map((i) => i.slug))
      expect(slugs).not.toContain("smuggled")
      expect(slugs).not.toContain("articles")
      expect(res.groups[0].items.map((i) => i.slug)).toEqual(["orders", "kyc"])
      expect(res.pinnedItems).toHaveLength(0)
    })

    it("still lets a user rename and regroup an item the server returned", () => {
      const prefs = {
        _version: 1,
        items: [{ slug: "kyc", label: "My KYC" }],
      } as unknown as UserNavigationPreferences
      const res = reconcileNavigation(baseTree, prefs, undefined, { allowUserItems: false })
      expect(res.groups.flatMap((g) => g.items).find((i) => i.slug === "kyc")?.label).toBe("My KYC")
    })
  })
})
