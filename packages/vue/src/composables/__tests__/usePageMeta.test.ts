import { describe, it, expect, vi } from "vitest";
import { createApp, ref } from "vue";
import { usePageMeta, DYRECTED_PAGE_KEY, type PageMetaBridgeValue } from "../usePageMeta";
import { usePageRoute, DYRECTED_PAGE_ROUTE_KEY, type PageRouteBridgeValue } from "../usePageRoute";

describe("Vue usePageMeta and usePageRoute composables", () => {
  it("provides options, page, and reactively synchronizes meta updates", () => {
    const setMetaSpy = vi.fn();
    const mockBridge: PageMetaBridgeValue = {
      meta: { title: "Initial Title" },
      setMeta: setMetaSpy,
      options: { liveInterval: 2000 },
      page: { slug: "arrivals", label: "Today's Arrivals", component: "arrivals" },
    };

    const app = createApp({ render: () => null });
    app.provide(DYRECTED_PAGE_KEY, mockBridge);

    app.runWithContext(() => {
      const metaRef = ref({ title: "Live Door Count" });
      const result = usePageMeta(metaRef);

      expect(result.options).toEqual({ liveInterval: 2000 });
      expect(result.page?.slug).toBe("arrivals");
      expect(setMetaSpy).toHaveBeenCalledWith({ title: "Live Door Count" });

      // Update reactive ref
      metaRef.value = { title: "Updated Count" };
    });
  });

  it("usePageRoute provides splat, searchParams, and navigate helper", () => {
    const navigateSpy = vi.fn();
    const mockRouteBridge: PageRouteBridgeValue = {
      params: { slug: "reports" },
      splat: "2026-10",
      searchParams: new URLSearchParams("filter=urgent"),
      setSearchParams: vi.fn(),
      navigate: navigateSpy,
    };

    const app = createApp({ render: () => null });
    app.provide(DYRECTED_PAGE_ROUTE_KEY, mockRouteBridge);

    app.runWithContext(() => {
      const route = usePageRoute();

      expect(route.params.slug).toBe("reports");
      expect(route.splat).toBe("2026-10");
      expect(route.searchParams.get("filter")).toBe("urgent");

      route.navigate("details");
      expect(navigateSpy).toHaveBeenCalledWith("details");
    });
  });

  it("falls back gracefully when outside injection context", () => {
    const app = createApp({ render: () => null });

    app.runWithContext(() => {
      const pageMeta = usePageMeta();
      const pageRoute = usePageRoute();

      expect(pageMeta.options).toBeUndefined();
      expect(pageMeta.page).toBeUndefined();
      expect(() => pageMeta.setMeta({ title: "New" })).not.toThrow();

      expect(pageRoute.splat).toBe("");
      expect(pageRoute.params).toEqual({});
      expect(() => pageRoute.navigate("sub")).not.toThrow();
    });
  });
});
