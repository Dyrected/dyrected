import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as React from "react";
import { MemoryRouter } from "react-router-dom";
import { toUrlHelpers, resolveAdminNavigateUrl } from "../../providers/admin-bridge-context";
import { AdminBridgeProvider } from "../../providers/admin-bridge-provider";
import { useAdminNavigate } from "../use-admin-navigate";
import { useAdminNotify } from "../use-admin-notify";
import { useAccess } from "../use-access";
import { toast } from "sonner";
import { DyrectedContext } from "../../providers/dyrected-context";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Admin Bridge Hooks", () => {
  describe("toUrlHelpers and resolveAdminNavigateUrl", () => {
    it("builds collection, document, view, and page urls correctly", () => {
      expect(toUrlHelpers.collection("posts")).toBe("/collections/posts");
      expect(toUrlHelpers.document("posts", 42)).toBe("/collections/posts/42");
      expect(toUrlHelpers.view("posts", "kanban")).toBe("/collections/posts/views/kanban");
      expect(toUrlHelpers.page("door-checkin")).toBe("/pages/door-checkin");
    });

    it("resolves structured targets and string targets", () => {
      expect(resolveAdminNavigateUrl("/custom/url")).toBe("/custom/url");
      expect(resolveAdminNavigateUrl({ type: "collection", slug: "invoices" })).toBe("/collections/invoices");
      expect(resolveAdminNavigateUrl({ type: "document", slug: "invoices", id: "inv-1" })).toBe("/collections/invoices/inv-1");
      expect(resolveAdminNavigateUrl({ type: "view", slug: "invoices", viewSlug: "pending" })).toBe("/collections/invoices/views/pending");
      expect(resolveAdminNavigateUrl({ type: "page", slug: "settings" })).toBe("/pages/settings");
    });
  });

  describe("useAdminNavigate", () => {
    it("navigates to url and structured targets", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter>
          <AdminBridgeProvider>{children}</AdminBridgeProvider>
        </MemoryRouter>
      );

      const { result } = renderHook(() => useAdminNavigate(), { wrapper });

      act(() => {
        result.current.navigate(result.current.to.collection("posts"));
      });
      expect(mockNavigate).toHaveBeenCalledWith("/collections/posts", undefined);

      act(() => {
        result.current.navigate({ type: "document", slug: "posts", id: 99 }, { replace: true });
      });
      expect(mockNavigate).toHaveBeenCalledWith("/collections/posts/99", { replace: true });
    });
  });

  describe("useAdminNotify", () => {
    it("triggers toast notifications", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter>
          <AdminBridgeProvider>{children}</AdminBridgeProvider>
        </MemoryRouter>
      );

      const { result } = renderHook(() => useAdminNotify(), { wrapper });

      act(() => {
        result.current.success("Record saved", { description: "Changes persisted" });
      });
      expect(toast.success).toHaveBeenCalledWith("Record saved", { description: "Changes persisted" });

      act(() => {
        result.current.error("Failed to delete", { description: "Network error" });
      });
      expect(toast.error).toHaveBeenCalledWith("Failed to delete", { description: "Network error" });

      act(() => {
        result.current.info("Note");
      });
      expect(toast.info).toHaveBeenCalledWith("Note", undefined);
    });
  });

  describe("useAccess", () => {
    it("evaluates boolean and jexl access rules", () => {
      const mockContextValue: any = {
        schemas: {
          collections: [
            {
              slug: "articles",
              access: {
                read: true,
                create: false,
                update: "user.role == 'editor'",
              },
            },
          ],
        },
        user: { role: "editor" },
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DyrectedContext.Provider value={mockContextValue}>
          <MemoryRouter>
            <AdminBridgeProvider>{children}</AdminBridgeProvider>
          </MemoryRouter>
        </DyrectedContext.Provider>
      );

      const { result } = renderHook(() => useAccess(), { wrapper });

      expect(result.current.can("read", "articles")).toBe(true);
      expect(result.current.can("create", "articles")).toBe(false);
      expect(result.current.can("update", "articles")).toBe(true);
      expect(result.current.can("delete", "articles")).toBe(true); // default fallback
    });
  });
});
