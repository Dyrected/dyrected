import { describe, it, expect, vi } from "vitest";
import { createApp } from "vue";
import { useAdminNavigate } from "../useAdminNavigate.js";
import { useAdminNotify } from "../useAdminNotify.js";
import { useAccess } from "../useAccess.js";
import { useAdminBridge, DYRECTED_ADMIN_KEY } from "../useAdminBridge.js";
import type { AdminBridgeBundle } from "@dyrected/admin/public";

describe("Vue Admin Bridge Composables", () => {
  it("provides navigate, notify, and access through injection", () => {
    const mockNavigate = vi.fn();
    const mockNotify = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };
    const mockAccess = {
      can: vi.fn((op: string, col: string) => op === "read" && col === "posts"),
    };

    const mockBridge: AdminBridgeBundle = {
      navigate: mockNavigate,
      to: {
        collection: (slug: string) => `/collections/${slug}`,
        document: (slug: string, id: string | number) => `/collections/${slug}/${id}`,
        view: (slug: string, viewSlug: string) => `/collections/${slug}/views/${viewSlug}`,
        page: (slug: string) => `/pages/${slug}`,
      },
      notify: mockNotify,
      access: mockAccess as any,
    };

    const app = createApp({ render: () => null });
    app.provide(DYRECTED_ADMIN_KEY, mockBridge);

    app.runWithContext(() => {
      const navigateResult = useAdminNavigate();
      const notifyResult = useAdminNotify();
      const accessResult = useAccess();

      expect(navigateResult).toBeDefined();
      expect(navigateResult.to.collection("posts")).toBe("/collections/posts");
      expect(navigateResult.to.document("posts", 123)).toBe("/collections/posts/123");
      expect(navigateResult.to.view("posts", "grid")).toBe("/collections/posts/views/grid");
      expect(navigateResult.to.page("settings")).toBe("/pages/settings");

      navigateResult.navigate("/collections/posts");
      expect(mockNavigate).toHaveBeenCalledWith("/collections/posts");

      notifyResult.success("Saved");
      expect(mockNotify.success).toHaveBeenCalledWith("Saved");
      notifyResult.error("Failed");
      expect(mockNotify.error).toHaveBeenCalledWith("Failed");
      notifyResult.info("Info message");
      expect(mockNotify.info).toHaveBeenCalledWith("Info message");

      expect(accessResult.can("read", "posts")).toBe(true);
      expect(accessResult.can("delete", "posts")).toBe(false);
    });
  });

  it("gracefully falls back when outside bridge context", () => {
    const app = createApp({ render: () => null });

    app.runWithContext(() => {
      const bridge = useAdminBridge();
      const navigateResult = useAdminNavigate();
      const notifyResult = useAdminNotify();
      const accessResult = useAccess();

      expect(bridge).toBeDefined();
      expect(navigateResult.to.collection("users")).toBe("/collections/users");
      expect(navigateResult.to.document("users", "usr_1")).toBe("/collections/users/usr_1");

      // Fallback can() returns true
      expect(accessResult.can("create", "users")).toBe(true);
      expect(accessResult.can("delete", "users")).toBe(true);

      // Notify does not throw
      expect(() => notifyResult.success("Test")).not.toThrow();
    });
  });
});
