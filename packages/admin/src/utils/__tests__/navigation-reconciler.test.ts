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
})
