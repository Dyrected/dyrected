import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DocumentMeta, pageLabel, humanize, usePublishDocumentTitle } from "../document-meta";
import { DyrectedContext } from "../../providers/dyrected-context";
import type { CompiledNavTree, CollectionConfig, GlobalConfig, AdminConfig } from "@dyrected/core";

describe("DocumentMeta & pageLabel", () => {
  const mockNavTree: CompiledNavTree = {
    groups: [
      {
        id: "group:ops",
        name: "Operations",
        slug: "operations",
        order: 1,
        items: [
          {
            id: "workspace:logistics",
            type: "workspace",
            slug: "logistics",
            label: "Logistics Hub",
            order: 1,
            views: [
              { slug: "in-transit", label: "In Transit" },
              { slug: "delivered", label: "Delivered Items" },
            ],
          },
          {
            id: "page:arrivals",
            type: "page",
            slug: "arrivals",
            label: "Today's Arrivals",
            order: 2,
            views: [],
            page: {
              slug: "arrivals",
              label: "Today's Arrivals",
              component: "arrivals-board",
            },
          },
        ],
      },
    ],
    ungrouped: [
      {
        id: "collection:orders",
        type: "collection",
        slug: "orders",
        label: "Orders",
        order: 1,
        collection: "orders",
        views: [
          { slug: "pending", label: "Pending Fulfillment" },
        ],
      },
    ],
  };

  const mockCollections: CollectionConfig[] = [
    {
      slug: "orders",
      labels: { singular: "Order", plural: "Orders" },
      fields: [],
    } as any,
  ];

  const mockGlobals: GlobalConfig[] = [
    {
      slug: "site-settings",
      label: "Site Settings",
      fields: [],
    } as any,
  ];

  const mockAdmin: AdminConfig = {
    meta: {
      titleSuffix: "- Acme Admin",
    },
  };

  afterEach(() => {
    cleanup();
  });

  describe("humanize()", () => {
    it("converts hyphenated and underscored slugs into capitalized words", () => {
      expect(humanize("blog-posts")).toBe("Blog Posts");
      expect(humanize("today_arrivals")).toBe("Today Arrivals");
    });
  });

  describe("pageLabel()", () => {
    it("handles dashboard root route and custom homePage", () => {
      expect(pageLabel("/", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe("Dashboard");

      const adminWithHome: AdminConfig = {
        ...mockAdmin,
        homePage: "arrivals",
      };
      expect(pageLabel("/", mockCollections, mockGlobals, mockNavTree, adminWithHome)).toBe("Today's Arrivals");
    });

    it("handles setup and trash routes", () => {
      expect(pageLabel("/setup", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe("Setup");
      expect(pageLabel("/trash", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe("Trash");
    });

    it("handles operational workspace and view routes", () => {
      expect(pageLabel("/logistics/in-transit", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "In Transit · Logistics Hub"
      );
      expect(pageLabel("/logistics/delivered", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "Delivered Items · Logistics Hub"
      );
      expect(pageLabel("/logistics", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe("Logistics Hub");
      // Fallback for unlisted view in workspace
      expect(pageLabel("/logistics/custom-view", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "Custom View · Logistics Hub"
      );
      // Fallback for completely unknown workspace
      expect(pageLabel("/warehouse/stock", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "Stock · Warehouse"
      );
    });

    it("handles custom admin page routes", () => {
      expect(pageLabel("/pages/arrivals", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "Today's Arrivals"
      );
      expect(pageLabel("/pages/arrivals/details", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "Details · Today's Arrivals"
      );
      // Unknown page falls back to humanized slug
      expect(pageLabel("/pages/revenue-metrics", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "Revenue Metrics"
      );
    });

    it("handles collection routes including views and trash", () => {
      expect(pageLabel("/collections/orders", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe("Orders");
      expect(pageLabel("/collections/orders/views/pending", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "Pending Fulfillment · Orders"
      );
      expect(pageLabel("/collections/orders/trash", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "Trash · Orders"
      );
      expect(pageLabel("/collections/orders/new", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "New Order"
      );
      expect(pageLabel("/collections/orders/123/edit", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "Edit Order"
      );
      expect(pageLabel("/collections/orders/123", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "Order Details"
      );
    });

    it("handles globals routes", () => {
      expect(pageLabel("/globals/site-settings", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "Site Settings"
      );
      expect(pageLabel("/globals/site-settings/edit", mockCollections, mockGlobals, mockNavTree, mockAdmin)).toBe(
        "Edit Site Settings"
      );
    });
  });

  describe("<DocumentMeta /> component", () => {
    let originalTitle: string;

    beforeEach(() => {
      originalTitle = document.title;
      document.title = "Host App";
    });

    afterEach(() => {
      document.title = originalTitle;
    });

    it("sets document.title for workspace view routes and restores on unmount", () => {
      const mockContextValue: any = {
        schemas: {
          collections: mockCollections,
          globals: mockGlobals,
          admin: mockAdmin,
        },
        navigation: mockNavTree,
        isAuthenticated: true,
        isResolvingStoredSession: false,
      };

      const { unmount } = render(
        <MemoryRouter initialEntries={["/logistics/in-transit"]}>
          <DyrectedContext.Provider value={mockContextValue}>
            <DocumentMeta />
          </DyrectedContext.Provider>
        </MemoryRouter>
      );

      expect(document.title).toBe("In Transit · Logistics Hub - Acme Admin");

      unmount();
      expect(document.title).toBe("Host App");
    });

    const renderMeta = (context: Record<string, unknown>, path = "/collections/orders") =>
      render(
        <MemoryRouter initialEntries={[path]}>
          <DyrectedContext.Provider
            value={{ isAuthenticated: true, isResolvingStoredSession: false, navigation: mockNavTree, ...context } as any}
          >
            <DocumentMeta />
          </DyrectedContext.Provider>
        </MemoryRouter>
      );
    const schemasWith = (admin: AdminConfig) => ({ collections: mockCollections, globals: mockGlobals, admin });

    it("never writes the Dyrected name when the host has not configured one", () => {
      renderMeta({ schemas: schemasWith({}) });
      expect(document.title).toBe("Orders");
    });

    it("derives the suffix from branding.appName", () => {
      renderMeta({ schemas: schemasWith({ branding: { appName: "Acme" } }) });
      expect(document.title).toBe("Orders - Acme");
    });

    it("uses logoText when no app name or suffix is set", () => {
      renderMeta({ schemas: schemasWith({ branding: { logoText: "Acme" } }) });
      expect(document.title).toBe("Orders - Acme");
    });

    it("lets an explicit suffix win, and honours an empty one", () => {
      const { unmount } = renderMeta({
        schemas: schemasWith({ branding: { appName: "Acme" }, meta: { titleSuffix: "— Acme Admin" } }),
      });
      expect(document.title).toBe("Orders — Acme Admin");
      unmount();
      renderMeta({ schemas: schemasWith({ branding: { appName: "Acme" }, meta: { titleSuffix: "" } }) });
      expect(document.title).toBe("Orders");
    });

    it("does not touch the title until the schemas have loaded", () => {
      renderMeta({ schemas: null });
      expect(document.title).toBe("Host App");
    });

    it("does not touch the title while the stored session is still resolving", () => {
      renderMeta({ schemas: schemasWith({ branding: { appName: "Acme" } }), isResolvingStoredSession: true });
      expect(document.title).toBe("Host App");
    });

    it("titles the sign-in screens with the app name", () => {
      renderMeta({ schemas: schemasWith({ branding: { appName: "Acme" } }), isAuthenticated: false }, "/");
      expect(document.title).toBe("Sign in - Acme");
    });

    it("shows a title published by a page instead of assigning document.title itself", () => {
      function Page() {
        usePublishDocumentTitle("Revenue Overview");
        return null;
      }
      const { unmount } = render(
        <MemoryRouter initialEntries={["/pages/revenue"]}>
          <DyrectedContext.Provider
            value={{
              isAuthenticated: true,
              isResolvingStoredSession: false,
              navigation: mockNavTree,
              schemas: schemasWith({ branding: { appName: "Acme" } }),
            } as any}
          >
            <DocumentMeta />
            <Page />
          </DyrectedContext.Provider>
        </MemoryRouter>
      );
      expect(document.title).toBe("Revenue Overview - Acme");

      act(() => unmount());
      expect(document.title).toBe("Host App");
    });
  });
});
